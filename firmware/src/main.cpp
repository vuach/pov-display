#include <Arduino.h>
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>

#include "pov_renderer.h"
#include "project_config.h"

namespace hw {
constexpr uint8_t HALL_PIN = config::HALL_PIN;
constexpr uint8_t ESC_PIN = config::ESC_PIN;
constexpr uint8_t ESC_CHANNEL = config::ESC_CHANNEL;
constexpr uint16_t ESC_FREQUENCY_HZ = config::ESC_FREQUENCY_HZ;
constexpr uint8_t ESC_RESOLUTION_BITS = config::ESC_RESOLUTION_BITS;
constexpr uint16_t ESC_SAFE_US = config::ESC_SAFE_US;
}  // namespace hw

namespace limits {
constexpr uint32_t HALL_DEBOUNCE_US = config::HALL_DEBOUNCE_US;
constexpr uint32_t HALL_DISPLAY_TIMEOUT_US = config::HALL_STATUS_TIMEOUT_US;
constexpr uint16_t TARGET_RPM_MIN = config::TARGET_RPM_MIN;
constexpr uint16_t TARGET_RPM_MAX = config::TARGET_RPM_MAX;
constexpr uint32_t STATUS_PERIOD_MS = config::STATUS_PERIOD_MS;
}

static BLEUUID serviceUuid("7dc00001-7b7a-4c6a-9f4b-0b62025a0001");
static BLEUUID commandUuid("7dc00002-7b7a-4c6a-9f4b-0b62025a0001");
static BLEUUID statusUuid("7dc00003-7b7a-4c6a-9f4b-0b62025a0001");

portMUX_TYPE hallMux = portMUX_INITIALIZER_UNLOCKED;
volatile uint32_t hallLastUs = 0;
volatile uint32_t hallPeriodUs = 0;
volatile uint32_t hallPulseCount = 0;
volatile bool hallEventPending = false;

BLECharacteristic *statusCharacteristic = nullptr;
bool bleConnected = false;
uint32_t lastStatusMs = 0;
String serialLine;
PovRenderer povRenderer;

uint32_t elapsed32(uint32_t now, uint32_t then) {
  return now - then;
}

void IRAM_ATTR onHallPulse() {
  const uint32_t now = micros();

  portENTER_CRITICAL_ISR(&hallMux);
  const uint32_t previous = hallLastUs;
  const uint32_t delta = elapsed32(now, previous);

  if (previous == 0 || delta >= limits::HALL_DEBOUNCE_US) {
    hallLastUs = now;
    if (previous != 0) {
      hallPeriodUs = delta;
    }
    ++hallPulseCount;
    hallEventPending = true;
  }
  portEXIT_CRITICAL_ISR(&hallMux);
}

struct HallSnapshot {
  uint32_t lastUs;
  uint32_t periodUs;
  uint32_t count;
  bool eventPending;
};

HallSnapshot readHall(bool clearEvent = false) {
  HallSnapshot snapshot{};
  portENTER_CRITICAL(&hallMux);
  snapshot.lastUs = hallLastUs;
  snapshot.periodUs = hallPeriodUs;
  snapshot.count = hallPulseCount;
  snapshot.eventPending = hallEventPending;
  if (clearEvent) {
    hallEventPending = false;
  }
  portEXIT_CRITICAL(&hallMux);
  return snapshot;
}

float rpmFromPeriod(uint32_t periodUs) {
  return periodUs == 0 ? 0.0f : 60000000.0f / static_cast<float>(periodUs);
}

bool rpmInTargetRange(float rpm) {
  return rpm >= limits::TARGET_RPM_MIN && rpm <= limits::TARGET_RPM_MAX;
}

uint32_t escDutyFromUs(uint16_t pulseUs) {
  const uint32_t maxDuty = (1UL << hw::ESC_RESOLUTION_BITS) - 1UL;
  return (static_cast<uint32_t>(pulseUs) * maxDuty) / 20000UL;
}

void setEscSafe() {
  ledcWrite(hw::ESC_CHANNEL, escDutyFromUs(hw::ESC_SAFE_US));
}

String hallStatusText() {
  const HallSnapshot hall = readHall();
  const uint32_t nowUs = micros();
  const bool recent = hall.lastUs != 0 &&
                      elapsed32(nowUs, hall.lastUs) <= limits::HALL_DISPLAY_TIMEOUT_US;
  const float rpm = recent ? rpmFromPeriod(hall.periodUs) : 0.0f;

  String result = "HALL count=";
  result += hall.count;
  result += " period_us=";
  result += recent ? String(hall.periodUs) : String(0);
  result += " rpm=";
  result += String(rpm, 1);
  result += " target=";
  result += rpmInTargetRange(rpm) ? "YES" : "NO";
  return result;
}

void publishStatus(const String &message) {
  Serial.println(message);
  if (statusCharacteristic != nullptr && bleConnected) {
    statusCharacteristic->setValue(message.c_str());
    statusCharacteristic->notify();
  }
}

void resetHallCounters() {
  portENTER_CRITICAL(&hallMux);
  hallLastUs = 0;
  hallPeriodUs = 0;
  hallPulseCount = 0;
  hallEventPending = false;
  portEXIT_CRITICAL(&hallMux);
  publishStatus("OK hall counters cleared");
}

void handleCommand(String command) {
  command.trim();
  command.toUpperCase();

  if (command.isEmpty()) {
    return;
  }

  if (command == "PING") {
    publishStatus("PONG");
    return;
  }
  if (command == "STATUS" || command == "HALL") {
    publishStatus(hallStatusText());
    return;
  }
  if (command == "POVSTATUS") {
    String status = "POV build=";
    status += config::POV_OUTPUT_ENABLED ? "ENABLED" : "LOCKED";
    status += " sync=";
    status += povRenderer.hasSynchronization() ? "YES" : "NO";
    status += " column=";
    status += povRenderer.currentColumn() == UINT16_MAX
                  ? String("NONE")
                  : String(povRenderer.currentColumn());
    publishStatus(status);
    return;
  }
  if (command == "ZERO") {
    resetHallCounters();
    return;
  }
  if (command.startsWith("SIMRPM ")) {
    const long rpm = command.substring(7).toInt();
    if (rpm < 1 || rpm > 10000) {
      publishStatus("ERR SIMRPM range is 1..10000");
      return;
    }
    const uint32_t periodUs = 60000000UL / static_cast<uint32_t>(rpm);
    publishStatus("SIM rpm=" + String(rpm) + " period_us=" + String(periodUs));
    return;
  }
  if (command.startsWith("PWM ")) {
    const int requestedUs = command.substring(4).toInt();
#if ENABLE_ESC_ACTIVE_TEST
    if (requestedUs < 1000 || requestedUs > 1100) {
      publishStatus("ERR active-test PWM range is 1000..1100 us");
      return;
    }
    ledcWrite(hw::ESC_CHANNEL, escDutyFromUs(static_cast<uint16_t>(requestedUs)));
    publishStatus("PWM=" + String(requestedUs) + " us ACTIVE TEST");
#else
    (void)requestedUs;
    setEscSafe();
    publishStatus("LOCKED active ESC test disabled; PWM=1000 us");
#endif
    return;
  }
  if (command == "SAFE" || command == "STOP" || command == "OFF") {
    setEscSafe();
    publishStatus("SAFE PWM=1000 us");
    return;
  }
  if (command == "HELP") {
    publishStatus("CMDS PING STATUS HALL ZERO SIMRPM n PWM n SAFE POVSTATUS");
    return;
  }

  publishStatus("ERR unknown command; send HELP");
}

class ServerCallbacks final : public BLEServerCallbacks {
  void onConnect(BLEServer *) override {
    bleConnected = true;
    publishStatus("BLE connected; ESC active test locked");
  }

  void onDisconnect(BLEServer *server) override {
    bleConnected = false;
    setEscSafe();
    server->getAdvertising()->start();
    Serial.println("BLE disconnected; PWM=1000 us SAFE");
  }
};

class CommandCallbacks final : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) override {
    const std::string value = characteristic->getValue();
    if (!value.empty()) {
      handleCommand(String(value.c_str()));
    }
  }
};

void setupBle() {
  BLEDevice::init("ESP32-POV-Test");
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService *service = server->createService(serviceUuid);
  BLECharacteristic *commandCharacteristic = service->createCharacteristic(
      commandUuid,
      BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  commandCharacteristic->setCallbacks(new CommandCallbacks());

  statusCharacteristic = service->createCharacteristic(
      statusUuid,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  statusCharacteristic->addDescriptor(new BLE2902());
  statusCharacteristic->setValue("BOOT SAFE");

  service->start();
  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(serviceUuid);
  advertising->setScanResponse(true);
  advertising->start();
}

void readSerialCommands() {
  while (Serial.available() > 0) {
    const char c = static_cast<char>(Serial.read());
    if (c == '\r') {
      continue;
    }
    if (c == '\n') {
      handleCommand(serialLine);
      serialLine = "";
      continue;
    }
    if (serialLine.length() < 96) {
      serialLine += c;
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println("ESP32 POV bench test");
  Serial.println("WARNING: motor and ESC must remain disconnected");

  pinMode(hw::HALL_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(hw::HALL_PIN), onHallPulse, FALLING);

  ledcSetup(hw::ESC_CHANNEL, hw::ESC_FREQUENCY_HZ, hw::ESC_RESOLUTION_BITS);
  ledcAttachPin(hw::ESC_PIN, hw::ESC_CHANNEL);
  setEscSafe();

  if (config::POV_OUTPUT_ENABLED) {
    povRenderer.begin();
  }

  setupBle();
  Serial.println("BLE name: ESP32-POV-Test");
  Serial.println("Commands: PING STATUS HALL ZERO SIMRPM n PWM n SAFE POVSTATUS HELP");
  Serial.println(config::POV_OUTPUT_ENABLED
                     ? "POV output ENABLED; Hall synchronization required"
                     : "POV output LOCKED at build time");
  Serial.println("READY SAFE PWM=1000 us");
}

void loop() {
  readSerialCommands();

  const HallSnapshot hall = readHall(true);
  if (hall.eventPending) {
    Serial.println("PULSE " + hallStatusText());
    if (config::POV_OUTPUT_ENABLED && hall.periodUs != 0) {
      povRenderer.synchronize(hall.lastUs, hall.periodUs);
    }
  }

  if (config::POV_OUTPUT_ENABLED) {
    povRenderer.tick(micros());
  }

  const uint32_t nowMs = millis();
  if (nowMs - lastStatusMs >= limits::STATUS_PERIOD_MS) {
    lastStatusMs = nowMs;
    publishStatus(hallStatusText());
  }

  delay(2);
}
