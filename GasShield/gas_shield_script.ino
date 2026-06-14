#include <WiFi.h>
#include <PubSubClient.h>

// =======================
// PINOS
// =======================
#define PIN_MQ9     1
#define PIN_BUZZER  12

// =======================
// IDENTIFICAÇÃO DO DISPOSITIVO
// =======================
const char* DEVICE_ID = "esp32-sala";

// =======================
// WIFI
// =======================
const char* WIFI_SSID = "Brendinha";
const char* WIFI_PASSWORD = "12345678";

// =======================
// MQTT
// =======================
const char* MQTT_BROKER = "broker.hivemq.com";
const int MQTT_PORT = 1883;

char MQTT_TOPIC[100];
char MQTT_CLIENT_ID[80];

// =======================
// CONFIGURAÇÕES DO SENSOR
// =======================
int LIMITE_GAS = 450;
unsigned long TEMPO_AQUECIMENTO = 30000; // 30 segundos

// Envia MQTT a cada 2 segundos
unsigned long intervaloEnvio = 2000;
unsigned long ultimoEnvio = 0;

// =======================
// OBJETOS
// =======================
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// =======================
// SETUP
// =======================
void setup() {
  Serial.begin(115200);

  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  analogReadResolution(12); // 0 a 4095

  // Monta tópico respectivo do dispositivo
  snprintf(
    MQTT_TOPIC,
    sizeof(MQTT_TOPIC),
    "ianes/gasshield/dispositivos/%s/status",
    DEVICE_ID
  );

  // Monta Client ID único
  snprintf(
    MQTT_CLIENT_ID,
    sizeof(MQTT_CLIENT_ID),
    "gasshield-%s",
    DEVICE_ID
  );

  Serial.println("Sistema iniciado.");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);

  Serial.print("Topico MQTT: ");
  Serial.println(MQTT_TOPIC);

  Serial.println("Aquecendo MQ-9...");
  delay(TEMPO_AQUECIMENTO);
  Serial.println("MQ-9 pronto.");

  conectarWiFi();

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  conectarMQTT();
}

// =======================
// LOOP
// =======================
void loop() {
  if (!mqttClient.connected()) {
    conectarMQTT();
  }

  mqttClient.loop();

  int leituraMQ9 = analogRead(PIN_MQ9);
  bool alarme = leituraMQ9 >= LIMITE_GAS;

  Serial.print("Device: ");
  Serial.print(DEVICE_ID);
  Serial.print(" | MQ-9: ");
  Serial.print(leituraMQ9);
  Serial.print(" | Alarme: ");
  Serial.println(alarme ? "true" : "false");

  if (alarme) {
    ativarAlarme();
  } else {
    desligarAlarme();
    delay(200);
  }

  unsigned long agora = millis();

  if (agora - ultimoEnvio >= intervaloEnvio) {
    ultimoEnvio = agora;
    enviarMQTT(leituraMQ9, alarme);
  }
}

// =======================
// WIFI
// =======================
void conectarWiFi() {
  Serial.print("Conectando ao Wi-Fi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi conectado.");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

// =======================
// MQTT
// =======================
void conectarMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Conectando ao MQTT... ");
    Serial.print("Client ID: ");
    Serial.println(MQTT_CLIENT_ID);

    if (mqttClient.connect(MQTT_CLIENT_ID)) {
      Serial.println("MQTT conectado.");
    } else {
      Serial.print("Falhou. Estado: ");
      Serial.println(mqttClient.state());
      delay(2000);
    }
  }
}

void enviarMQTT(int valorMQ9, bool alarme) {
  char payload[150];

  snprintf(
    payload,
    sizeof(payload),
    "{\"device_id\":\"%s\",\"mq9\":%d,\"alarme\":%s}",
    DEVICE_ID,
    valorMQ9,
    alarme ? "true" : "false"
  );

  mqttClient.publish(MQTT_TOPIC, payload);

  Serial.print("Enviado MQTT em ");
  Serial.print(MQTT_TOPIC);
  Serial.print(": ");
  Serial.println(payload);
}

// =======================
// ALARME
// =======================
void ativarAlarme() {
  digitalWrite(PIN_BUZZER, HIGH);
  delay(150);

  digitalWrite(PIN_BUZZER, LOW);
  delay(150);
}

void desligarAlarme() {
  digitalWrite(PIN_BUZZER, LOW);
}