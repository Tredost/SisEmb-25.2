# GasShield: Sistema IoT de Monitoramento de Gás

O **GasShield** é uma plataforma completa e profissional para monitoramento de vazamento de gás e detecção de monóxido de carbono em ambientes residenciais, edifícios e condomínios.

O projeto é dividido em três camadas principais:
1. **Firmware (IoT):** Dispositivos baseados em ESP32 e sensores MQ-9.
2. **Backend (Gateway/API):** Servidor Node.js para gerenciar persistência, telemetria MQTT e Socket.io.
3. **Frontend (Web App):** Dashboard dinâmico para os síndicos e administradores desenvolvido em React.

### Demonstração do Sistema ao Vivo
Veja a simulação orgânica, alertas em tempo real e navegação nas telas do painel de administração:

![Demonstração Completa do Sistema](gasshield_demo.webp)

---

## 🏗 Arquitetura do Sistema Web

### Backend (`/backend`)
Construído com **Node.js** e **Express**, atuando como o cérebro de processamento e persistência:
- **Banco de Dados (SQLite):** Persistência local (`dados.sqlite`) leve e sem necessidade de infraestrutura complexa ou Docker, contornando bloqueios de firewall corporativos/universitários.
- **Client MQTT Integrado:** Subscrição contínua aos tópicos do broker (`broker.hivemq.com` por padrão). Processa a telemetria do ESP32 e mapeia dinamicamente para os edifícios cadastrados.
- **WebSockets (Socket.io):** Dispara dados processados e alertas em tempo real para os clientes conectados na web.
- **Rotas CRUD:** Gerenciamento da estrutura física (Locais e Unidades/Apartamentos) via REST API (`/api/locais` e `/api/unidades`).
- **Simulador Engine:** Permite testar o front-end injetando dezenas de unidades simuladas com "Random Walk" (flutuação de gás/CO) e disparo de emergências espontâneas.

### Frontend (`/frontend`)
Single Page Application (SPA) ultra-rápida focada na usabilidade:
- **Stack:** React 19 + Vite 8 + TypeScript.
- **Estilização (UI/UX):** Tailwind CSS v3.4 + Variáveis nativas (HSL) focando em acessibilidade e responsividade "Mobile First".
- **Gestão de Estado:** Context API customizada (`gasStore.tsx`) acoplada ao Socket.io, mantendo o feed de eventos e KPIs centralizados sem loops de renderização.
- **Telas Principais:**
  - `Visão Geral`: Painel agregado do síndico, com grid por andares e painéis dinâmicos que mudam de cor e pulsam em vermelho para vazamentos críticos.
  - `Gestão de Locais`: Interface CRUD completa com agrupamento para criar/remover Prédios, Condomínios e Casas.
  - `Central de Alertas`: Log global e histórico de todas as anomalias, com sistema de filtros (Emergência, Alerta, Resolvido).
  - `Configuração MQTT`: Painel avançado para redefinir o broker alvo ou espelhar um dispositivo de hardware real (ESP32) para um apartamento específico.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- Node.js v18 ou superior.

### 1. Iniciar o Backend
```bash
cd backend
npm install
node seed.js  # (Opcional) Popula o SQLite com 30 locais realistas (Edifícios/Condomínios)
node server.js
```
*O servidor estará rodando em http://localhost:3001*

### 2. Iniciar o Frontend
```bash
cd frontend
npm install
npm run dev
```
*Acesse http://localhost:5173 para visualizar o Dashboard.*

---

## 📡 Integrando o ESP32 ao Dashboard (Dispositivo Real)

Se você for utilizar um ESP32 físico rodando o script `gas_shield_script.ino`:
1. Acesse o web app em [http://localhost:5173/config](http://localhost:5173/config).
2. Na seção de **Mapeamento de Sensor Real**, digite o nome de um dos edifícios cadastrados (ex: `Aurora`) e o número do apartamento (ex: `302`).
3. Ao salvar, o Node.js passará a injetar os valores LEL do hardware *diretamente* naquele bloco visual do apartamento `302`. As demais unidades manterão comportamento simulado.

---

## 🔧 Componentes e Firmware IoT

O sketch presente em `GasShield/gas_shield_script.ino` lê o valor analógico do MQ-9, compara com um limite configurado e envia o estado para um broker MQTT.

### Componentes Utilizados
* ESP32
* Sensor de gás MQ-9
* Transistor BC547 (chave para o buzzer)
* Buzzer ativo
* Fonte Hi-Link HLK-5M05

*Aviso: Use um divisor de tensão antes de ligar o AOUT do MQ-9 ao ESP32, pois a saída opera a 5V e o ESP32 tolera no máximo 3.3V.*

### Payload MQTT
Formato de envio:
```json
{"device_id":"esp32-sala","mq9":1234,"alarme":true}
```
O backend Node.js captura esse JSON e transforma a variável analógica (`mq9`) em porcentagem **LEL** (Lower Explosive Limit) para exibição correta no Front-end.
