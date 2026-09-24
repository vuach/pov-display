#include <Arduino.h>
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <Preferences.h>

#include "esc_controller.h"
#include "pov_renderer.h"
#include "project_config.h"

namespace {

BLEUUID serviceUuid("7dc00001-7b7a-4c6a-9f4b-0b62025a0001");
BLEUUID commandUuid("7dc00002-7b7a-4c6a-9f4b-0b62025a0001");
BLEUUID statusUuid("7dc00003-7b7a-4c6a-9f4b-0b62025a0001");
constexpr uint32_t IMAGE_MAGIC = 0x504F5631;
constexpr char PREF_NAMESPACE[] = "pov-display";

portMUX_TYPE hallMux = portMUX_INITIALIZER_UNLOCKED;
volatile uint32_t hallLastUs = 0;
volatile uint32_t hallPeriodUs = 0;
volatile uint32_t hallPulseCount = 0;
volatile uint32_t hallRejectedCount = 0;
volatile bool hallEventPending = false;

BLECharacteristic *statusCharacteristic = nullptr;
bool bleConnected = false;
uint32_t lastStatusMs = 0;
String serialLine;
PovRenderer povRenderer;
EscController escController;

uint32_t elapsed32(uint32_t now, uint32_t then) { return now - then; }

void IRAM_ATTR onHallPulse() {
  const uint32_t now = micros();
  portENTER_CRITICAL_ISR(&hallMux);
  const uint32_t previous = hallLastUs;
  const uint32_t delta = elapsed32(now, previous);
  if (previous == 0 || delta >= config::HALL_DEBOUNCE_US) {
    hallLastUs = now;
    if (previous != 0) {
      hallPeriodUs = hallPeriodUs == 0
          ? delta
          : static_cast<uint32_t>((static_cast<uint64_t>(hallPeriodUs) * 3ULL +
                                   delta) / 4ULL);
    }
    ++hallPulseCount;
    hallEventPending = true;
  } else {
    ++hallRejectedCount;
  }
  portEXIT_CRITICAL_ISR(&hallMux);
}

struct HallSnapshot {
  uint32_t lastUs;
  uint32_t periodUs;
  uint32_t count;
  uint32_t rejected;
  bool eventPending;
};

HallSnapshot readHall(bool clearEvent = false) {
  HallSnapshot snapshot{};
  portENTER_CRITICAL(&hallMux);
  snapshot.lastUs = hallLastUs;
  snapshot.periodUs = hallPeriodUs;
  snapshot.count = hallPulseCount;
  snapshot.rejected = hallRejectedCount;
  snapshot.eventPending = hallEventPending;
  if (clearEvent) hallEventPending = false;
  portEXIT_CRITICAL(&hallMux);
  return snapshot;
}

float rpmFromPeriod(uint32_t periodUs) {
  return periodUs == 0 ? 0.0f : 60000000.0f / static_cast<float>(periodUs);
}

bool hallIsRecent(const HallSnapshot &hall, uint32_t nowUs) {
  return hall.lastUs != 0 &&
         elapsed32(nowUs, hall.lastUs) <= config::HALL_STATUS_TIMEOUT_US;
}

String hallStatusText() {
  const HallSnapshot hall = readHall();
  const bool recent = hallIsRecent(hall, micros());
  const float rpm = recent ? rpmFromPeriod(hall.periodUs) : 0.0f;
  String result = "HALL count=";
  result += hall.count;
  result += " rejected=";
  result += hall.rejected;
  result += " period_us=";
  result += recent ? String(hall.periodUs) : String(0);
  result += " rpm=";
  result += String(rpm, 1);
  result += " target=";
  result += (rpm >= config::TARGET_RPM_MIN && rpm <= config::TARGET_RPM_MAX)
                ? "YES" : "NO";
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
  hallRejectedCount = 0;
  hallEventPending = false;
  portEXIT_CRITICAL(&hallMux);
  publishStatus("OK hall counters cleared");
}

uint32_t imageChecksum(const uint8_t *data, size_t length) {
  uint32_t hash = 2166136261UL;
  for (size_t i = 0; i < length; ++i) hash = (hash ^ data[i]) * 16777619UL;
  return hash;
}

bool saveImage() {
  Preferences preferences;
  if (!preferences.begin(PREF_NAMESPACE, false)) return false;
  const size_t length = povRenderer.imageByteCount();
  bool ok = preferences.putUInt("magic", IMAGE_MAGIC) == sizeof(uint32_t);
  ok = preferences.putUInt("length", length) == sizeof(uint32_t) && ok;
  ok = preferences.putUInt("checksum", imageChecksum(povRenderer.imageBytes(), length)) == sizeof(uint32_t) && ok;
  ok = preferences.putUChar("bright", povRenderer.brightness()) == sizeof(uint8_t) && ok;
  ok = preferences.putShort("phase", povRenderer.phaseOffset()) == sizeof(int16_t) && ok;
  ok = preferences.putBytes("image", povRenderer.imageBytes(), length) == length && ok;
  preferences.end();
  return ok;
}

bool loadImage() {
  Preferences preferences;
  if (!preferences.begin(PREF_NAMESPACE, true)) return false;
  const size_t expected = povRenderer.imageByteCount();
  const bool headerOk = preferences.getUInt("magic", 0) == IMAGE_MAGIC &&
                        preferences.getUInt("length", 0) == expected &&
                        preferences.getBytesLength("image") == expected;
  bool ok = false;
  if (headerOk && preferences.getBytes("image", povRenderer.imageBytes(), expected) == expected) {
    ok = preferences.getUInt("checksum", 0) ==
         imageChecksum(povRenderer.imageBytes(), expected);
    if (ok) {
      povRenderer.setBrightness(preferences.getUChar("bright", config::APA102_GLOBAL_BRIGHTNESS));
      povRenderer.setPhaseOffset(preferences.getShort("phase", 0));
    }
  }
  preferences.end();
  return ok;
}

bool parseImageCommand(const String &command) {
  int column, radius, red, green, blue;
  if (sscanf(command.c_str(), "IMAGE PIXEL %d %d %d %d %d", &column, &radius,
             &red, &green, &blue) == 5) {
    if (red < 0 || red > 255 || green < 0 || green > 255 || blue < 0 ||
        blue > 255 || !povRenderer.setPixel(column, radius,
          {static_cast<uint8_t>(red), static_cast<uint8_t>(green), static_cast<uint8_t>(blue)})) {
      publishStatus("ERR IMAGE PIXEL range");
    } else publishStatus("OK IMAGE PIXEL");
    return true;
  }
  if (sscanf(command.c_str(), "IMAGE CLEAR %d %d %d", &red, &green, &blue) == 3) {
    if (red < 0 || red > 255 || green < 0 || green > 255 || blue < 0 || blue > 255) {
      publishStatus("ERR IMAGE CLEAR range");
    } else {
      povRenderer.fillImage({static_cast<uint8_t>(red), static_cast<uint8_t>(green), static_cast<uint8_t>(blue)});
      publishStatus("OK IMAGE CLEAR");
    }
    return true;
  }
  if (command == "IMAGE PATTERN") {
    povRenderer.buildDiagnosticImage();
    publishStatus("OK IMAGE PATTERN");
    return true;
  }
  if (command == "IMAGE SAVE") {
    publishStatus(saveImage() ? "OK IMAGE SAVED" : "ERR IMAGE SAVE");
    return true;
  }
  if (command == "IMAGE LOAD") {
    publishStatus(loadImage() ? "OK IMAGE LOADED" : "ERR IMAGE LOAD");
    return true;
  }
  if (command == "IMAGE STATUS") {
    publishStatus("IMAGE columns=" + String(config::ANGULAR_COLUMNS) +
                  " leds=" + String(config::LEDS_PER_BLADE) +
                  " brightness=" + String(povRenderer.brightness()) +
                  " phase=" + String(povRenderer.phaseOffset()));
    return true;
  }
  return false;
}

void handleCommand(String command) {
  command.trim();
  command.toUpperCase();
  if (command.isEmpty() || parseImageCommand(command)) return;
  if (command == "PING") { publishStatus("PONG"); return; }
  if (command == "VERSION") {
    publishStatus("VERSION " + String(config::FIRMWARE_VERSION));
    return;
  }
  if (command == "STATUS") {
    publishStatus(hallStatusText());
    publishStatus(escController.statusText());
    return;
  }
  if (command == "HALL") { publishStatus(hallStatusText()); return; }
  if (command == "ESCSTATUS") { publishStatus(escController.statusText()); return; }
  if (command == "POVSTATUS") {
    String status = "POV build=";
    status += config::POV_OUTPUT_ENABLED ? "ENABLED" : "LOCKED";
    status += " sync=";
    status += povRenderer.hasSynchronization() ? "YES" : "NO";
    status += " column=";
    status += povRenderer.currentColumn() == UINT16_MAX ? String("NONE") : String(povRenderer.currentColumn());
    publishStatus(status);
    return;
  }
  if (command == "ZERO") { resetHallCounters(); return; }
  if (command.startsWith("SIMRPM ")) {
    const long rpm = command.substring(7).toInt();
    if (rpm < 1 || rpm > 10000) publishStatus("ERR SIMRPM range is 1..10000");
    else publishStatus("SIM rpm=" + String(rpm) + " period_us=" + String(60000000UL / static_cast<uint32_t>(rpm)));
    return;
  }
  if (command == "ARM") {
    publishStatus(escController.requestArm(millis())
      ? "CONFIRM with ARM CONFIRM within 3 s" : "ERR ARM locked or faulted");
    return;
  }
  if (command == "ARM CONFIRM") {
    publishStatus(escController.confirmArm(millis()) ? "OK ESC ARMED" : "ERR ARM confirmation");
    return;
  }
  if (command == "KEEPALIVE") {
    escController.keepAlive(millis());
    publishStatus("OK KEEPALIVE");
    return;
  }
  if (command == "RESETFAULT") {
    escController.clearFault();
    publishStatus(escController.statusText());
    return;
  }
  if (command.startsWith("THROTTLE ") || command.startsWith("PWM ")) {
    const int requestedUs = command.substring(command.indexOf(' ') + 1).toInt();
    publishStatus(escController.setThrottle(requestedUs, millis())
      ? "OK THROTTLE=" + String(requestedUs) : "ERR THROTTLE locked, unarmed or range");
    return;
  }
  if (command == "SAFE" || command == "STOP" || command == "OFF" || command == "DISARM") {
    escController.stop();
    povRenderer.blackout();
    publishStatus("SAFE ESC=1000 us POV=BLACK");
    return;
  }
  if (command.startsWith("BRIGHT ")) {
    const int brightness = command.substring(7).toInt();
    if (brightness < 0 || brightness > 31) publishStatus("ERR BRIGHT range 0..31");
    else { povRenderer.setBrightness(brightness); publishStatus("OK BRIGHT=" + String(brightness)); }
    return;
  }
  if (command.startsWith("PHASE ")) {
    povRenderer.setPhaseOffset(command.substring(6).toInt());
    publishStatus("OK PHASE=" + String(povRenderer.phaseOffset()));
    return;
  }
  if (command == "HELP") {
    publishStatus("CMDS STATUS ARM/CONFIRM THROTTLE KEEPALIVE STOP IMAGE BRIGHT PHASE");
    return;
  }
  publishStatus("ERR unknown command; send HELP");
}

class ServerCallbacks final : public BLEServerCallbacks {
  void onConnect(BLEServer *) override {
    bleConnected = true;
    publishStatus("BLE connected; ESC remains disarmed");
  }
  void onDisconnect(BLEServer *server) override {
    bleConnected = false;
    escController.stop();
    povRenderer.blackout();
    server->getAdvertising()->start();
    Serial.println("BLE disconnected; SAFE");
  }
};

class CommandCallbacks final : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) override {
    const std::string value = characteristic->getValue();
    if (!value.empty()) handleCommand(String(value.c_str()));
  }
};

void setupBle() {
  BLEDevice::init("POV-Display");
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  BLEService *service = server->createService(serviceUuid);
  BLECharacteristic *commandCharacteristic = service->createCharacteristic(
      commandUuid, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  commandCharacteristic->setCallbacks(new CommandCallbacks());
  statusCharacteristic = service->createCharacteristic(
      statusUuid, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
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
    if (c == '\r') continue;
    if (c == '\n') {
      handleCommand(serialLine);
      serialLine = "";
    } else if (serialLine.length() < 127) serialLine += c;
  }
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\nESP32 POV project firmware");
  Serial.println("Version: " + String(config::FIRMWARE_VERSION));
  pinMode(config::HALL_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(config::HALL_PIN), onHallPulse, FALLING);
  escController.begin();
  povRenderer.buildDiagnosticImage();
  const bool restored = loadImage();
  if (config::POV_OUTPUT_ENABLED) povRenderer.begin();
  setupBle();
  Serial.println("BLE name: POV-Display");
  Serial.println(restored ? "Stored image loaded" : "Diagnostic image loaded");
  Serial.println(config::POV_OUTPUT_ENABLED ? "POV ENABLED" : "POV BUILD LOCKED");
  Serial.println(config::ESC_ACTIVE_TEST_ENABLED ? "ESC control DISARMED" : "ESC BUILD LOCKED");
  Serial.println("READY SAFE PWM=1000 us");
}

void loop() {
  readSerialCommands();
  const uint32_t nowUs = micros();
  const uint32_t nowMs = millis();
  const HallSnapshot hall = readHall(true);
  const bool recent = hallIsRecent(hall, nowUs);
  const float rpm = recent ? rpmFromPeriod(hall.periodUs) : 0.0f;

  if (hall.eventPending) {
    Serial.println("PULSE " + hallStatusText());
    if (config::POV_OUTPUT_ENABLED && hall.periodUs != 0)
      povRenderer.synchronize(hall.lastUs, hall.periodUs);
  }
  if (config::POV_OUTPUT_ENABLED) povRenderer.tick(nowUs);

  const EscController::State before = escController.state();
  escController.tick(nowMs, nowUs, hall.lastUs, rpm);
  if (before != EscController::State::FAULT &&
      escController.state() == EscController::State::FAULT) {
    povRenderer.blackout();
    publishStatus(escController.statusText());
  }
  if (nowMs - lastStatusMs >= config::STATUS_PERIOD_MS) {
    lastStatusMs = nowMs;
    publishStatus(hallStatusText());
  }
  delay(2);
}
