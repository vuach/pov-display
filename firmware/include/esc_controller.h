#pragma once

#include <Arduino.h>

#include "project_config.h"

class EscController {
 public:
  enum class State : uint8_t { LOCKED, DISARMED, ARM_PENDING, ARMED, RUNNING, FAULT };

  void begin();
  bool requestArm(uint32_t nowMs);
  bool confirmArm(uint32_t nowMs);
  bool setThrottle(uint16_t pulseUs, uint32_t nowMs);
  void keepAlive(uint32_t nowMs);
  void stop();
  void clearFault();
  void tick(uint32_t nowMs, uint32_t nowUs, uint32_t hallLastUs, float rpm);

  State state() const { return state_; }
  uint16_t requestedUs() const { return requestedUs_; }
  uint16_t actualUs() const { return actualUs_; }
  const char *faultReason() const { return faultReason_; }
  bool acceptsActiveControl() const;
  String statusText() const;

 private:
  State state_ = State::LOCKED;
  uint16_t requestedUs_ = config::ESC_SAFE_US;
  uint16_t actualUs_ = config::ESC_SAFE_US;
  uint32_t armRequestedMs_ = 0;
  uint32_t lastHeartbeatMs_ = 0;
  uint32_t runningSinceMs_ = 0;
  uint32_t lastRampMs_ = 0;
  const char *faultReason_ = "NONE";

  void writePulse(uint16_t pulseUs);
  void trip(const char *reason);
  static const char *stateName(State state);
};
