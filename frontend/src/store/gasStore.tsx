import React, { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
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
  // Propriedades calculadas em tempo real pelo simulador
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

// ─── Provider ────────────────────────────────────────────
export function GasStoreProvider({ children }: { children: ReactNode }) {
  const [locais, setLocais] = useState<LocalData[]>([]);
  const [unidades, setUnidades] = useState<UnidadeData[]>([]);
  const [eventos, setEventos] = useState<EventoData[]>([]);
  const [carregando, setCarregando] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vidaRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dadosCarregados = useRef(false);

  // Gera um ID curto para eventos
  const gerarId = () => Math.random().toString(36).substring(2, 11);

  // Adiciona um evento no feed (máximo 80)
  const addEvento = useCallback((mensagem: string, tipo: EventoData['tipo']) => {
    setEventos(prev => {
      const novo: EventoData = {
        id: gerarId(),
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        mensagem,
        tipo,
      };
      return [novo, ...prev].slice(0, 80);
    });
  }, []);

  // Carrega dados do banco
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
        addEvento('Sistema inicializado — ' + unidadesVivas.length + ' sensores online', 'info');
      }
    } catch {
      addEvento('Erro ao conectar com o servidor backend', 'critical');
    } finally {
      setCarregando(false);
    }
  }, [addEvento]);

  useEffect(() => {
    if (dadosCarregados.current) return;
    dadosCarregados.current = true;

    carregarDados();

    // Socket.io para dados reais do MQTT
    const socket = io(URL_API);
    socketRef.current = socket;

    socket.on('connect', () => {
      addEvento('Ponte MQTT conectada ao backend', 'info');
    });

    socket.on('leitura_real', (dados: any) => {
      setUnidades(prev =>
        prev.map(unit => {
          // Verifica se esta unidade é a mapeada como real
          const localDaUnidade = locais.find(l => l.id === unit.id_local);
          if (!localDaUnidade) return unit;

          const nomeLocal = localDaUnidade.nome.toLowerCase();
          const edificioConfig = (dados.configuracao_real?.edificio_real || '').toLowerCase();
          const unidadeConfig = dados.configuracao_real?.unidade_real || '';

          if (nomeLocal.includes(edificioConfig) && unit.identificacao === unidadeConfig) {
            let novoStatus: StatusUnidade = 'safe';
            if (dados.glp_lel >= 10 || dados.alarme_ativo) novoStatus = 'critical';
            else if (dados.glp_lel >= 5) novoStatus = 'warning';

            if (novoStatus === 'critical' && unit.status !== 'critical') {
              addEvento('🚨 ALARME REAL — ' + localDaUnidade.nome + ' Apto ' + unit.identificacao + ' — GLP ' + dados.glp_lel.toFixed(1) + '% LEL', 'critical');
            } else if (novoStatus === 'warning' && unit.status === 'safe') {
              addEvento('⚠️ Concentração subindo — ' + localDaUnidade.nome + ' Apto ' + unit.identificacao, 'warning');
            }

            return {
              ...unit,
              glp: dados.glp_lel,
              status: novoStatus,
              ultima_leitura: new Date().toISOString(),
            };
          }
          return unit;
        })
      );
    });

    // Timer 1: Flutuação ambiente a cada 5s (random walk suave)
    simRef.current = setInterval(() => {
      setUnidades(prev =>
        prev.map(unit => {
          if (unit.status !== 'safe') return unit;
          const deltaGlp = (Math.random() - 0.5) * 0.4;
          const deltaCo = (Math.random() - 0.5) * 0.6;
          const novoGlp = Math.max(0, Math.min(4.9, unit.glp + deltaGlp));
          const novoCo = Math.max(0, Math.min(8, unit.co + deltaCo));
          return {
            ...unit,
            glp: parseFloat(novoGlp.toFixed(2)),
            co: parseFloat(novoCo.toFixed(1)),
            ultima_leitura: new Date().toISOString(),
          };
        })
      );
    }, 5000);

    // Timer 2: Vida própria a cada 12s (picos espontâneos)
    vidaRef.current = setInterval(() => {
      setUnidades(prev => {
        const safeUnits = prev.filter(u => u.status === 'safe');
        if (safeUnits.length === 0) return prev;

        const sorteio = Math.random();
        if (sorteio > 0.35) return prev; // 65% das vezes, nada acontece

        const alvo = safeUnits[Math.floor(Math.random() * safeUnits.length)];

        if (sorteio < 0.08) {
          // Emergência rara (8%)
          const picoGlp = 12 + Math.random() * 10;
          addEvento('🚨 ALARME — Apto ' + alvo.identificacao + ' — GLP ' + picoGlp.toFixed(1) + '% LEL · sirene ativada', 'critical');
          
          // Auto-resolve entre 30-50s
          setTimeout(() => {
            setUnidades(p => p.map(u => u.id === alvo.id ? { ...u, glp: parseFloat((Math.random() * 2).toFixed(2)), co: parseFloat((Math.random() * 4).toFixed(1)), status: 'safe' as StatusUnidade } : u));
            addEvento('✓ Situação normalizada — Apto ' + alvo.identificacao, 'resolved');
          }, 30000 + Math.random() * 20000);

          return prev.map(u => u.id === alvo.id ? { ...u, glp: parseFloat(picoGlp.toFixed(2)), status: 'critical' as StatusUnidade } : u);
        } else if (sorteio < 0.22) {
          // Alerta (14%)
          const picoGlp = 5.5 + Math.random() * 3;
          addEvento('⚠️ Concentração subindo — Apto ' + alvo.identificacao + ' — GLP ' + picoGlp.toFixed(1) + '% LEL', 'warning');

          setTimeout(() => {
            setUnidades(p => p.map(u => u.id === alvo.id ? { ...u, glp: parseFloat((Math.random() * 3).toFixed(2)), status: 'safe' as StatusUnidade } : u));
            addEvento('✓ Normalizado — Apto ' + alvo.identificacao, 'resolved');
          }, 20000 + Math.random() * 15000);

          return prev.map(u => u.id === alvo.id ? { ...u, glp: parseFloat(picoGlp.toFixed(2)), status: 'warning' as StatusUnidade } : u);
        } else {
          // Evento info (13%)
          const msgs = [
            'Heartbeat recebido — Apto ' + alvo.identificacao,
            'Calibração automática — sensor ' + alvo.identificacao,
            'Sinal Wi-Fi restabelecido — ' + alvo.identificacao,
          ];
          addEvento(msgs[Math.floor(Math.random() * msgs.length)], 'info');
          return prev;
        }
      });
    }, 12000);

    return () => {
      socket.disconnect();
      if (simRef.current) clearInterval(simRef.current);
      if (vidaRef.current) clearInterval(vidaRef.current);
    };
  }, []); // Roda UMA vez

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
