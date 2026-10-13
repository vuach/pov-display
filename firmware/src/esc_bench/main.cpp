#include <Arduino.h>

namespace {

// Stationary-controller Rev C, ESP32-C3 SuperMini (see PCB schematic).
// GPIO5 is electrically unusable on the assembled stationary board.
// R1 is removed and a wire jumper routes GPIO6 directly to J3.3 (ESC PWM).
constexpr uint8_t kEscPin = 6;
constexpr uint8_t kArmPin = 20;
constexpr uint8_t kStopPin = 21;

constexpr uint8_t kEscChannel = 0;
constexpr uint16_t kEscFrequencyHz = 50;
// ESP32-C3 LEDC supports up to 14 bits at the selected 50 Hz frequency.
constexpr uint8_t kEscResolutionBits = 14;
constexpr uint16_t kSafePulseUs = 1000;
constexpr uint16_t kBenchMaxPulseUs = 1200;
constexpr uint16_t kRampStepUs = 5;
constexpr uint32_t kRampPeriodMs = 100;
constexpr uint32_t kKeepAliveTimeoutMs = 1000;
constexpr uint32_t kProbeDurationMs = 120000;

enum class State : uint8_t { SAFE, ARMED, RUNNING };

State state = State::SAFE;
uint16_t requestedPulseUs = kSafePulseUs;
uint16_t actualPulseUs = kSafePulseUs;
uint32_t lastRampMs = 0;
uint32_t lastKeepAliveMs = 0;
uint32_t probeUntilMs = 0;
bool probeActive = false;
uint8_t probePin = kEscPin;
String inputLine;

uint32_t dutyFromUs(uint16_t pulseUs) {
  const uint32_t maxDuty = (1UL << kEscResolutionBits) - 1UL;
  return (static_cast<uint32_t>(pulseUs) * maxDuty) / 20000UL;
}

void writePulse(uint16_t pulseUs) {
  ledcWrite(kEscChannel, dutyFromUs(pulseUs));
}

bool armPressed() { return digitalRead(kArmPin) == LOW; }
bool stopPressed() { return digitalRead(kStopPin) == LOW; }

const char* stateName() {
  switch (state) {
    case State::SAFE: return "SAFE";
    case State::ARMED: return "ARMED";
    case State::RUNNING: return "RUNNING";
  }
  return "UNKNOWN";
}

void printStatus() {
  Serial.printf("STATE=%s requested=%u actual=%u ARM=%s STOP=%s\n",
                stateName(), requestedPulseUs, actualPulseUs,
                armPressed() ? "PRESSED" : "OPEN",
                stopPressed() ? "PRESSED" : "OPEN");
}

void stopMotor(const char* reason) {
  if (probeActive) {
    if (probePin == kEscPin) {
      ledcAttachPin(kEscPin, kEscChannel);
    } else {
      digitalWrite(probePin, LOW);
      pinMode(probePin, INPUT);
    }
    probeActive = false;
    probePin = kEscPin;
  }
  probeUntilMs = 0;
  requestedPulseUs = kSafePulseUs;
  actualPulseUs = kSafePulseUs;
  writePulse(kSafePulseUs);
  state = State::SAFE;
  Serial.printf("SAFE PWM=1000 us (%s)\n", reason);
}

void handleCommand(String command) {
  command.trim();
  command.toUpperCase();
  if (command.length() == 0) return;

  if (command == "HELP") {
    Serial.println("STATUS | ARM | RUN 1000..1200 | KEEPALIVE | STOP | PROBE | PROBE6");
    return;
  }
  if (command == "STATUS") {
    printStatus();
    return;
  }
  if (command == "STOP" || command == "SAFE") {
    stopMotor("COMMAND");
    return;
  }
  if (command == "PROBE" || command == "PROBE6") {
    if (state != State::SAFE) {
      Serial.println("ERR return to SAFE first");
      return;
    }
    probePin = command == "PROBE6" ? 6 : kEscPin;
    probeUntilMs = millis() + kProbeDurationMs;
    if (probePin == kEscPin) ledcDetachPin(kEscPin);
    pinMode(probePin, OUTPUT);
    digitalWrite(probePin, HIGH);
    probeActive = true;
    Serial.printf("PROBE: GPIO%u is HIGH for 120 s; LiPo must remain disconnected\n", probePin);
    return;
  }
  if (command == "ARM") {
    if (!armPressed()) {
      Serial.println("ERR hold ARM button (J4.3 to GND) then send ARM");
      return;
    }
    requestedPulseUs = kSafePulseUs;
    actualPulseUs = kSafePulseUs;
    writePulse(kSafePulseUs);
    state = State::ARMED;
    lastKeepAliveMs = millis();
    Serial.println("OK ARMED; keep ARM held, then send RUN 1030 first");
    return;
  }
  if (command == "KEEPALIVE") {
    if (state == State::ARMED || state == State::RUNNING) {
      lastKeepAliveMs = millis();
      Serial.println("OK KEEPALIVE");
    } else {
      Serial.println("ERR not armed");
    }
    return;
  }
  if (command.startsWith("RUN ")) {
    const long requested = command.substring(4).toInt();
    if (state != State::ARMED && state != State::RUNNING) {
      Serial.println("ERR send ARM first");
      return;
    }
    if (!armPressed()) {
      Serial.println("ERR hold ARM button while issuing RUN");
      return;
    }
    if (requested < kSafePulseUs || requested > kBenchMaxPulseUs) {
      Serial.printf("ERR range %u..%u us\n", kSafePulseUs, kBenchMaxPulseUs);
      return;
    }
    requestedPulseUs = static_cast<uint16_t>(requested);
    lastKeepAliveMs = millis();
    state = requestedPulseUs == kSafePulseUs ? State::ARMED : State::RUNNING;
    Serial.printf("OK target=%u us\n", requestedPulseUs);
    return;
  }
  Serial.println("ERR unknown command; use HELP");
}

void readSerial() {
  while (Serial.available()) {
    const char ch = static_cast<char>(Serial.read());
    if (ch == '\n' || ch == '\r') {
      if (inputLine.length() > 0) {
        handleCommand(inputLine);
        inputLine = "";
      }
    } else if (inputLine.length() < 48) {
      inputLine += ch;
    }
  }
}

void updateEsc() {
  const uint32_t now = millis();
  if (probeUntilMs != 0) {
    if (now < probeUntilMs) return;
    stopMotor("PROBE_COMPLETE");
  }
  if (stopPressed()) {
    if (state != State::SAFE) stopMotor("STOP_BUTTON");
    return;
  }
  if (state == State::RUNNING && now - lastKeepAliveMs > kKeepAliveTimeoutMs) {
    stopMotor("KEEPALIVE_TIMEOUT");
    return;
  }
  if (now - lastRampMs < kRampPeriodMs) return;
  lastRampMs = now;
  if (actualPulseUs < requestedPulseUs) {
    actualPulseUs = min<uint16_t>(requestedPulseUs, actualPulseUs + kRampStepUs);
  } else if (actualPulseUs > requestedPulseUs) {
    actualPulseUs = max<uint16_t>(requestedPulseUs, actualPulseUs - kRampStepUs);
  }
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
  Serial.println();
  Serial.println("ESC BENCH: PWM fixed at 1000 us after boot");
  Serial.println("No propeller/rotor. Use HELP. STOP button is J4.4 to GND.");
  printStatus();
}

void loop() {
  readSerial();
  updateEsc();
}
