import { useMemo, useState, type ReactNode } from 'react';
import { useGasStore, type UnidadeData } from '../store/gasStore';
import { Building2, User, Phone, X, Activity, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { locais, unidades, eventos, carregando } = useGasStore();
  const [idUnidadeDetalhe, setIdUnidadeDetalhe] = useState<number | null>(null);

  const predioAtivo = locais[0] ?? null;
  const idAtivo = predioAtivo?.id ?? null;

  const unidadesDoLocal = useMemo(
    () => unidades.filter(u => u.id_local === idAtivo),
    [unidades, idAtivo]
  );

  // Busca a unidade do detalhe SEMPRE a partir do state mais recente
  // Isso garante que o modal atualiza em tempo real quando o simulador altera valores
  const unidadeDetalhe = idUnidadeDetalhe !== null
    ? unidades.find(u => u.id === idUnidadeDetalhe) ?? null
    : null;

  // Agrupar por andar/bloco
  const agrupamento = useMemo(() => {
    const mapa: Record<string, UnidadeData[]> = {};
    for (const u of unidadesDoLocal) {
      const chave = u.andar_ou_bloco || 'Geral';
      if (!mapa[chave]) mapa[chave] = [];
      mapa[chave].push(u);
    }
    return Object.entries(mapa).sort(([a], [b]) => a.localeCompare(b));
  }, [unidadesDoLocal]);

  // KPIs
  const totalUnidades = unidadesDoLocal.length;
  const normais = unidadesDoLocal.filter(u => u.status === 'safe').length;
  const alarmadas = unidadesDoLocal.filter(u => u.status === 'alarm').length;

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-lg">Carregando dados do painel...</span>
      </div>
    );
  }

  if (!predioAtivo) {
    return (
      <div className="text-center py-20">
        <Building2 className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Nenhuma unidade cadastrada</h2>
        <p className="text-muted-foreground">Acesse <strong>Gestão de unidades</strong> para cadastrar as unidades do prédio.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">

      {/* ── Painel Principal ────────────────────── */}
      <div className="flex-1 space-y-6">

        {/* Header + KPIs */}
        <div className="bg-card rounded-xl shadow-sm border p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Controle do edifício</h1>
              {predioAtivo.endereco && <p className="text-sm text-muted-foreground mt-1">{predioAtivo.endereco}</p>}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiCard label="Monitoradas" valor={totalUnidades} cor="text-foreground" />
            <KpiCard label="Normais" valor={normais} cor="text-green-600" />
            <KpiCard label="Alarmadas" valor={alarmadas} cor="text-red-600" />
          </div>
        </div>

        {/* Mapa por andares */}
        {agrupamento.map(([andar, units]) => (
          <div key={andar} className="bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="px-5 py-3 border-b bg-muted/30">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{andar}</h3>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {units.map(unit => (
                <button
                  key={unit.id}
                  onClick={() => setIdUnidadeDetalhe(unit.id)}
                  className={
                    'relative p-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-200 hover:scale-[1.03] cursor-pointer ' +
                    estiloStatus(unit.status)
                  }
                >
                  <span className="text-sm font-bold">{unit.identificacao}</span>
                  <span className="text-xl font-mono font-bold mt-1">MQ-9 {unit.mq9_raw}</span>
                  <span className="text-[10px] mt-1 font-semibold uppercase tracking-wider opacity-80">{traduzirStatus(unit.status)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {unidadesDoLocal.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border-2 border-dashed">
            Nenhuma unidade cadastrada.
          </div>
        )}
      </div>

      {/* ── Feed de Eventos (lateral) ──────────── */}
      <aside className="w-full lg:w-80 lg:shrink-0">
        <div className="bg-card rounded-xl shadow-sm border flex flex-col h-[600px] sticky top-6">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Feed de Eventos</h3>
            <span className="ml-auto text-xs text-muted-foreground font-mono">{eventos.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {eventos.map(ev => (
              <div key={ev.id} className="text-sm bg-background border rounded-lg p-2.5 slide-in-right">
                <div className="flex justify-between items-center mb-1">
                  <span className={
                    'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ' + badgeEvento(ev.tipo)
                  }>{labelEvento(ev.tipo)}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{ev.timestamp}</span>
                </div>
                <p className="text-foreground/90 leading-snug">{ev.mensagem}</p>
              </div>
            ))}
            {eventos.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Aguardando eventos...</p>
            )}
          </div>
        </div>
      </aside>

      {/* ── Modal Detalhe (dados em tempo real) ──── */}
      {unidadeDetalhe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setIdUnidadeDetalhe(null)}>
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden fade-in" onClick={e => e.stopPropagation()}>

            {/* Banner de status */}
            <div className={'p-4 text-center font-bold text-lg uppercase tracking-wider text-white ' + bannerStatus(unidadeDetalhe.status)}>
              {traduzirStatus(unidadeDetalhe.status)}
            </div>

            <div className="p-6 space-y-5">
              {/* Cabeçalho */}
              <div className="text-center">
                <h2 className="text-3xl font-extrabold">{unidadeDetalhe.identificacao}</h2>
                <p className="text-muted-foreground text-sm">{unidadeDetalhe.andar_ou_bloco}</p>
              </div>

              {/* Gauges */}
              <div className="grid grid-cols-1 gap-4">
                <div className={'text-center p-4 rounded-xl border transition-colors duration-300 ' + gaugeEstilo(unidadeDetalhe.status)}>
                  <span className="text-3xl font-mono font-bold">{unidadeDetalhe.mq9_raw}</span>
                  <span className="text-sm ml-1">raw</span>
                </div>
              </div>

              {/* Metadados */}
              <div className="space-y-2.5 text-sm">
                <InfoRow icon={<User className="w-4 h-4" />} label="Morador" valor={unidadeDetalhe.nome_morador} />
                <InfoRow icon={<Phone className="w-4 h-4" />} label="Contato" valor={unidadeDetalhe.contato} />
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium text-foreground">{unidadeDetalhe.device_id || 'não vinculado'}</span>
                  <span className="text-xs ml-auto">device_id</span>
                </div>
              </div>

              <button onClick={() => setIdUnidadeDetalhe(null)} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <X className="w-4 h-4" /> Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componentes auxiliares ────────────────────────────
function KpiCard({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 text-center border">
      <div className={'text-2xl font-bold font-mono ' + cor}>{valor}</div>
      <div className="text-xs text-muted-foreground font-medium mt-0.5">{label}</div>
    </div>
  );
}

function InfoRow({ icon, label, valor }: { icon: ReactNode; label: string; valor: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="font-medium text-foreground">{valor}</span>
      <span className="text-xs ml-auto">{label}</span>
    </div>
  );
}

function estiloStatus(s: string) {
  switch (s) {
    case 'safe': return 'bg-green-50 border-green-300 text-green-900';
    case 'alarm': return 'bg-red-50 border-red-500 text-red-900 pulse-critical';
    default: return 'bg-gray-100 border-gray-300 text-gray-500';
  }
}

function gaugeEstilo(s: string) {
  switch (s) {
    case 'safe': return 'bg-muted/40';
    case 'alarm': return 'bg-red-50 border-red-400 pulse-critical';
    default: return 'bg-muted/40';
  }
}

function traduzirStatus(s: string) {
  switch (s) {
    case 'safe': return 'Normal';
    case 'alarm': return 'Alarme';
    default: return 'Offline';
  }
}

function bannerStatus(s: string) {
  switch (s) {
    case 'safe': return 'bg-green-600';
    case 'alarm': return 'bg-red-600';
    default: return 'bg-gray-500';
  }
}

function badgeEvento(tipo: string) {
  switch (tipo) {
    case 'critical': return 'bg-red-500 text-white';
    case 'resolved': return 'bg-green-500 text-white';
    default: return 'bg-blue-500 text-white';
  }
}

function labelEvento(tipo: string) {
  switch (tipo) {
    case 'critical': return 'Alarme';
    case 'resolved': return 'Resolvido';
    default: return 'Info';
  }
}
