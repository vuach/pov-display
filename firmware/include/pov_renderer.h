#pragma once

#include <Arduino.h>
#include <SPI.h>

#include "project_config.h"

struct Rgb {
  uint8_t r;
  uint8_t g;
  uint8_t b;
};

class PovRenderer {
 public:
  void begin();
  void synchronize(uint32_t revolutionStartUs, uint32_t revolutionPeriodUs);
  void tick(uint32_t nowUs);
  void blackout();

  bool hasSynchronization() const { return synchronized_; }
  uint16_t currentColumn() const { return lastColumn_; }

 private:
  static constexpr size_t FRAME_BYTES =
      4 + config::LEDS_PER_BLADE * 4 + 4;

  SPIClass spiA_{VSPI};
  SPIClass spiB_{HSPI};
  Rgb image_[config::ANGULAR_COLUMNS][config::LEDS_PER_BLADE]{};
  uint8_t txA_[FRAME_BYTES]{};
  uint8_t txB_[FRAME_BYTES]{};
  uint32_t revolutionStartUs_ = 0;
  uint32_t revolutionPeriodUs_ = 0;
  uint16_t lastColumn_ = UINT16_MAX;
  bool synchronized_ = false;
  bool dark_ = true;

  void buildStartupImage();
  void encodeColumn(uint16_t columnA, uint16_t columnB);
  void transferFrames();
  static void encodeBlade(uint8_t *destination, const Rgb *pixels);
};
