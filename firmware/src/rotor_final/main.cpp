#include <Arduino.h>
#include <SPI.h>

namespace {

// Rotor PCB-R2, ESP32-C3 SuperMini.
constexpr uint8_t kDataPin = 4;   // G4/A4 -> SN74AHCT125 1A -> APA102 DI
constexpr uint8_t kClockPin = 5;  // G5/A5 -> SN74AHCT125 2A -> APA102 CI
constexpr uint8_t kHallPin = 6;   // G6 -> 3.3 V Hall index signal
constexpr uint16_t kLedCount = 40;
constexpr uint8_t kBrightness = 2;  // 2/31: low-current first run.
constexpr uint32_t kSpiHz = 4000000;
constexpr uint32_t kHallDebounceUs = 3000;
constexpr uint32_t kSyncTimeoutUs = 250000;
constexpr uint16_t kColumnsPerTurn = 60;

SPIClass ledSpi(FSPI);
portMUX_TYPE hallMux = portMUX_INITIALIZER_UNLOCKED;
volatile uint32_t hallLastUs = 0;
volatile uint32_t hallPeriodUs = 0;
volatile bool hallNewEdge = false;
uint16_t previousColumn = UINT16_MAX;
uint32_t lastStatusMs = 0;

void IRAM_ATTR onHallEdge() {
  const uint32_t now = micros();
  portENTER_CRITICAL_ISR(&hallMux);
  if (hallLastUs == 0 || now - hallLastUs >= kHallDebounceUs) {
    if (hallLastUs != 0) hallPeriodUs = now - hallLastUs;
    hallLastUs = now;
    hallNewEdge = true;
  }
  portEXIT_CRITICAL_ISR(&hallMux);
}

void snapshotHall(uint32_t& lastUs, uint32_t& periodUs, bool& newEdge) {
  portENTER_CRITICAL(&hallMux);
  lastUs = hallLastUs;
  periodUs = hallPeriodUs;
  newEdge = hallNewEdge;
  hallNewEdge = false;
  portEXIT_CRITICAL(&hallMux);
}

void sendByte(uint8_t value) { ledSpi.transfer(value); }

void showColumn(uint16_t column) {
  ledSpi.beginTransaction(SPISettings(kSpiHz, MSBFIRST, SPI_MODE0));
  for (uint8_t i = 0; i < 4; ++i) sendByte(0x00);
  for (uint16_t led = 0; led < kLedCount; ++led) {
    const bool on = ((led * 3 + column) % kColumnsPerTurn) == 0;
    sendByte(0xE0 | kBrightness);
    if (on) {
      // APA102 byte order is B, G, R. One low-brightness cyan pixel per frame.
      sendByte(32);
      sendByte(32);
      sendByte(0);
    } else {
      sendByte(0);
      sendByte(0);
      sendByte(0);
    }
  }
  for (uint8_t i = 0; i < 8; ++i) sendByte(0xFF);
  ledSpi.endTransaction();
}

void blackout() {
  ledSpi.beginTransaction(SPISettings(kSpiHz, MSBFIRST, SPI_MODE0));
  for (uint8_t i = 0; i < 4; ++i) sendByte(0x00);
  for (uint16_t led = 0; led < kLedCount; ++led) {
    sendByte(0xE0 | kBrightness);
    sendByte(0); sendByte(0); sendByte(0);
  }
  for (uint8_t i = 0; i < 8; ++i) sendByte(0xFF);
  ledSpi.endTransaction();
}

}  // namespace

void setup() {
  Serial.begin(115200);
  pinMode(kHallPin, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(kHallPin), onHallEdge, FALLING);
  ledSpi.begin(kClockPin, -1, kDataPin, -1);
  blackout();
  Serial.println("ROTOR FINAL: APA102 blackout until Hall synchronization");
}

void loop() {
  uint32_t lastUs, periodUs;
  bool newEdge;
  snapshotHall(lastUs, periodUs, newEdge);
  const uint32_t now = micros();
  const bool synchronized = lastUs != 0 && periodUs != 0 &&
      now - lastUs <= kSyncTimeoutUs;

  if (!synchronized) {
    if (previousColumn != UINT16_MAX) {
      blackout();
      previousColumn = UINT16_MAX;
    }
  } else {
    const uint32_t elapsed = now - lastUs;
    const uint16_t column = static_cast<uint16_t>(
        (static_cast<uint64_t>(elapsed) * kColumnsPerTurn) / periodUs) % kColumnsPerTurn;
    if (column != previousColumn || newEdge) {
      showColumn(column);
      previousColumn = column;
    }
  }

  if (millis() - lastStatusMs >= 1000) {
    lastStatusMs = millis();
    const float rpm = periodUs == 0 ? 0.0f : 60000000.0f / periodUs;
    Serial.printf("HALL sync=%s period_us=%lu rpm=%.1f\n",
                  synchronized ? "YES" : "NO",
                  static_cast<unsigned long>(periodUs), rpm);
  }
}
