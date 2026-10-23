#include <Arduino.h>

namespace {

// Stationary PCB-S2, ESP32-C3 SuperMini.
// GPIO6 is jumpered to J3.3 (ESC PWM); GPIO20 = ARM; GPIO21 = STOP.
constexpr uint8_t kEscPin = 6;
constexpr uint8_t kArmPin = 20;
constexpr uint8_t kStopPin = 21;
constexpr uint8_t kEscChannel = 0;
constexpr uint16_t kEscFrequencyHz = 50;
constexpr uint8_t kEscResolutionBits = 14;
constexpr uint16_t kSafePulseUs = 1000;
constexpr uint16_t kStartPulseUs = 1030;
constexpr uint16_t kMaxPulseUs = 1120;
constexpr uint16_t kStepPulseUs = 5;
constexpr uint16_t kRampStepUs = 5;
constexpr uint32_t kRampPeriodMs = 100;
constexpr uint32_t kArmHoldMs = 2000;
constexpr uint32_t kShortPressMs = 600;
constexpr uint32_t kAutoStopMs = 15000;

enum class State : uint8_t { SAFE, RUNNING };
State state = State::SAFE;
uint16_t requestedPulseUs = kSafePulseUs;
uint16_t actualPulseUs = kSafePulseUs;
uint32_t lastRampMs = 0;
uint32_t lastActivityMs = 0;
bool armWasPressed = false;
bool armStartHandled = false;
uint32_t armPressedMs = 0;

uint32_t dutyFromUs(uint16_t pulseUs) {
  const uint32_t maxDuty = (1UL << kEscResolutionBits) - 1UL;
  return (static_cast<uint32_t>(pulseUs) * maxDuty) / 20000UL;
}
void writePulse(uint16_t pulseUs) { ledcWrite(kEscChannel, dutyFromUs(pulseUs)); }
bool armPressed() { return digitalRead(kArmPin) == LOW; }
bool stopPressed() { return digitalRead(kStopPin) == LOW; }

void stopMotor(const char* reason) {
  requestedPulseUs = kSafePulseUs;
  actualPulseUs = kSafePulseUs;
  writePulse(kSafePulseUs);
  state = State::SAFE;
  Serial.printf("SAFE PWM=1000 us (%s)\n", reason);
}

void startMotor() {
  requestedPulseUs = kStartPulseUs;
  actualPulseUs = kSafePulseUs;
  lastActivityMs = millis();
  state = State::RUNNING;
  Serial.printf("RUN PWM target=%u us\n", requestedPulseUs);
}

void changeTarget(int16_t deltaUs) {
  requestedPulseUs = static_cast<uint16_t>(constrain(
      static_cast<int32_t>(requestedPulseUs) + deltaUs,
      static_cast<int32_t>(kStartPulseUs), static_cast<int32_t>(kMaxPulseUs)));
  lastActivityMs = millis();
  Serial.printf("RUN PWM target=%u us\n", requestedPulseUs);
}

void updateButtons() {
  const uint32_t now = millis();
  const bool armNow = armPressed();
  if (stopPressed()) {
    if (state != State::SAFE) stopMotor("STOP_BUTTON");
    return;
  }
  if (armNow && !armWasPressed) {
    armPressedMs = now;
    armStartHandled = false;
  }
  if (state == State::SAFE && armNow && !armStartHandled &&
      now - armPressedMs >= kArmHoldMs) {
    startMotor();
    armStartHandled = true;
  }
  if (!armNow && armWasPressed && state == State::RUNNING && !armStartHandled) {
    changeTarget((now - armPressedMs) < kShortPressMs ? kStepPulseUs : -kStepPulseUs);
  }
  armWasPressed = armNow;
}

void updateEsc() {
  const uint32_t now = millis();
  if (state == State::RUNNING && now - lastActivityMs > kAutoStopMs) {
    stopMotor("INACTIVITY_TIMEOUT");
    return;
  }
  if (now - lastRampMs < kRampPeriodMs) return;
  lastRampMs = now;
  if (actualPulseUs < requestedPulseUs)
    actualPulseUs = min<uint16_t>(requestedPulseUs, actualPulseUs + kRampStepUs);
  else if (actualPulseUs > requestedPulseUs)
    actualPulseUs = max<uint16_t>(requestedPulseUs, actualPulseUs - kRampStepUs);
  writePulse(actualPulseUs);
}

}  // namespace

void setup() {
  pinMode(kArmPin, INPUT_PULLUP);
  pinMode(kStopPin, INPUT_PULLUP);
  pinMode(kEscPin, OUTPUT);
  ledcSetup(kEscChannel, kEscFrequencyHz, kEscResolutionBits);
  ledcAttachPin(kEscPin, kEscChannel);
  writePulse(kSafePulseUs);
  Serial.begin(115200);
  delay(300);
  Serial.println("STATIONARY FINAL: SAFE PWM=1000 us");
  Serial.println("ARM hold 2 s: start 1030 us; short ARM:+5 us; long ARM:-5 us");
  Serial.println("STOP immediate; auto-stop after 15 s without ARM activity");
}

void loop() {
  updateButtons();
  updateEsc();
}
