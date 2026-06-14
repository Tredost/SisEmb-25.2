# Detector de Gás com ESP32, MQ-9, Buzzer e MQTT

Projeto de monitoramento de gás com **ESP32**, sensor **MQ-9**, **buzzer** e publicação de dados via **MQTT**.

O sketch em [GasShield/gas_shield_script.ino](GasShield/gas_shield_script.ino) lê o valor analógico do MQ-9, compara com um limite configurado no código e envia o estado atual para um broker MQTT.

---

## Componentes utilizados

* ESP32
* Sensor de gás MQ-9
* Transistor BC547
* Buzzer ativo
* Resistores para divisor de tensão no AOUT do MQ-9
* Fonte Hi-Link HLK-5M05
* Resistores de base e polarização para o BC547

---

## Função do projeto

O projeto monitora a presença de gás no ambiente usando o sensor **MQ-9**.

Quando a leitura analógica ultrapassa o limite definido, o ESP32:

* aciona o buzzer em pulsos curtos
* publica o valor lido e o estado do alarme via MQTT

---

## Configuração do sketch

### Identificação do dispositivo

```cpp
const char* DEVICE_ID = "esp32-sala";
```

Esse identificador é usado na montagem do tópico MQTT e no payload enviado.

### Wi-Fi

```cpp
const char* WIFI_SSID = "Brendinha";
const char* WIFI_PASSWORD = "12345678";
```

Essas credenciais estão definidas diretamente no código. Recomenda-se trocá-las antes de usar em outro ambiente.

### MQTT

```cpp
const char* MQTT_BROKER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
```

O tópico é montado automaticamente como:

```text
ianes/gasshield/dispositivos/esp32-sala/status
```

### Sensor e alarme

```cpp
int LIMITE_GAS = 450;
unsigned long TEMPO_AQUECIMENTO = 30000;
unsigned long intervaloEnvio = 2000;
```

* `LIMITE_GAS`: valor acima do qual o alarme é acionado
* `TEMPO_AQUECIMENTO`: tempo de espera inicial do MQ-9, em milissegundos
* `intervaloEnvio`: intervalo entre publicações MQTT, em milissegundos

---

## Ligações

### MQ-9 com ESP32

| MQ-9 | ESP32 |
| ---- | ----- |
| VCC  | 5V    |
| GND  | GND   |
| AOUT | GPIO 1 via divisor de tensão |

### Buzzer ativo

| Buzzer   | ESP32 |
| -------- | ----- |
| Positivo | Alimentado pela saída comutada pelo BC547 |
| Negativo | GND |

### Transistor BC547

O BC547 é usado como chave para o buzzer, aliviando a corrente exigida do pino do ESP32.

Uma ligação típica é:

* coletor no buzzer
* emissor no GND
* base no GPIO 12 por meio de um resistor

---

## Atenção sobre o AOUT do MQ-9

O ESP32 trabalha com entradas analógicas de até **3.3V**.

Como o MQ-9 está alimentado com **5V**, a saída analógica `AOUT` pode ultrapassar o valor seguro para o ESP32.

Por isso, use um divisor de tensão antes de ligar o `AOUT` ao GPIO 1.

Exemplo de divisor:

```text
MQ-9 AOUT ---- resistor 10kΩ ---- GPIO 1
                  |
               resistor 20kΩ
                  |
                 GND
```

---

## Funcionamento

1. O ESP32 inicia o sistema e configura o buzzer.
2. O código aguarda o tempo de aquecimento do MQ-9.
3. O Wi-Fi é conectado.
4. O cliente MQTT é configurado e conectado ao broker.
5. O loop lê o valor analógico do MQ-9.
6. Se o valor for maior ou igual ao limite, o buzzer é acionado em pulsos curtos.
7. A cada 2 segundos, o ESP32 publica um JSON com `device_id`, `mq9` e `alarme`.

---

## Payload MQTT

O payload enviado segue este formato:

```json
{"device_id":"esp32-sala","mq9":1234,"alarme":true}
```

Campos enviados:

* `device_id`: identificação do dispositivo
* `mq9`: leitura atual do sensor
* `alarme`: `true` ou `false`

---

## Monitor Serial

Durante a execução, o Monitor Serial mostra mensagens como:

```text
Sistema iniciado.
Device ID: esp32-sala
Topico MQTT: ianes/gasshield/dispositivos/esp32-sala/status
Aquecendo MQ-9...
MQ-9 pronto.
Wi-Fi conectado.
MQTT conectado.
Device: esp32-sala | MQ-9: 420 | Alarme: false
Enviado MQTT em ianes/gasshield/dispositivos/esp32-sala/status: {"device_id":"esp32-sala","mq9":420,"alarme":false}
```

---

## Observações importantes

Este projeto não substitui um detector de gás certificado pois o MQ-9 é sensível a variações de temperatura, umidade, alimentação e tempo de aquecimento.

A fonte Hi-Link HLK-5M05 fornece a alimentação de 5V do sistema, mas a instalação na rede elétrica deve ser feita com isolamento e cuidado adequados.

Se o buzzer estiver sendo acionado por transistor, o resistor de base do BC547 precisa ser dimensionado conforme a corrente do buzzer e o nível lógico do ESP32.

