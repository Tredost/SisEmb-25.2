import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';

// ─── Tipos ───────────────────────────────────────────────
export type StatusUnidade = "safe" | "warning" | "critical" | "offline";

export type LocalData = {
  id: number;
  nome: string;
  tipo: string;
  endereco: string;
};

export type UnidadeData = {
  id: number;
  id_local: number;
  identificacao: string;
  andar_ou_bloco: string;
  nome_morador: string;
  contato: string;
  dispositivo_instalado: string;
  bateria: number;
  sinal: number;
  glp: number;
  co: number;
  status: StatusUnidade;
  ultima_leitura: string;
};

export type EventoData = {
  id: string;
  timestamp: string;
  mensagem: string;
  tipo: 'critical' | 'warning' | 'resolved' | 'info';
};

type GasContextType = {
  locais: LocalData[];
  unidades: UnidadeData[];
  eventos: EventoData[];
  carregando: boolean;
  recarregarDados: () => void;
};

const GasContext = createContext<GasContextType | undefined>(undefined);

const URL_API = 'http://localhost:3001';

// ─── Funções puras auxiliares ────────────────────────────
function gerarId() {
  return Math.random().toString(36).substring(2, 11);
}

function criarEvento(mensagem: string, tipo: EventoData['tipo']): EventoData {
  return {
    id: gerarId(),
    timestamp: new Date().toLocaleTimeString('pt-BR'),
    mensagem,
    tipo,
  };
}

function buscarNomeLocal(locais: LocalData[], idLocal: number): string {
  const local = locais.find(l => l.id === idLocal);
  return local ? local.nome : 'Local #' + idLocal;
}

// ─── Provider ────────────────────────────────────────────
export function GasStoreProvider({ children }: { children: ReactNode }) {
  const [locais, setLocais] = useState<LocalData[]>([]);
  const [unidades, setUnidades] = useState<UnidadeData[]>([]);
  const [eventos, setEventos] = useState<EventoData[]>([]);
  const [carregando, setCarregando] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vidaRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inicializado = useRef(false);

  // Refs para manter valores frescos dentro de closures de timers/socket
  const locaisRef = useRef<LocalData[]>([]);

  // Sincroniza ref de locais sempre que o state muda
  useEffect(() => { locaisRef.current = locais; }, [locais]);

  // Adiciona evento no feed
  const pushEvento = useCallback((mensagem: string, tipo: EventoData['tipo']) => {
    setEventos(prev => [criarEvento(mensagem, tipo), ...prev].slice(0, 100));
  }, []);

  // Carrega dados do banco e inicializa a simulação
  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const [resLocais, resUnidades] = await Promise.all([
        fetch(URL_API + '/api/locais'),
        fetch(URL_API + '/api/unidades'),
      ]);
      const locaisData: LocalData[] = await resLocais.json();
      const unidadesData: any[] = await resUnidades.json();

      setLocais(locaisData || []);
      locaisRef.current = locaisData || [];

      const agora = new Date().toISOString();
      const unidadesVivas: UnidadeData[] = (unidadesData || []).map(u => ({
        ...u,
        glp: parseFloat((Math.random() * 3).toFixed(2)),
        co: parseFloat((Math.random() * 6).toFixed(1)),
        status: 'safe' as StatusUnidade,
        ultima_leitura: agora,
      }));
      setUnidades(unidadesVivas);

      if (unidadesVivas.length > 0) {
        pushEvento('Sistema inicializado — ' + unidadesVivas.length + ' sensores online', 'info');
      }
    } catch {
      pushEvento('Erro ao conectar com o servidor backend', 'critical');
    } finally {
      setCarregando(false);
    }
  }, [pushEvento]);

  // ─── Efeito principal: carrega dados, conecta socket, liga simulação ──
  useEffect(() => {
    if (inicializado.current) return;
    inicializado.current = true;

    carregarDados();

    // ─── Socket.io para dados reais do MQTT ────────────────────────
    const socket = io(URL_API);
    socketRef.current = socket;

    socket.on('connect', () => {
      pushEvento('Ponte MQTT conectada ao backend', 'info');
    });

    socket.on('leitura_real', (dados: any) => {
      setUnidades(prev =>
        prev.map(unit => {
          const localDaUnidade = locaisRef.current.find(l => l.id === unit.id_local);
          if (!localDaUnidade) return unit;

          const nomeLocalStr = localDaUnidade.nome.toLowerCase();
          const edificioConfig = (dados.configuracao_real?.edificio_real || '').toLowerCase();
          const unidadeConfig = dados.configuracao_real?.unidade_real || '';

          if (nomeLocalStr.includes(edificioConfig) && unit.identificacao === unidadeConfig) {
            let novoStatus: StatusUnidade = 'safe';
            if (dados.glp_lel >= 10 || dados.alarme_ativo) novoStatus = 'critical';
            else if (dados.glp_lel >= 5) novoStatus = 'warning';

            if (novoStatus === 'critical' && unit.status !== 'critical') {
              pushEvento('🚨 ALARME REAL — ' + localDaUnidade.nome + ' · Apto ' + unit.identificacao + ' — GLP ' + dados.glp_lel.toFixed(1) + '% LEL', 'critical');
            } else if (novoStatus === 'warning' && unit.status === 'safe') {
              pushEvento('⚠️ Concentração subindo (real) — ' + localDaUnidade.nome + ' · Apto ' + unit.identificacao, 'warning');
            } else if (novoStatus === 'safe' && unit.status !== 'safe') {
              pushEvento('✓ Sensor real normalizado — ' + localDaUnidade.nome + ' · Apto ' + unit.identificacao, 'resolved');
            }

            return {
              ...unit,
              glp: dados.glp_lel,
              co: Math.max(0, dados.glp_lel * 0.8 + Math.random() * 2),
              status: novoStatus,
              ultima_leitura: new Date().toISOString(),
            };
          }
          return unit;
        })
      );
    });

    // ─── Timer 1: Flutuação ambiente a cada 3s (random walk suave) ──
    simRef.current = setInterval(() => {
      setUnidades(prev => {
        if (prev.length === 0) return prev;
        return prev.map(unit => {
          if (unit.status !== 'safe') return unit;
          const deltaGlp = (Math.random() - 0.48) * 0.35;
          const deltaCo = (Math.random() - 0.48) * 0.5;
          return {
            ...unit,
            glp: parseFloat(Math.max(0, Math.min(4.8, unit.glp + deltaGlp)).toFixed(2)),
            co: parseFloat(Math.max(0, Math.min(8, unit.co + deltaCo)).toFixed(1)),
            ultima_leitura: new Date().toISOString(),
          };
        });
      });
    }, 3000);

    // ─── Timer 2: Vida própria a cada 7s (eventos espontâneos) ──────
    vidaRef.current = setInterval(() => {
      setUnidades(prev => {
        if (prev.length === 0) return prev;

        const safeUnits = prev.filter(u => u.status === 'safe');
        const warningUnits = prev.filter(u => u.status === 'warning');
        const sorteio = Math.random();

        // 1. Emergência rara (~6%)
        if (sorteio < 0.06 && safeUnits.length > 0) {
          const alvo = safeUnits[Math.floor(Math.random() * safeUnits.length)];
          const nomeEdificio = buscarNomeLocal(locaisRef.current, alvo.id_local);
          const picoGlp = 12 + Math.random() * 13;
          const picoCo = 25 + Math.random() * 30;

          // Usar setTimeout para o evento para não chamar setState dentro de setState
          setTimeout(() => {
            pushEvento(
              '🚨 ALARME — ' + nomeEdificio + ' · Apto ' + alvo.identificacao +
              ' — GLP ' + picoGlp.toFixed(1) + '% LEL · sirene ativada',
              'critical'
            );
          }, 0);

          // Auto-resolve entre 25-55s
          setTimeout(() => {
            setUnidades(p => p.map(u =>
              u.id === alvo.id
                ? { ...u, glp: parseFloat((Math.random() * 2).toFixed(2)), co: parseFloat((Math.random() * 4).toFixed(1)), status: 'safe' as StatusUnidade }
                : u
            ));
            pushEvento('✓ Situação normalizada — ' + nomeEdificio + ' · Apto ' + alvo.identificacao + ' — leitura estabilizada', 'resolved');
          }, 25000 + Math.random() * 30000);

          return prev.map(u =>
            u.id === alvo.id
              ? { ...u, glp: parseFloat(picoGlp.toFixed(2)), co: parseFloat(picoCo.toFixed(1)), status: 'critical' as StatusUnidade }
              : u
          );
        }

        // 2. Alerta (~12%)
        if (sorteio < 0.18 && safeUnits.length > 0) {
          const alvo = safeUnits[Math.floor(Math.random() * safeUnits.length)];
          const nomeEdificio = buscarNomeLocal(locaisRef.current, alvo.id_local);
          const picoGlp = 5.2 + Math.random() * 3.5;
          const picoCo = 10 + Math.random() * 8;

          setTimeout(() => {
            pushEvento(
              '⚠️ Concentração subindo — ' + nomeEdificio + ' · Apto ' + alvo.identificacao +
              ' — GLP ' + picoGlp.toFixed(1) + '% LEL',
              'warning'
            );
          }, 0);

          // Auto-resolve entre 18-40s
          setTimeout(() => {
            setUnidades(p => p.map(u =>
              u.id === alvo.id
                ? { ...u, glp: parseFloat((Math.random() * 2.5).toFixed(2)), co: parseFloat((Math.random() * 5).toFixed(1)), status: 'safe' as StatusUnidade }
                : u
            ));
            pushEvento('✓ Normalizado — ' + nomeEdificio + ' · Apto ' + alvo.identificacao, 'resolved');
          }, 18000 + Math.random() * 22000);

          return prev.map(u =>
            u.id === alvo.id
              ? { ...u, glp: parseFloat(picoGlp.toFixed(2)), co: parseFloat(picoCo.toFixed(1)), status: 'warning' as StatusUnidade }
              : u
          );
        }

        // 3. Warning escala para emergência (~4%)
        if (sorteio < 0.22 && warningUnits.length > 0) {
          const alvo = warningUnits[Math.floor(Math.random() * warningUnits.length)];
          const nomeEdificio = buscarNomeLocal(locaisRef.current, alvo.id_local);
          const picoGlp = 15 + Math.random() * 8;

          setTimeout(() => {
            pushEvento(
              '🚨 ESCALAÇÃO — ' + nomeEdificio + ' · Apto ' + alvo.identificacao +
              ' — GLP subiu para ' + picoGlp.toFixed(1) + '% LEL! Sirene ativada',
              'critical'
            );
          }, 0);

          setTimeout(() => {
            setUnidades(p => p.map(u =>
              u.id === alvo.id
                ? { ...u, glp: parseFloat((Math.random() * 1.5).toFixed(2)), co: parseFloat((Math.random() * 3).toFixed(1)), status: 'safe' as StatusUnidade }
                : u
            ));
            pushEvento('✓ Situação controlada — ' + nomeEdificio + ' · Apto ' + alvo.identificacao + ' — equipe acionada', 'resolved');
          }, 20000 + Math.random() * 25000);

          return prev.map(u =>
            u.id === alvo.id
              ? { ...u, glp: parseFloat(picoGlp.toFixed(2)), status: 'critical' as StatusUnidade }
              : u
          );
        }

        // 4. Heartbeats / Info (~15%)
        if (sorteio < 0.37 && safeUnits.length > 0) {
          const alvo = safeUnits[Math.floor(Math.random() * safeUnits.length)];
          const nomeEdificio = buscarNomeLocal(locaisRef.current, alvo.id_local);
          const msgs = [
            'Heartbeat recebido — ' + nomeEdificio + ' · Apto ' + alvo.identificacao,
            'Calibração automática concluída — ' + nomeEdificio + ' · sensor ' + alvo.identificacao,
            'Sinal Wi-Fi restabelecido — ' + nomeEdificio + ' · ' + alvo.identificacao,
            'Bateria verificada (' + alvo.bateria + '%) — ' + nomeEdificio + ' · ' + alvo.identificacao,
            'Leitura de rotina OK — ' + nomeEdificio + ' · Apto ' + alvo.identificacao + ' — ' + alvo.glp.toFixed(1) + '% LEL',
          ];
          setTimeout(() => {
            pushEvento(msgs[Math.floor(Math.random() * msgs.length)], 'info');
          }, 0);
          return prev;
        }

        // 5. Nada acontece (~63%)
        return prev;
      });
    }, 7000);

    return () => {
      socket.disconnect();
      if (simRef.current) clearInterval(simRef.current);
      if (vidaRef.current) clearInterval(vidaRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GasContext.Provider value={{ locais, unidades, eventos, carregando, recarregarDados: carregarDados }}>
      {children}
    </GasContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────
export function useGasStore() {
  const ctx = useContext(GasContext);
  if (!ctx) throw new Error('useGasStore precisa estar dentro de GasStoreProvider');
  return ctx;
}
