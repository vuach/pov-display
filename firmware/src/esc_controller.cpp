#include "esc_controller.h"

namespace {

uint32_t elapsed32(uint32_t now, uint32_t then) { return now - then; }

uint32_t dutyFromUs(uint16_t pulseUs) {
  const uint32_t maxDuty = (1UL << config::ESC_RESOLUTION_BITS) - 1UL;
  return (static_cast<uint32_t>(pulseUs) * maxDuty) / 20000UL;
}

}  // namespace

void EscController::begin() {
  ledcSetup(config::ESC_CHANNEL, config::ESC_FREQUENCY_HZ,
            config::ESC_RESOLUTION_BITS);
  ledcAttachPin(config::ESC_PIN, config::ESC_CHANNEL);
  state_ = config::ESC_ACTIVE_TEST_ENABLED ? State::DISARMED : State::LOCKED;
  requestedUs_ = config::ESC_SAFE_US;
  actualUs_ = config::ESC_SAFE_US;
  faultReason_ = "NONE";
  writePulse(actualUs_);
}

bool EscController::requestArm(uint32_t nowMs) {
  if (!config::ESC_ACTIVE_TEST_ENABLED || state_ == State::FAULT) {
    return false;
  }
  stop();
  state_ = State::ARM_PENDING;
  armRequestedMs_ = nowMs;
  lastHeartbeatMs_ = nowMs;
  return true;
}

bool EscController::confirmArm(uint32_t nowMs) {
  if (state_ != State::ARM_PENDING ||
      elapsed32(nowMs, armRequestedMs_) > config::ESC_ARM_CONFIRM_TIMEOUT_MS) {
    stop();
    return false;
  }
  state_ = State::ARMED;
  lastHeartbeatMs_ = nowMs;
  return true;
}

bool EscController::setThrottle(uint16_t pulseUs, uint32_t nowMs) {
  if ((state_ != State::ARMED && state_ != State::RUNNING) ||
      pulseUs < config::ESC_SAFE_US || pulseUs > config::ESC_MAX_US) {
    return false;
  }
  requestedUs_ = pulseUs;
  lastHeartbeatMs_ = nowMs;
  if (pulseUs > config::ESC_SAFE_US) {
    if (state_ != State::RUNNING) {
      runningSinceMs_ = nowMs;
    }
    state_ = State::RUNNING;
  } else {
    state_ = State::ARMED;
  }
  return true;
}

void EscController::keepAlive(uint32_t nowMs) {
  if (state_ == State::ARMED || state_ == State::RUNNING) {
    lastHeartbeatMs_ = nowMs;
  }
}

void EscController::stop() {
  requestedUs_ = config::ESC_SAFE_US;
  actualUs_ = config::ESC_SAFE_US;
  writePulse(actualUs_);
  state_ = config::ESC_ACTIVE_TEST_ENABLED ? State::DISARMED : State::LOCKED;
  faultReason_ = "NONE";
}

void EscController::clearFault() {
  if (state_ == State::FAULT) {
    stop();
  }
}

void EscController::trip(const char *reason) {
  requestedUs_ = config::ESC_SAFE_US;
  actualUs_ = config::ESC_SAFE_US;
  writePulse(actualUs_);
  faultReason_ = reason;
  state_ = State::FAULT;
}

void EscController::tick(uint32_t nowMs, uint32_t nowUs,
                         uint32_t hallLastUs, float rpm) {
  if (state_ == State::ARM_PENDING &&
      elapsed32(nowMs, armRequestedMs_) > config::ESC_ARM_CONFIRM_TIMEOUT_MS) {
    stop();
    return;
  }
  if (state_ != State::ARMED && state_ != State::RUNNING) {
    return;
  }
  if (elapsed32(nowMs, lastHeartbeatMs_) > config::ESC_HEARTBEAT_TIMEOUT_MS) {
    trip("HEARTBEAT_TIMEOUT");
    return;
  }
  if (rpm > config::ESC_HARD_RPM_LIMIT) {
    trip("OVERSPEED");
    return;
  }
  if (state_ == State::RUNNING && requestedUs_ >= config::ESC_HALL_REQUIRED_US) {
    if (hallLastUs == 0) {
      if (elapsed32(nowMs, runningSinceMs_) > config::ESC_STARTUP_HALL_TIMEOUT_MS) {
        trip("NO_HALL_STARTUP");
        return;
      }
    } else if (elapsed32(nowUs, hallLastUs) >
               config::ESC_RUNNING_HALL_TIMEOUT_US) {
      trip("HALL_LOST");
      return;
    }
  }
  if (elapsed32(nowMs, lastRampMs_) < config::ESC_RAMP_PERIOD_MS) {
    return;
  }
  lastRampMs_ = nowMs;
  if (actualUs_ < requestedUs_) {
    actualUs_ = static_cast<uint16_t>(
        min<uint32_t>(requestedUs_, actualUs_ + config::ESC_RAMP_STEP_US));
  } else if (actualUs_ > requestedUs_) {
    actualUs_ = static_cast<uint16_t>(
        max<int32_t>(requestedUs_, actualUs_ - config::ESC_RAMP_STEP_US));
  }
  writePulse(actualUs_);
}

bool EscController::acceptsActiveControl() const {
  return config::ESC_ACTIVE_TEST_ENABLED && state_ != State::FAULT;
}

const char *EscController::stateName(State state) {
  switch (state) {
    case State::LOCKED: return "LOCKED";
    case State::DISARMED: return "DISARMED";
    case State::ARM_PENDING: return "ARM_PENDING";
    case State::ARMED: return "ARMED";
    case State::RUNNING: return "RUNNING";
    case State::FAULT: return "FAULT";
  }
  return "UNKNOWN";
}

String EscController::statusText() const {
  String result = "ESC state=";
  result += stateName(state_);
  result += " requested_us=";
  result += requestedUs_;
  result += " actual_us=";
  result += actualUs_;
  result += " fault=";
  result += faultReason_;
  return result;
}

void EscController::writePulse(uint16_t pulseUs) {
  ledcWrite(config::ESC_CHANNEL, dutyFromUs(pulseUs));
}
