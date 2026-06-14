import React, { useState } from 'react';
import { useGasStore } from '../store/gasStore';
import { AlertTriangle, Info, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const FILTROS = [
  { key: 'todos', label: 'Todos' },
  { key: 'critical', label: 'Emergência' },
  { key: 'warning', label: 'Alertas' },
  { key: 'resolved', label: 'Resolvidos' },
  { key: 'info', label: 'Info' },
] as const;

type FiltroKey = (typeof FILTROS)[number]['key'];

export default function Alertas() {
  const { eventos, carregando } = useGasStore();
  const [filtro, setFiltro] = useState<FiltroKey>('todos');

  const eventosFiltrados = filtro === 'todos' ? eventos : eventos.filter(ev => ev.tipo === filtro);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Central de Alertas</h1>
        <p className="text-muted-foreground text-sm mt-1">Histórico global de todos os eventos registrados.</p>
      </div>

      {/* Tabs de filtro */}
      <div className="flex gap-2 flex-wrap">
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors ' +
              (filtro === f.key
                ? corBotaoAtivo(f.key)
                : 'bg-muted text-muted-foreground hover:bg-muted/80')
            }
          >{f.label}</button>
        ))}
      </div>

      {/* Lista de eventos */}
      <div className="space-y-3">
        {eventosFiltrados.map(ev => (
          <div key={ev.id} className={'flex items-start gap-3 p-4 rounded-xl shadow-sm border bg-card border-l-4 transition-all hover:-translate-y-0.5 hover:shadow-md ' + bordaEvento(ev.tipo)}>
            <div className="mt-0.5 shrink-0">{iconeEvento(ev.tipo)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-foreground text-sm">{labelEvento(ev.tipo)}</span>
                <span className="text-xs text-muted-foreground font-mono shrink-0 ml-2">{ev.timestamp}</span>
              </div>
              <p className="text-foreground/85 text-sm leading-relaxed">{ev.mensagem}</p>
            </div>
          </div>
        ))}

        {eventosFiltrados.length === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border-2 border-dashed">
            Nenhum evento para o filtro selecionado.
          </div>
        )}
      </div>
    </div>
  );
}

function iconeEvento(tipo: string) {
  switch (tipo) {
    case 'critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
    case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    case 'resolved': return <CheckCircle className="w-5 h-5 text-green-500" />;
    default: return <Info className="w-5 h-5 text-blue-500" />;
  }
}

function bordaEvento(tipo: string) {
  switch (tipo) {
    case 'critical': return 'border-l-red-500';
    case 'warning': return 'border-l-amber-500';
    case 'resolved': return 'border-l-green-500';
    default: return 'border-l-blue-500';
  }
}

function labelEvento(tipo: string) {
  switch (tipo) {
    case 'critical': return 'Emergência';
    case 'warning': return 'Atenção';
    case 'resolved': return 'Resolvido';
    default: return 'Informação';
  }
}

function corBotaoAtivo(key: string) {
  switch (key) {
    case 'critical': return 'bg-red-500 text-white';
    case 'warning': return 'bg-amber-500 text-white';
    case 'resolved': return 'bg-green-500 text-white';
    case 'info': return 'bg-blue-500 text-white';
    default: return 'bg-primary text-primary-foreground';
  }
}
