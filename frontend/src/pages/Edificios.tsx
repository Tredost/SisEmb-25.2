import { useMemo } from 'react';
import { useGasStore } from '../store/gasStore';
import { Building2, Home, Warehouse, Loader2 } from 'lucide-react';

export default function Edificios() {
  const { locais, unidades, carregando } = useGasStore();

  const locaisComStatus = useMemo(() => {
    return locais.map(local => {
      const units = unidades.filter(u => u.id_local === local.id);
      return {
        ...local,
        total: units.length,
        seguros: units.filter(u => u.status === 'safe').length,
        alertas: units.filter(u => u.status === 'warning').length,
        criticos: units.filter(u => u.status === 'critical').length,
        statusAgregado: units.some(u => u.status === 'critical') ? 'critical' : units.some(u => u.status === 'warning') ? 'warning' : 'safe',
      };
    });
  }, [locais, unidades]);

  const icone = (tipo: string) => {
    if (tipo.toLowerCase().includes('condomin')) return <Home className="w-7 h-7 text-blue-600" />;
    if (tipo.toLowerCase().includes('residen')) return <Warehouse className="w-7 h-7 text-emerald-600" />;
    return <Building2 className="w-7 h-7 text-primary" />;
  };

  const barraCor = (s: string) => {
    if (s === 'critical') return 'bg-red-500';
    if (s === 'warning') return 'bg-amber-500';
    return 'bg-green-500';
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Locais Monitorados</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão agregada de todos os edifícios, condomínios e residências.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {locaisComStatus.map(local => (
          <div key={local.id} className="bg-card rounded-xl shadow-sm border overflow-hidden transition-transform hover:scale-[1.02] hover:shadow-md">
            <div className={'h-1.5 w-full ' + barraCor(local.statusAgregado)} />
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground leading-tight">{local.nome}</h3>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{local.tipo}</span>
                </div>
                {icone(local.tipo)}
              </div>
              <p className="text-sm text-muted-foreground mb-4 truncate" title={local.endereco}>📍 {local.endereco}</p>

              <div className="grid grid-cols-3 gap-2 text-center text-sm border-t pt-3">
                <div>
                  <span className="block text-lg font-bold text-green-600 font-mono">{local.seguros}</span>
                  <span className="text-[11px] text-muted-foreground">Seguros</span>
                </div>
                <div className="border-l border-r">
                  <span className="block text-lg font-bold text-amber-500 font-mono">{local.alertas}</span>
                  <span className="text-[11px] text-muted-foreground">Alertas</span>
                </div>
                <div>
                  <span className="block text-lg font-bold text-red-600 font-mono">{local.criticos}</span>
                  <span className="text-[11px] text-muted-foreground">Perigo</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {locais.length === 0 && (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border-2 border-dashed">
          Nenhum local cadastrado ainda.
        </div>
      )}
    </div>
  );
}
