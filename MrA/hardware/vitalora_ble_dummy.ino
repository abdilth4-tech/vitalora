/**
 * Vitalora ESP32 BLE Firmware
 *
 * Sensor Simulation dengan Formula Fisiologis:
 * - Max30102: HR + SpO2 + RR intervals dengan HRV variation
 * - MLX90614: Non-contact temperature dengan circadian variation
 * - IMU: Step detection + movement variance untuk sleep detection
 *
 * Output: JSON via BLE GATT, 1x per detik
 *
 * Library Dependencies:
 * - BLEDevice, BLEServer, BLEUtils, BLE2902 (built-in)
 * - ArduinoJson v6 (Sketch → Include Library → Manage Libraries)
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ArduinoJson.h>

// ──── CONFIG ────
#define SERVICE_UUID        "12345678-1234-5678-1234-56789abc0000"
#define CHARACTERISTIC_UUID "12345678-1234-5678-1234-56789abc0001"
#define DEVICE_NAME         "Vitalora Watch"
#define BLE_LED             2

// ──── GLOBALS ────
BLECharacteristic *pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;
unsigned long lastNotifyTime = 0;
unsigned long lastMagnitude = 1000;
int stepCount = 0;
float rrBuffer[60];
int bufferIndex = 0;

// ──── SETUP ────
void setup() {
  Serial.begin(115200);
  delay(1000);
  pinMode(BLE_LED, OUTPUT);
  digitalWrite(BLE_LED, LOW);

  Serial.println("\n\n================================");
  Serial.println("Vitalora ESP32 BLE Firmware");
  Serial.println("================================");

  BLEDevice::init(DEVICE_NAME);
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ
  );
  pCharacteristic->addDescriptor(new BLE2902());
  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  BLEDevice::startAdvertising();

  Serial.println("✅ BLE Initialized - Waiting for connection...");

  float baseRR = 60000.0 / 72.0;
  for (int i = 0; i < 60; i++) {
    rrBuffer[i] = baseRR;
  }
}

// ──── LOOP ────
void loop() {
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    BLEDevice::startAdvertising();
    Serial.println("Start advertising");
    oldDeviceConnected = deviceConnected;
    digitalWrite(BLE_LED, LOW);
  }

  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
    Serial.println("✅ Device connected!");
    digitalWrite(BLE_LED, HIGH);
  }

  if (millis() - lastNotifyTime >= 1000) {
    lastNotifyTime = millis();
    SensorData data = generateSensorData();

    DynamicJsonDocument doc(512);
    doc["hr"]       = data.hr;
    doc["spo2"]     = data.spo2;
    doc["temp"]     = data.temp;
    doc["rr"]       = data.rr_rate;
    doc["hrv"]      = data.hrv;
    doc["sdnn"]     = data.sdnn;
    doc["rmssd"]    = data.rmssd;
    doc["pnn50"]    = data.pnn50;
    doc["steps"]    = stepCount;
    doc["battery"]  = data.battery;
    doc["stress"]   = data.stress;
    doc["movement"] = data.movement;

    String json;
    serializeJson(doc, json);

    if (deviceConnected) {
      pCharacteristic->setValue(json.c_str());
      pCharacteristic->notify();
      Serial.println("📤 " + json);
    }
  }

  if (!deviceConnected) {
    digitalWrite(BLE_LED, (millis() / 500) % 2);
  }
  delay(10);
}

// ──── SENSOR DATA ────
struct SensorData {
  float hr;
  float spo2;
  float temp;
  float rr_rate;
  float hrv;
  float sdnn;
  float rmssd;
  float pnn50;
  float battery;
  float stress;
  float movement;
};

SensorData generateSensorData() {
  SensorData data;
  unsigned long uptime_ms = millis();

  // HR + RR
  float hr_base = 72.0;
  float hr_variation = 8.0 * sin(uptime_ms / 4000.0);
  float baseRR = 60000.0 / (hr_base + hr_variation);
  float rrVariance = 40.0;
  float rr = baseRR + (random(-rrVariance, rrVariance+1));
  rrBuffer[bufferIndex] = rr;
  bufferIndex = (bufferIndex + 1) % 60;
  data.hr = round(60000.0 / rr);

  // SpO2
  float R = 0.43 + (random(-3, 4) / 100.0);
  data.spo2 = round((110.0 - (25.0 * R)) * 10) / 10.0;

  // RR rate
  data.rr_rate = 14 + sin(uptime_ms / 8000.0) * 2 + random(-1, 2);

  // Temp
  float baseTemp = 36.5;
  float circadian = 0.3 * sin(((uptime_ms / 3600000.0) - 6) * PI / 12.0);
  float noise = (random(-5, 6) / 100.0);
  data.temp = round((baseTemp + circadian + noise) * 10) / 10.0;

  // Steps + Movement
  float stepIntensity = 0.4;
  float ax = sin(uptime_ms / 300.0) * stepIntensity;
  float ay = cos(uptime_ms / 300.0) * 0.3;
  float az = 1.0 + sin(uptime_ms / 300.0) * stepIntensity * 0.5;
  float magnitude = sqrt(ax*ax + ay*ay + az*az);

  if (magnitude > 1.1 && lastMagnitude < 1.1) {
    stepCount++;
  }
  lastMagnitude = magnitude;
  data.movement = round(abs(magnitude - 1.0) * 100) / 100.0;

  // HRV SDNN
  float mean_rr = 0;
  for (int i = 0; i < 60; i++) mean_rr += rrBuffer[i];
  mean_rr /= 60.0;
  float sum_sq_dev = 0;
  for (int i = 0; i < 60; i++) {
    float diff = rrBuffer[i] - mean_rr;
    sum_sq_dev += diff * diff;
  }
  data.sdnn = round(sqrt(sum_sq_dev / 60.0));

  // RMSSD
  float sumSqDiff = 0;
  for (int i = 1; i < 60; i++) {
    float diff = rrBuffer[i] - rrBuffer[i-1];
    sumSqDiff += diff * diff;
  }
  data.rmssd = round(sqrt(sumSqDiff / 59.0));

  // pNN50
  int nn50 = 0;
  for (int i = 1; i < 60; i++) {
    if (abs(rrBuffer[i] - rrBuffer[i-1]) > 50) nn50++;
  }
  data.pnn50 = round((float)nn50 / 59.0 * 100);
  data.hrv = data.rmssd;

  // Stress
  data.stress = max(5, min(95, (int)(100 - (data.rmssd - 20) * 1.2)));

  // Battery
  float drain = (uptime_ms / 3600000.0) * 0.5;
  data.battery = max(5, 87 - drain);

  return data;
}

// ──── BLE CALLBACKS ────
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) {
    deviceConnected = true;
  }
  void onDisconnect(BLEServer *pServer) {
    deviceConnected = false;
  }
};
