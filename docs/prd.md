GasShield — Product Requirements Document (PRD)
Versão: 2.0 · Data: 14 de junho de 2026 · Status: MVP front-end vivo (mockado, pronto para integração de backend)
Escopo deste documento: painel administrativo do síndico, app do morador/proprietário, motor de simulação, regras de negócio, stack técnica e funcionalidades implementadas. A landing page pública não é coberta aqui.

Campo	Valor
Produto	GasShield — Sistema IoT de monitoramento de vazamento de gás (GLP e CO) em condomínios residenciais
Categoria	Safety-tech / IoT / PropTech
Stage	MVP demonstrável (academic-ready)
Time	Ian Esteves (Hardware & Firmware ESP32) · Luiz Fabiano Merino (Backend & Realtime) · Brenda Mendes (Front-end & UX) · Luahn Kayê (Integração IoT & Dados)
Stack	React 18 · Vite 5 · TypeScript 5 · Tailwind CSS v3 · shadcn/ui · Recharts · React Router v6 · Sonner · Lovable Cloud (planejado)
1. Sumário Executivo
GasShield é um sistema IoT residencial que monitora vazamento de GLP (gás de cozinha) e monóxido de carbono (CO) em tempo real dentro de apartamentos, agregando todos os sensores de um condomínio em um painel único do síndico e oferecendo ao morador um app pessoal com leituras ao vivo, histórico e botão de pedido de socorro.

O MVP atual entrega o frontend completo, navegável e visualmente realista, com um motor de simulação que alimenta o sistema de eventos como se sensores físicos estivessem online — permitindo apresentação acadêmica e validação de UX antes da integração com hardware ESP32 + Cloud.

Por que existe: segundo dados levantados pela equipe, mais de 756 mortes foram atribuídas a vazamento de gás no Brasil nos últimos 25 anos. Detectores residenciais existentes são caros, isolados (sem painel coletivo) e raramente integrados à gestão do condomínio. GasShield fecha esse gap.

2. Problema & Contexto
2.1 Dor real
Morador não tem visibilidade sobre o que o sensor dele está lendo — alarmes locais avisam tarde demais.
Síndico não consegue saber em qual apartamento começou um vazamento até alguém ligar reclamando.
Soluções de mercado (DNI, Intelbras, Abafire) são detectores isolados: sem app, sem painel agregado, sem realtime, e tipicamente caras.
2.2 Quem perde dinheiro/vida
Condomínios pagam multas e enfrentam evacuações por falsos positivos não rastreados.
Famílias perdem moradores por intoxicação por CO (silencioso e inodoro) ou explosão de GLP.
Bombeiros chegam sem informação prévia de qual unidade está crítica.
3. Visão & Proposta de Valor
GasShield torna cada apartamento um nó de uma rede de proteção do condomínio inteiro.

Para	Entregamos	Substituindo
Síndico	Painel realtime multi-edifício com mapa de andares, feed de eventos e central de alertas	Telefonemas reativos, planilhas, sensores isolados
Morador	App pessoal com leituras GLP/CO ao vivo, histórico 24h e botão "pedir prioridade"	Detector beepando no teto sem contexto
Operação GasShield	Reportes manuais e telemetria centralizada para resposta prioritária	Atendimento reativo via 0800
Diferenciais vs. concorrentes (DNI, Intelbras, Abafire): Wi-Fi nativo, app do morador, dashboard do síndico, realtime, preço acessível — só GasShield combina os quatro.

4. Personas
4.1 Síndico — Carlos, 52, gestor de 3 condomínios
Goal: zero incidente sob sua gestão, resposta em < 5 min.
Pain: depende de moradores ligarem; não tem como provar que o sensor disparou.
Como GasShield ajuda: dashboard com mapa por andar, feed live e histórico auditável.
4.2 Morador / Proprietário — Juliana, 34, apto 204
Goal: dormir tranquila sabendo que cozinha está segura mesmo com criança em casa.
Pain: detector velho do teto não fala com o celular.
Como GasShield ajuda: gauge em tempo real, histórico pessoal, configura limite próprio e aciona equipe com 1 toque.
4.3 Equipe de Operações GasShield
Goal: atender reportes manuais e críticos com SLA, manter sensores online.
Como GasShield ajuda: recebe eventos type=report direto do morador via app + alertas automáticos por transição de status.
5. Jornadas Principais
5.1 Login por perfil
/login  →  escolhe "Síndico" ou "Morador"
        →  e-mail + senha (mock)
        →  redireciona /dashboard  ou  /morador
5.2 Síndico responde a alerta
Toast "ALARME — Aurora apto 302"  →  abre /dashboard
→ vê célula 302 pulsando vermelho no mapa
→ clica → dialog com leituras, morador, contato, bateria
→ liga para o morador OU aciona bombeiros
→ status volta a "safe" → entrada "✓ normalizado" no feed
5.3 Morador reporta pico manual
Sente cheiro de gás → abre app /morador
→ clica "Notificar GasShield"
→ evento type=report aparece para a equipe na Central de Alertas
→ toast confirma: "Vamos monitorar com prioridade"
6. Funcionalidades Implementadas
Tudo nesta seção já existe no código e está navegável no preview.

6.1 Login (/login)
Layout split: brand panel navy à esquerda + formulário à direita.
Seletor de perfil com 2 cards visuais (Síndico × Morador) que mudam o destino do redirect.
Validação visual via toast (Sonner) e roteamento programático via react-router-dom.
Pronto para plug-and-play com Lovable Cloud Auth.
6.2 Painel do Síndico — Dashboard (/dashboard)
Layout: sidebar fixa (AppSidebar) + header com seletor de edifício + main scrollável.

Componentes:

Seletor de edifício — dropdown com 3 prédios (Aurora · Horizonte · Vista Mar).
Badge ONLINE — indicador de Wi-Fi com cor de status.
4 KPIs com animação count-up (useCountUp):
Unidades monitoradas
Em estado seguro
Em alerta
Em emergência
Card de Simulações Demo — 4 cenários determinísticos clicáveis (ver §10).
Mapa do edifício — grid 5 andares × 4 unidades:
Cor dinâmica por status: verde (safe) · amarelo (warning) · vermelho com pulse-critical (critical) · cinza (offline).
Mostra % GLP em cada célula.
Clique → abre UnitDetailDialog.
Animação fade-in escalonada por andar/unidade.
Feed de Eventos LIVE — coluna lateral com até 80 eventos, ordenados por timestamp DESC:
Tipos: critical · warning · resolved · report · info
Cor de fundo e borda por tipo
Animação slide-in-right em cada novo item
Glossário inline (Glossary inline) para termos técnicos
Gráfico Histórico 24h (Recharts):
Linha de GLP (% LEL)
ReferenceLine em 5% (warning) e 10% (alarme)
Update automático a cada 5s adicionando novo ponto
6.3 Edifícios (/edificios)
Lista de cards expansíveis dos 3 condomínios.
Cada card mostra:
Ícone de status agregado (critical > warning > safe)
Endereço completo e cidade
Badges quantitativos (seguro / alerta / crítico) com cor
Expansão revela o mesmo grid de mapa de andares do dashboard, navegável para detalhe.
6.4 Central de Alertas (/alertas)
Histórico global (todos os edifícios) com tabs de filtro:
Todos · Emergência · Alerta · Resolvido · Reportes
Cada item exibe badge de tipo, edifício + apto, timestamp formatado pt-BR e mensagem completa.
Borda lateral colorida (border-l-4) por gravidade.
Botão "Ver apto" abre o dialog de detalhe da unidade correspondente.
6.5 Detalhe de Unidade — Dialog (UnitDetailDialog)
Componente reusado por Dashboard, Edifícios e Alertas.

Cabeçalho: número do apto, andar, bloco, edifício + badge de status grande.
Banner contextual com hint específico do status ("GLP acima de 10% LEL · ação imediata", etc.).
2 cards grandes de leitura com explicação leiga embaixo:
GLP em % LEL + tooltip do glossário
CO em ppm + tooltip do glossário
Tabela de metadados (Morador · Contato · Sensor · Bateria · Sinal · Última leitura).
CTA primário "Notificar equipe GasShield sobre este apto" — dispara reportPeak() no store.
6.6 Painel do Morador (/morador)
Header: identificação do apto (204 · Bloco A · Edifício Aurora) + badge SENSOR ONLINE.

Blocos:

Banner CTA "Notificar GasShield" — para suspeita de pico ou cheiro de gás. Dispara evento type=report no feed global.
Gauge GLP animado (GasGauge) com thresholds 5% e 10%.
Card CO com valor grande em ppm, badge de status e grade visual de faixas (seguro / alerta / perigo).
Histórico pessoal 24h (Recharts) com linhas GLP + CO e linha de referência configurável pelo morador.
Glossário expandido — explicações leigas de GLP, LEL, CO, ppm, MQ-9, etc.
Configurações de alerta:
Switch push notifications
Switch som de alarme
Slider de limite pessoal (3% a 15% LEL, default 8%)
7. Sistema Vivo — Motor de Simulação (GasStoreProvider)
O arquivo src/store/gasStore.tsx é o coração funcional do MVP. Mesmo sem hardware físico, o sistema se comporta como produção real graças a 3 mecanismos:

7.1 Detecção automática de transição de status
Sempre que setUnits() é chamado, o store compara o status anterior com o novo e gera automaticamente o evento correto:

Transição	Evento gerado	Side effect
safe → warning	type=warning "⚠️ Concentração subindo — GLP X% LEL"	—
any → critical	type=critical "🚨 ALARME — GLP X% LEL · sirene ativada · {morador}"	Toast destrutivo
warning/critical → safe	type=resolved "✓ Situação normalizada"	—
Isso garante que qualquer apartamento que entre em alerta ou emergência aparece no feed em tempo real, vindo de qualquer fonte (demo, ambiente, morador).

7.2 Timer 1 — Flutuação ambiente (5s)
Roda continuamente sobre todas as unidades não-críticas dos 3 prédios, aplicando um random walk pequeno em ±0.25% LEL. Mantém o gráfico "respirando" e ocasionalmente cruza thresholds, alimentando o feed naturalmente.

7.3 Timer 2 — Vida própria (9s)
A cada tick, sorteia Math.random():

< 0.18 → pico de alerta espontâneo em apto safe aleatório (5.5–8.5% LEL), auto-resolve em 20–35s.
< 0.23 → emergência rara (12–22% LEL), auto-resolve em 35–60s, com mensagem variada do array AMBIENT_CRIT_MSGS.
< 0.40 → evento info (heartbeat, calibração, sinal Wi-Fi restabelecido).
caso contrário → silêncio.
O resultado: o sistema parece vivo e imprevisível durante a apresentação, sem precisar de interação do apresentador.

7.4 reportPeak(unit)
Função pública do store usada pelo botão "Notificar GasShield" no dialog e no painel do morador. Empurra um evento type=report com a leitura atual do apto, visível para toda a equipe na Central de Alertas.

8. Regras de Negócio & Limiares
8.1 GLP (% LEL — Lower Explosive Limit)
Faixa	Status	Cor	Ação
< 5%	Safe	verde #22C55E	Nenhuma
5% – 10%	Warning	amarelo #F59E0B	Investigar, alerta no app
> 10%	Critical	vermelho #EF4444	Sirene + push + entrada no feed + toast destrutivo
8.2 CO (ppm — partes por milhão)
Faixa	Status	Significado
< 9 ppm	Seguro	Normal
9 – 35 ppm	Alerta	Risco de dor de cabeça com exposição prolongada
> 35 ppm	Perigo	Pode causar desmaio, evacuar
8.3 Eventos gerados
Tipo	Cor	Fonte
critical	destructive	transição automática para critical, demo, emergência espontânea
warning	warning	transição automática para warning, pico espontâneo
resolved	success	volta para safe vinda de warning/critical
report	secondary	botão "Notificar GasShield" no app do morador / dialog
info	muted	heartbeat, calibração, sincronização
Capacidade do feed: 80 eventos mais recentes (FIFO).

9. Modelo de Dados
Interfaces reais do código (src/lib/mockData.ts):

export type UnitStatus = "safe" | "warning" | "critical" | "offline";

export interface Unit {
  id: string;
  number: string;        // "302"
  floor: number;         // 1..5
  block: string;         // "A"
  buildingId: string;    // "aurora" | "horizonte" | "vista"
  resident: string;
  phone: string;
  glp: number;           // % LEL
  co: number;            // ppm
  status: UnitStatus;
  lastReading: string;   // ISO
  sensorModel: string;   // "MQ-9 + MQ-2"
  installedAt: string;
  battery: number;       // 0..100
  signal: number;        // 0..100
}

export interface Building {
  id: string;
  name: string;
  address: string;
  units: number;
  blocks: number;
  city: string;
}

export interface EventItem {
  id: string;
  ts: string;            // ISO
  unit: string;
  buildingId: string;
  buildingName: string;
  type: "info" | "warning" | "critical" | "resolved" | "report";
  message: string;
}

export interface DemoScenario {
  id: string;
  buildingId: string;
  unitNumber: string;
  title: string;
  description: string;
  peak: number;          // % LEL alvo
  rampSteps: number;     // updates até pico
  resolveAfterMs: number;
}
Volumes do mock: 3 edifícios × 20 unidades = 60 sensores ativos simultâneos.

10. Modo Demo — 4 Cenários Determinísticos
Disparáveis pelo card "Simulações demo" no dashboard. Um por vez (lock global via activeDemo).

ID	Edifício	Apto	Pico	Resolve	Objetivo
aurora-302	Aurora	302	28% LEL	45 s	Mostrar fluxo completo de emergência crítica com sirene
aurora-104	Aurora	104	7.5% LEL	25 s	Mostrar warning transitório auto-resolvendo
horizonte-405	Horizonte	405	24% LEL	50 s	Emergência em outro prédio — prova multi-building
vista-201	Vista Mar	201	9% LEL (CO)	30 s	Foco em monóxido de carbono
Cada cenário roda uma rampa de rampSteps updates a cada 1.5 s até atingir peak, depois agenda o setTimeout de resolução. Toda transição passa pelo setUnits → dispara o feed automaticamente.

11. Stack Técnica
11.1 Frontend
Camada	Tecnologia	Versão
Framework	React	18
Bundler / Dev server	Vite	5
Linguagem	TypeScript	5
Styling	Tailwind CSS	3
Componentes	shadcn/ui (Radix UI)	latest
Ícones	lucide-react	latest
Charts	Recharts	latest
Routing	react-router-dom	6
Toasts	sonner	latest
Estado global	React Context API + useRef para timers	—
11.2 Hooks customizados
useCountUp(target, duration) — animação de contador para KPIs.
11.3 Backend (planejado, ainda não conectado)
Lovable Cloud (Supabase under the hood) para:
Auth real (substituir mock do /login)
Postgres com RLS por papel (síndico vê só seus edifícios; morador vê só seu apto)
Realtime subscriptions substituindo o GasStoreProvider mock
Edge Functions para ingestão de telemetria dos ESP32
Storage para fotos de incidentes e laudos PDF
11.4 Hardware (roadmap v3)
MCU: ESP32-WROOM-32 (Wi-Fi + BLE)
Sensores: MQ-2 (gases combustíveis genéricos) + MQ-9 (GLP/CO específico)
Atuadores: sirene piezo + LED de status
Protocolo: MQTT sobre TLS para Lovable Cloud Edge Function
OTA: atualização de firmware over-the-air
12. Arquitetura de Pastas
src/
├── pages/
│   ├── Dashboard.tsx       # painel do síndico
│   ├── Edificios.tsx       # lista expansível
│   ├── Alertas.tsx         # central de alertas
│   ├── Morador.tsx         # app do morador
│   ├── Login.tsx           # auth (mock)
│   ├── Index.tsx           # entry
│   └── NotFound.tsx
├── components/
│   ├── AppSidebar.tsx      # navegação fixa
│   ├── GasGauge.tsx        # gauge animado SVG
│   ├── Glossary.tsx        # tooltip + dialog explicando GLP/CO/LEL/ppm
│   ├── UnitDetailDialog.tsx# dialog reusado em 3 telas
│   ├── NavLink.tsx
│   └── ui/                 # shadcn primitives
├── store/
│   └── gasStore.tsx        # GasStoreProvider — motor vivo
├── lib/
│   ├── mockData.ts         # BUILDINGS, generateBuilding, DEMO_SCENARIOS
│   └── utils.ts            # cn()
├── hooks/
│   └── useCountUp.ts
├── App.tsx                 # routes + GasStoreProvider wrap
├── main.tsx
└── index.css               # design tokens HSL
13. Design System
13.1 Paleta
Token	HSL / Hex	Uso
--primary (navy)	#0D1B4B	Header, brand panels, sidebar
--secondary (azul)	#1E40AF	CTAs, links, charts GLP
--background	branco	Superfícies
--destructive	#EF4444	Emergência, alarme
--warning	#F59E0B	Alerta
--success	#22C55E	Estado seguro
--muted	cinza claro	Offline, fundos secundários
13.2 Tipografia
Sans: Inter (UI)
Mono: JetBrains Mono (números, badges, telemetria)
13.3 Animações (Tailwind keyframes em index.css)
pulse-critical — destaque vermelho pulsante para células em emergência
fade-in — entradas escalonadas no grid
slide-in-right — novos itens do feed
scale-in — cards do app do morador
Count-up nos KPIs
13.4 Princípio visual
Industrial-tech. Precisão tipográfica monoespaçada, bordas marcadas, zero gradientes decorativos. Inspiração: Linear + Datadog + painéis SCADA.

14. Glossário (para usuário final)
Termo	O que é (linguagem leiga)
GLP	Gás de cozinha (propano + butano). Inflamável.
LEL	Lower Explosive Limit — concentração mínima de gás no ar para haver explosão se houver faísca.
% LEL	Quão perto estamos do nível explosivo. 100% LEL = mistura explosiva. Nosso alarme dispara em 10% LEL — bem antes do perigo real.
CO	Monóxido de carbono. Invisível, inodoro, tóxico. Sai de fogão mal regulado, aquecedor a gás.
ppm	Partes por milhão — unidade para medir gases tóxicos em pequena quantidade.
MQ-9	Sensor barato e confiável que mede GLP e CO. Coração do nosso dispositivo.
MQ-2	Sensor complementar para gases combustíveis em geral.
O glossário aparece como tooltip inline ao lado dos termos técnicos na UI e como dialog completo no app do morador.

15. Métricas de Sucesso (KPIs)
Métrica	Definição	Meta v2
MTTA (Mean Time To Acknowledge)	Tempo médio síndico abrir um alerta crítico	< 60 s
MTTR (Mean Time To Resolve)	Tempo até status voltar a safe	< 5 min
Falsos positivos	Alertas críticos sem causa real	< 5%
Uptime sensor	% do tempo com heartbeat válido	> 99%
NPS síndico	Net Promoter Score	> 50
Adoção morador	% de moradores que abrem o app ≥ 1×/semana	> 40%
16. Roadmap
v1 — MVP atual (Junho 2026) ✅
Frontend completo, navegável, com motor de simulação vivo. 3 edifícios, 60 unidades, 4 cenários demo, feed em tempo real, app do morador, central de alertas.

v2 — Lovable Cloud (próximo passo)
Auth real (Síndico × Morador × Operações) com RLS por papel
Persistência de eventos em Postgres
Realtime subscriptions substituindo GasStoreProvider
Edge Function de ingestão /ingest recebendo telemetria via HTTPS/MQTT
Notificações push (web push API)
v3 — Hardware
Protótipo ESP32 + MQ-9 + MQ-2 + sirene
Firmware com publicação MQTT a cada 2s
OTA updates
Calibração automática
v4 — Escala
App mobile nativo (React Native)
Integração com bombeiros / corretora de seguros
IA preditiva sobre padrões de consumo de gás (detectar mangueira furada antes do pico)
Multi-tenant para administradoras
17. Riscos & Compliance
17.1 Riscos
Risco	Mitigação
Falso positivo causa evacuação desnecessária	Validação cruzada MQ-2 + MQ-9, debounce de 10s antes de critical
Sensor offline sem síndico saber	Heartbeat obrigatório a cada 30s, status offline automático após 2 min
Cobertura Wi-Fi ruim em alguns aptos	Fallback BLE → gateway por andar
Custo do hardware inviabiliza adoção	Meta de BOM < R$ 80 por nó
17.2 Compliance / LGPD
Dados pessoais coletados: nome do morador, telefone, leituras associadas ao apto.
RLS no Postgres: síndico só lê unidades dos seus edifícios; morador só lê o próprio apto.
Retenção: leituras agregadas por hora após 30 dias; eventos críticos retidos por 2 anos para auditoria.
Consentimento explícito do morador no primeiro login.
18. Out of Scope (não está no MVP)
Landing page pública (existe no código mas não documentada aqui).
Autenticação real (mock atual).
Persistência server-side (tudo em memória via Context).
Hardware físico (somente simulação).
App mobile nativo (somente web responsivo).
Integração com bombeiros / 193.
Cobrança / billing.
Fim do documento
GasShield · PRD v2 · Junho 2026 · Equipe Ian · Luiz Fabiano · Brenda · Luahn