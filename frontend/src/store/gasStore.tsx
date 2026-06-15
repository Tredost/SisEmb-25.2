import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';

// ─── Tipos ───────────────────────────────────────────────
export type StatusUnidade = "safe" | "alarm" | "offline";

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
  device_id: string | null;
  bateria: number;
  sinal: number;
  mq9_raw: number;
  status: StatusUnidade;
  ultima_leitura: string;
};

export type EventoData = {
  id: string;
  timestamp: string;
  mensagem: string;
  tipo: 'critical' | 'warning' | 'resolved' | 'info';
};

type LeituraRealData = {
  device_id?: string;
  mq9_raw?: number;
  alarme_ativo?: boolean;
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

// ─── Provider ────────────────────────────────────────────
export function GasStoreProvider({ children }: { children: ReactNode }) {
  const [locais, setLocais] = useState<LocalData[]>([]);
  const [unidades, setUnidades] = useState<UnidadeData[]>([]);
  const [eventos, setEventos] = useState<EventoData[]>([]);
  const [carregando, setCarregando] = useState(true);

  const socketRef = useRef<Socket | null>(null);
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
      const unidadesData: UnidadeData[] = await resUnidades.json();

      setLocais(locaisData || []);
      locaisRef.current = locaisData || [];

      // Inicializa unidades com valores vazios/offline — aguardando leituras reais
      const unidadesIniciais: UnidadeData[] = (unidadesData || []).map(u => ({
        ...u,
        mq9_raw: 0,
        status: 'offline' as StatusUnidade,
        ultima_leitura: '',
      }));
      setUnidades(unidadesIniciais);

      if (unidadesIniciais.length > 0) {
        pushEvento('Sistema inicializado — aguardando leituras reais', 'info');
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

    socket.on('leitura_real', (dados: LeituraRealData) => {
      setUnidades(prev =>
        prev.map(unit => {
            const localDaUnidade = locaisRef.current.find(l => l.id === unit.id_local);
            if (!localDaUnidade) return unit;

            const deviceIdRecebido = dados.device_id || '';
            const deviceIdUnidade = unit.device_id || '';

            if (deviceIdRecebido && deviceIdUnidade && deviceIdRecebido === deviceIdUnidade) {
              const novoAlarme = Boolean(dados.alarme_ativo);
              const novoStatus: StatusUnidade = novoAlarme ? 'alarm' : 'safe';

              if (novoAlarme && unit.status !== 'alarm') {
                pushEvento('🚨 ALARME — ' + localDaUnidade.nome + ' · Apto ' + unit.identificacao + ' · ' + deviceIdUnidade + ' — MQ-9 ' + (dados.mq9_raw ?? 0), 'critical');
              } else if (!novoAlarme && unit.status === 'alarm') {
                pushEvento('✓ Alarme desligado — ' + localDaUnidade.nome + ' · Apto ' + unit.identificacao + ' · ' + deviceIdUnidade, 'resolved');
              }

              return {
                ...unit,
                mq9_raw: dados.mq9_raw ?? 0,
                status: novoStatus,
                ultima_leitura: new Date().toISOString(),
              };
            }
            return unit;
        })
      );
    });
    return () => {
      socket.disconnect();
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
// eslint-disable-next-line react-refresh/only-export-components
export function useGasStore() {
  const ctx = useContext(GasContext);
  if (!ctx) throw new Error('useGasStore precisa estar dentro de GasStoreProvider');
  return ctx;
}
