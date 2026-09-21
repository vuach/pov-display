#pragma once

#include <Arduino.h>

#ifndef POV_DISPLAY_ENABLED
#define POV_DISPLAY_ENABLED 0
#endif

#ifndef ENABLE_ESC_ACTIVE_TEST
#define ENABLE_ESC_ACTIVE_TEST 0
#endif

namespace config {

constexpr uint8_t HALL_PIN = 27;
constexpr uint8_t ESC_PIN = 25;

constexpr uint8_t LED_DATA_A_PIN = 18;
constexpr uint8_t LED_CLOCK_A_PIN = 19;
constexpr uint8_t LED_DATA_B_PIN = 23;
constexpr uint8_t LED_CLOCK_B_PIN = 22;

constexpr uint8_t ESC_CHANNEL = 0;
constexpr uint16_t ESC_FREQUENCY_HZ = 50;
constexpr uint8_t ESC_RESOLUTION_BITS = 16;
constexpr uint16_t ESC_SAFE_US = 1000;

constexpr uint8_t LEDS_PER_BLADE = 20;
constexpr uint16_t ANGULAR_COLUMNS = 120;
constexpr uint8_t APA102_GLOBAL_BRIGHTNESS = 3;  // 3/31 for first tests.
constexpr uint32_t APA102_SPI_HZ = 12000000;

constexpr uint32_t HALL_DEBOUNCE_US = 5000;
constexpr uint32_t HALL_STATUS_TIMEOUT_US = 2000000;
constexpr uint32_t POV_SYNC_TIMEOUT_US = 250000;
constexpr uint16_t TARGET_RPM_MIN = 600;
constexpr uint16_t TARGET_RPM_MAX = 2400;
constexpr uint32_t STATUS_PERIOD_MS = 1000;

constexpr bool POV_OUTPUT_ENABLED = POV_DISPLAY_ENABLED != 0;
constexpr bool ESC_ACTIVE_TEST_ENABLED = ENABLE_ESC_ACTIVE_TEST != 0;

static_assert(ANGULAR_COLUMNS % 2 == 0,
              "Two blades require an even angular column count");
static_assert(LEDS_PER_BLADE >= 1 && LEDS_PER_BLADE <= 21,
              "Verify power and geometry before using more than 21 LEDs");

}  // namespace config
