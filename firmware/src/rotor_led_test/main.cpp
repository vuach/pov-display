#include <Arduino.h>

// PCB-R2: GPIO4/GPIO5 feed SN74AHCT125 inputs. Its 5 V outputs drive APA102.
constexpr uint8_t kDataPin = 4;
constexpr uint8_t kClockPin = 5;
constexpr uint8_t kLedCount = 40;
constexpr uint8_t kBrightness = 6;  // APA102 global level: 6/31.
constexpr uint32_t kStaticColourMs = 2000;
constexpr uint32_t kChasePixelMs = 500;

void pulseClock() {
  digitalWrite(kClockPin, HIGH);
  delayMicroseconds(2);
  digitalWrite(kClockPin, LOW);
  delayMicroseconds(2);
}

void writeByte(uint8_t value) {
  for (int8_t bit = 7; bit >= 0; --bit) {
    digitalWrite(kDataPin, (value >> bit) & 0x01);
    pulseClock();
  }
}

void showPixel(uint8_t selected, uint8_t red, uint8_t green, uint8_t blue) {
  for (uint8_t i = 0; i < 4; ++i) writeByte(0x00);
  for (uint8_t i = 0; i < kLedCount; ++i) {
    writeByte(0xE0 | kBrightness);
    if (i == selected) {
      writeByte(blue);
      writeByte(green);
      writeByte(red);
    } else {
      writeByte(0x00);
      writeByte(0x00);
      writeByte(0x00);
    }
  }
  for (uint8_t i = 0; i < 4; ++i) writeByte(0x00);
}

void setup() {
  pinMode(kDataPin, OUTPUT);
  pinMode(kClockPin, OUTPUT);
  digitalWrite(kDataPin, LOW);
  digitalWrite(kClockPin, LOW);
  Serial.begin(115200);
  showPixel(255, 0, 0, 0);
}

void loop() {
  const uint32_t staticSequenceMs = 3 * kStaticColourMs;
  const uint32_t chaseSequenceMs = kLedCount * kChasePixelMs;
  const uint32_t phaseMs = millis() % (staticSequenceMs + chaseSequenceMs);
  if (phaseMs < kStaticColourMs) {
    showPixel(0, 255, 0, 0);
  } else if (phaseMs < 2 * kStaticColourMs) {
    showPixel(0, 0, 255, 0);
  } else if (phaseMs < staticSequenceMs) {
    showPixel(0, 0, 0, 255);
  } else {
    const uint8_t pixel = static_cast<uint8_t>(
        (phaseMs - staticSequenceMs) / kChasePixelMs);
    showPixel(pixel, 255, 0, 0);
  }
  delay(25);
}
