import React, { useState, useMemo } from 'react';
import { useGasStore, type UnidadeData } from '../store/gasStore';
import { Building2, Battery, Wifi, User, Phone, Cpu, X, Activity, Loader2, ChevronDown } from 'lucide-react';

export default function Dashboard() {
  const { locais, unidades, eventos, carregando } = useGasStore();
  const [localSelecionado, setLocalSelecionado] = useState<number | null>(null);
  const [unidadeDetalhe, setUnidadeDetalhe] = useState<UnidadeData | null>(null);

  // Seleciona o primeiro local quando carrega
  const idAtivo = localSelecionado ?? locais[0]?.id ?? null;
  const localAtivo = locais.find(l => l.id === idAtivo);

  const unidadesDoLocal = useMemo(
    () => unidades.filter(u => u.id_local === idAtivo),
    [unidades, idAtivo]
  );

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
  const seguros = unidadesDoLocal.filter(u => u.status === 'safe').length;
  const alertas = unidadesDoLocal.filter(u => u.status === 'warning').length;
  const criticos = unidadesDoLocal.filter(u => u.status === 'critical').length;

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-lg">Carregando dados dos sensores...</span>
      </div>
    );
  }

  if (locais.length === 0) {
    return (
      <div className="text-center py-20">
        <Building2 className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Nenhum local cadastrado</h2>
        <p className="text-muted-foreground">Acesse <strong>Gestão de Locais</strong> para criar seu primeiro edifício.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">

      {/* ── Painel Principal ────────────────────── */}
      <div className="flex-1 space-y-6">

        {/* Header + Seletor + KPIs */}
        <div className="bg-card rounded-xl shadow-sm border p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Visão Geral</h1>
              {localAtivo && (
                <p className="text-sm text-muted-foreground mt-1">📍 {localAtivo.endereco}</p>
              )}
            </div>
            <div className="relative">
              <select
                className="appearance-none pl-3 pr-8 py-2 border rounded-lg bg-background text-sm font-medium min-w-[220px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                value={idAtivo ?? ''}
                onChange={e => setLocalSelecionado(Number(e.target.value))}
              >
                {locais.map(l => (
                  <option key={l.id} value={l.id}>{l.nome} ({l.tipo})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="Monitoradas" valor={totalUnidades} cor="text-foreground" />
            <KpiCard label="Seguros" valor={seguros} cor="text-green-600" />
            <KpiCard label="Em alerta" valor={alertas} cor="text-orange-500" />
            <KpiCard label="Emergência" valor={criticos} cor="text-red-600" />
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
                  onClick={() => setUnidadeDetalhe(unit)}
                  className={
                    'relative p-3 rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-200 hover:scale-[1.03] cursor-pointer ' +
                    estiloStatus(unit.status)
                  }
                >
                  <span className="text-sm font-bold">{unit.identificacao}</span>
                  <span className="text-xl font-mono font-bold mt-1">{unit.glp.toFixed(1)}%</span>
                  <span className="text-[10px] mt-1 font-semibold uppercase tracking-wider opacity-80">{traduzirStatus(unit.status)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {unidadesDoLocal.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border-2 border-dashed">
            Nenhuma unidade cadastrada neste local.
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

      {/* ── Modal Detalhe ──────────────────────── */}
      {unidadeDetalhe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setUnidadeDetalhe(null)}>
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden fade-in" onClick={e => e.stopPropagation()}>
            
            {/* Banner de status */}
            <div className={'p-4 text-center font-bold text-lg uppercase tracking-wider text-white ' + bannerStatus(unidadeDetalhe.status)}>
              {traduzirStatus(unidadeDetalhe.status)}
            </div>

            <div className="p-6 space-y-5">
              {/* Cabeçalho */}
              <div className="text-center">
                <h2 className="text-3xl font-extrabold">{unidadeDetalhe.identificacao}</h2>
                <p className="text-muted-foreground text-sm">{unidadeDetalhe.andar_ou_bloco} · {localAtivo?.nome}</p>
              </div>

              {/* Gauges */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/40 rounded-xl border">
                  <span className="text-3xl font-mono font-bold">{unidadeDetalhe.glp.toFixed(1)}</span>
                  <span className="text-sm ml-1">% LEL</span>
                  <p className="text-xs text-muted-foreground mt-1">GLP</p>
                </div>
                <div className="text-center p-4 bg-muted/40 rounded-xl border">
                  <span className="text-3xl font-mono font-bold">{unidadeDetalhe.co.toFixed(0)}</span>
                  <span className="text-sm ml-1">ppm</span>
                  <p className="text-xs text-muted-foreground mt-1">CO</p>
                </div>
              </div>

              {/* Metadados */}
              <div className="space-y-2.5 text-sm">
                <InfoRow icon={<User className="w-4 h-4" />} label="Morador" valor={unidadeDetalhe.nome_morador} />
                <InfoRow icon={<Phone className="w-4 h-4" />} label="Contato" valor={unidadeDetalhe.contato} />
                <InfoRow icon={<Cpu className="w-4 h-4" />} label="Sensor" valor={unidadeDetalhe.dispositivo_instalado} />
                <div className="flex gap-4">
                  <InfoRow icon={<Battery className="w-4 h-4 text-green-500" />} label="Bateria" valor={unidadeDetalhe.bateria + '%'} />
                  <InfoRow icon={<Wifi className="w-4 h-4 text-blue-500" />} label="Sinal" valor={unidadeDetalhe.sinal + '%'} />
                </div>
              </div>

              <button onClick={() => setUnidadeDetalhe(null)} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
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

function InfoRow({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: string }) {
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
    case 'warning': return 'bg-amber-50 border-amber-400 text-amber-900';
    case 'critical': return 'bg-red-50 border-red-500 text-red-900 pulse-critical';
    default: return 'bg-gray-100 border-gray-300 text-gray-500';
  }
}

function traduzirStatus(s: string) {
  switch (s) {
    case 'safe': return 'Seguro';
    case 'warning': return 'Alerta';
    case 'critical': return 'Emergência';
    default: return 'Offline';
  }
}

function bannerStatus(s: string) {
  switch (s) {
    case 'safe': return 'bg-green-600';
    case 'warning': return 'bg-amber-500';
    case 'critical': return 'bg-red-600';
    default: return 'bg-gray-500';
  }
}

function badgeEvento(tipo: string) {
  switch (tipo) {
    case 'critical': return 'bg-red-500 text-white';
    case 'warning': return 'bg-amber-500 text-white';
    case 'resolved': return 'bg-green-500 text-white';
    default: return 'bg-blue-500 text-white';
  }
}

function labelEvento(tipo: string) {
  switch (tipo) {
    case 'critical': return 'Emergência';
    case 'warning': return 'Alerta';
    case 'resolved': return 'Resolvido';
    default: return 'Info';
  }
}
