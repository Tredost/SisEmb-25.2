# Detector de Gás com ESP32-S3 Zero, MQ-9, LED e Buzzer

Projeto simples de detector de gás utilizando um **ESP32-S3 Zero**, um sensor **MQ-9**, um **LED** e um **buzzer**.

O sistema lê o valor analógico do sensor MQ-9 e aciona alertas visuais e sonoros quando o nível de gás ultrapassa os limites configurados no código.

---

## Componentes utilizados

* ESP32-S3 Zero
* Sensor de gás MQ-9
* LED
* Resistor de 220Ω para o LED
* Buzzer ativo
* Fonte Hi-Link 5V 0.6A
* Resistores para divisor de tensão:

  * 10kΩ
  * 20kΩ

---

## Função do projeto

O projeto monitora a presença de gás no ambiente usando o sensor **MQ-9**.

O MQ-9 é usado principalmente para detectar:

* Monóxido de carbono, CO
* GLP
* Metano
* Gases combustíveis em geral

Quando a leitura do sensor passa de um valor definido no código, o ESP32 aciona:

* LED piscando
* Buzzer emitindo som

---

## Ligações

### MQ-9 com ESP32-S3 Zero

| MQ-9 | ESP32-S3 Zero                |
| ---- | ---------------------------- |
| VCC  | 5V                           |
| GND  | GND                          |
| AOUT | GPIO 4 via divisor de tensão |

---

### LED

| LED              | ESP32-S3 Zero            |
| ---------------- | ------------------------ |
| Anodo, positivo  | GPIO 5 via resistor 220Ω |
| Catodo, negativo | GND                      |

---

### Buzzer ativo

| Buzzer   | ESP32-S3 Zero |
| -------- | ------------- |
| Positivo | GPIO 6        |
| Negativo | GND           |

---

## Atenção sobre o AOUT do MQ-9

O ESP32 trabalha com entradas analógicas de até **3.3V**.

Como o MQ-9 está alimentado com **5V**, a saída analógica `AOUT` pode chegar perto de **5V**, o que pode danificar o ESP32.

Por isso, use um divisor de tensão antes de ligar o `AOUT` ao GPIO 4.

### Divisor de tensão recomendado

```text
MQ-9 AOUT ---- resistor 10kΩ ---- GPIO 4
                  |
               resistor 20kΩ
                  |
                 GND
```

Essa ligação reduz a tensão de saída para um nível mais seguro para o ESP32.

---

## Código usado

```cpp
#define PIN_MQ9     4
#define PIN_LED     5
#define PIN_BUZZER  6

#define LIMIAR_BAIXO  1600
#define LIMIAR_ALTO   2300

#define TEMPO_AQUECIMENTO_MS 30000

void setup() {
  Serial.begin(115200);

  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  digitalWrite(PIN_LED, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  Serial.println("Detector de gas MQ-9 iniciado.");
  Serial.println("Aquecendo sensor...");
  delay(TEMPO_AQUECIMENTO_MS);
  Serial.println("Sensor pronto.");
}

void loop() {
  int valorGas = analogRead(PIN_MQ9);

  Serial.print("MQ-9: ");
  Serial.println(valorGas);

  if (valorGas >= LIMIAR_ALTO) {
    alertaForte();
  } 
  else if (valorGas >= LIMIAR_BAIXO) {
    alertaFraco();
  } 
  else {
    estadoNormal();
  }

  delay(300);
}

void estadoNormal() {
  digitalWrite(PIN_LED, LOW);
  digitalWrite(PIN_BUZZER, LOW);
}

void alertaFraco() {
  digitalWrite(PIN_LED, HIGH);
  digitalWrite(PIN_BUZZER, HIGH);
  delay(100);

  digitalWrite(PIN_LED, LOW);
  digitalWrite(PIN_BUZZER, LOW);
  delay(700);
}

void alertaForte() {
  digitalWrite(PIN_LED, HIGH);
  digitalWrite(PIN_BUZZER, HIGH);
  delay(150);

  digitalWrite(PIN_LED, LOW);
  digitalWrite(PIN_BUZZER, LOW);
  delay(150);
}
```

---

## Explicação dos pinos

```cpp
#define PIN_MQ9 4
```

Define o pino analógico usado para ler o sensor MQ-9.

```cpp
#define PIN_LED 5
```

Define o pino usado para controlar o LED.

```cpp
#define PIN_BUZZER 6
```

Define o pino usado para controlar o buzzer.

---

## Limiares de detecção

```cpp
#define LIMIAR_BAIXO 1600
#define LIMIAR_ALTO 2300
```

Esses valores definem quando o sistema deve entrar em alerta.

* Abaixo de `1600`: estado normal
* Entre `1600` e `2299`: alerta fraco
* A partir de `2300`: alerta forte

Esses valores devem ser ajustados conforme o ambiente e o sensor utilizado.

---

## Tempo de aquecimento

```cpp
#define TEMPO_AQUECIMENTO_MS 30000
```

O MQ-9 precisa de um tempo inicial de aquecimento antes de fornecer leituras mais estáveis.

Neste projeto foi usado um tempo de **30 segundos**.

Para uso mais confiável, o ideal é deixar o sensor aquecer por alguns minutos.

---

## Funcionamento

1. O ESP32 inicia o sistema.
2. O sensor MQ-9 aquece por 30 segundos.
3. O ESP32 começa a ler o valor analógico do sensor.
4. O valor é exibido no Monitor Serial.
5. Se o valor estiver abaixo do limite baixo, nada é acionado.
6. Se passar do limite baixo, o LED e o buzzer piscam lentamente.
7. Se passar do limite alto, o LED e o buzzer piscam rapidamente.

---

## Como calibrar

1. Ligue o circuito em um ambiente limpo.
2. Abra o Monitor Serial da Arduino IDE.
3. Configure a velocidade para `115200`.
4. Observe o valor médio do MQ-9 em repouso.
5. Defina o `LIMIAR_BAIXO` um pouco acima do valor normal.
6. Defina o `LIMIAR_ALTO` bem acima do valor normal.

Exemplo:

Se o sensor em ambiente limpo fica perto de `1000`, você pode usar:

```cpp
#define LIMIAR_BAIXO 1500
#define LIMIAR_ALTO 2200
```

Se o sensor em ambiente limpo fica perto de `1800`, você pode usar:

```cpp
#define LIMIAR_BAIXO 2200
#define LIMIAR_ALTO 3000
```

---

## Monitor Serial

Durante a execução, o Monitor Serial mostra leituras como:

```text
Detector de gas MQ-9 iniciado.
Aquecendo sensor...
Sensor pronto.
MQ-9: 1023
MQ-9: 1050
MQ-9: 1680
MQ-9: 2350
```

Esses valores ajudam a ajustar os limites de alerta.

---

## Observações importantes

Este projeto não substitui um detector de gás certificado.

Para uso real de segurança, é necessário utilizar equipamento certificado e adequado à norma aplicável.

O MQ-9 é sensível a variações de temperatura, umidade, alimentação e tempo de aquecimento.

A fonte Hi-Link 5V 0.6A pode alimentar o circuito, mas a instalação em rede elétrica deve ser feita com cuidado e isolamento adequado.

---
