// Detector de gás com MQ-9 + ESP32-S3 Zero + LED + Buzzer

#define PIN_MQ9     4
#define PIN_LED     5
#define PIN_BUZZER  6

// Ajuste esse valor depois de testar no ambiente normal
#define LIMIAR_GAS  1800

// Tempo de aquecimento inicial do MQ-9
#define TEMPO_AQUECIMENTO_MS 30000

void setup() {
  Serial.begin(115200);

  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  digitalWrite(PIN_LED, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  Serial.println("Iniciando detector de gas MQ-9...");
  Serial.println("Aquecendo sensor...");

  delay(TEMPO_AQUECIMENTO_MS);

  Serial.println("Sensor pronto.");
}

void loop() {
  int valorGas = analogRead(PIN_MQ9);

  Serial.print("Leitura MQ-9: ");
  Serial.println(valorGas);

  if (valorGas >= LIMIAR_GAS) {
    alertaGas(valorGas);
  } else {
    estadoNormal();
  }

  delay(500);
}

void estadoNormal() {
  digitalWrite(PIN_LED, LOW);
  digitalWrite(PIN_BUZZER, LOW);
}

void alertaGas(int valorGas) {
  Serial.print("ALERTA! Gas detectado. Valor: ");
  Serial.println(valorGas);

  digitalWrite(PIN_LED, HIGH);
  digitalWrite(PIN_BUZZER, HIGH);
  delay(200);

  digitalWrite(PIN_LED, LOW);
  digitalWrite(PIN_BUZZER, LOW);
  delay(200);
}