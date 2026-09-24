#include "pov_renderer.h"

namespace {

uint32_t elapsed32(uint32_t now, uint32_t then) {
  return now - then;
}

bool periodInDisplayRange(uint32_t periodUs) {
  if (periodUs == 0) {
    return false;
  }
  const uint32_t rpm = 60000000UL / periodUs;
  return rpm >= config::TARGET_RPM_MIN && rpm <= config::TARGET_RPM_MAX;
}

}  // namespace

void PovRenderer::begin() {
  spiA_.begin(config::LED_CLOCK_A_PIN, -1, config::LED_DATA_A_PIN, -1);
  spiB_.begin(config::LED_CLOCK_B_PIN, -1, config::LED_DATA_B_PIN, -1);
  dark_ = false;
  blackout();
}

void PovRenderer::buildDiagnosticImage() {
  for (uint16_t angle = 0; angle < config::ANGULAR_COLUMNS; ++angle) {
    for (uint8_t radius = 0; radius < config::LEDS_PER_BLADE; ++radius) {
      Rgb pixel{0, 0, 0};

      // Thin radial spokes make phase jitter and wrong blade offset visible.
      if (angle % 15 == 0) {
        pixel = {28, 28, 28};
      }

      // Three low-power sectors identify orientation without full-white load.
      if (radius >= config::LEDS_PER_BLADE - 3) {
        if (angle < config::ANGULAR_COLUMNS / 3) {
          pixel = {48, 0, 0};
        } else if (angle < 2 * config::ANGULAR_COLUMNS / 3) {
          pixel = {0, 48, 0};
        } else {
          pixel = {0, 0, 48};
        }
      }

      // A dim inner ring remains continuous and shows missing columns.
      if (radius == 1) {
        pixel = {8, 8, 8};
      }
      image_[angle][radius] = pixel;
    }
  }
}

void PovRenderer::fillImage(Rgb color) {
  for (uint16_t angle = 0; angle < config::ANGULAR_COLUMNS; ++angle) {
    for (uint8_t radius = 0; radius < config::LEDS_PER_BLADE; ++radius) {
      image_[angle][radius] = color;
    }
  }
}

bool PovRenderer::setPixel(uint16_t column, uint8_t radius, Rgb color) {
  if (column >= config::ANGULAR_COLUMNS || radius >= config::LEDS_PER_BLADE) {
    return false;
  }
  image_[column][radius] = color;
  return true;
}

void PovRenderer::setBrightness(uint8_t brightness) {
  brightness_ = brightness > 31 ? 31 : brightness;
}

void PovRenderer::setPhaseOffset(int16_t columns) {
  int16_t normalized = columns % static_cast<int16_t>(config::ANGULAR_COLUMNS);
  if (normalized < 0) {
    normalized += config::ANGULAR_COLUMNS;
  }
  phaseOffsetColumns_ = normalized;
}

void PovRenderer::synchronize(uint32_t revolutionStartUs,
                              uint32_t revolutionPeriodUs) {
  if (!periodInDisplayRange(revolutionPeriodUs)) {
    synchronized_ = false;
    blackout();
    return;
  }

  revolutionStartUs_ = revolutionStartUs;
  revolutionPeriodUs_ = revolutionPeriodUs;
  lastColumn_ = UINT16_MAX;
  synchronized_ = true;
}

void PovRenderer::tick(uint32_t nowUs) {
  if (!synchronized_) {
    return;
  }

  const uint32_t elapsedUs = elapsed32(nowUs, revolutionStartUs_);
  if (elapsedUs > config::POV_SYNC_TIMEOUT_US ||
      elapsedUs >= revolutionPeriodUs_) {
    synchronized_ = false;
    blackout();
    return;
  }

  const uint16_t column = static_cast<uint16_t>(
      (static_cast<uint64_t>(elapsedUs) * config::ANGULAR_COLUMNS) /
      revolutionPeriodUs_);
  if (column == lastColumn_ || column >= config::ANGULAR_COLUMNS) {
    return;
  }

  const uint16_t phased =
      (column + phaseOffsetColumns_) % config::ANGULAR_COLUMNS;
  const uint16_t opposite =
      (phased + config::ANGULAR_COLUMNS / 2) % config::ANGULAR_COLUMNS;
  encodeColumn(phased, opposite);
  transferFrames();
  lastColumn_ = column;
  dark_ = false;
}

void PovRenderer::encodeBlade(uint8_t *destination, const Rgb *pixels) {
  size_t offset = 0;
  for (uint8_t i = 0; i < 4; ++i) {
    destination[offset++] = 0x00;
  }
  for (uint8_t i = 0; i < config::LEDS_PER_BLADE; ++i) {
    destination[offset++] = 0xE0 | brightness_;
    destination[offset++] = pixels[i].b;
    destination[offset++] = pixels[i].g;
    destination[offset++] = pixels[i].r;
  }
  for (uint8_t i = 0; i < 4; ++i) {
    destination[offset++] = 0xFF;
  }
}

void PovRenderer::encodeColumn(uint16_t columnA, uint16_t columnB) {
  encodeBlade(txA_, image_[columnA]);
  encodeBlade(txB_, image_[columnB]);
}

void PovRenderer::transferFrames() {
  spiA_.beginTransaction(
      SPISettings(config::APA102_SPI_HZ, MSBFIRST, SPI_MODE0));
  spiA_.transferBytes(txA_, nullptr, FRAME_BYTES);
  spiA_.endTransaction();

  spiB_.beginTransaction(
      SPISettings(config::APA102_SPI_HZ, MSBFIRST, SPI_MODE0));
  spiB_.transferBytes(txB_, nullptr, FRAME_BYTES);
  spiB_.endTransaction();
}

void PovRenderer::blackout() {
  if (dark_) {
    return;
  }

  Rgb black[config::LEDS_PER_BLADE]{};
  encodeBlade(txA_, black);
  encodeBlade(txB_, black);
  transferFrames();
  dark_ = true;
  lastColumn_ = UINT16_MAX;
}
