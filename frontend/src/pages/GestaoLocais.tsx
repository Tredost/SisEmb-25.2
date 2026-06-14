import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Building2, Home, Warehouse } from 'lucide-react';

const URL_API = 'http://localhost:3001';

type Local = { id: number; nome: string; tipo: string; endereco: string };
type Unidade = { id: number; id_local: number; identificacao: string; andar_ou_bloco: string; nome_morador: string; contato: string; dispositivo_instalado: string };

export default function GestaoLocais() {
  const [locais, setLocais] = useState<Local[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [localSel, setLocalSel] = useState<number | null>(null);

  const [formLocal, setFormLocal] = useState({ nome: '', tipo: 'Edifício', endereco: '' });
  const [formUni, setFormUni] = useState({ identificacao: '', andar_ou_bloco: '', nome_morador: '', contato: '', dispositivo_instalado: 'MQ-9 + ESP32' });

  const carregarLocais = useCallback(() => {
    fetch(URL_API + '/api/locais').then(r => r.json()).then(d => setLocais(d || [])).catch(() => {});
  }, []);

  const carregarUnidades = useCallback((id: number) => {
    fetch(URL_API + '/api/unidades/local/' + id).then(r => r.json()).then(d => setUnidades(d || [])).catch(() => {});
  }, []);

  useEffect(() => { carregarLocais(); }, [carregarLocais]);
  useEffect(() => { if (localSel) carregarUnidades(localSel); else setUnidades([]); }, [localSel, carregarUnidades]);

  const addLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(URL_API + '/api/locais', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formLocal) });
    if (res.ok) { toast.success('Local adicionado!'); setFormLocal({ nome: '', tipo: 'Edifício', endereco: '' }); carregarLocais(); }
  };

  const deleteLocal = async (id: number) => {
    if (!confirm('Excluir este local e TODAS as suas unidades?')) return;
    await fetch(URL_API + '/api/locais/' + id, { method: 'DELETE' });
    if (localSel === id) setLocalSel(null);
    carregarLocais();
    toast.success('Local removido.');
  };

  const addUnidade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localSel) return toast.error('Selecione um local.');
    const res = await fetch(URL_API + '/api/unidades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formUni, id_local: localSel }) });
    if (res.ok) { toast.success('Unidade adicionada!'); setFormUni({ identificacao: '', andar_ou_bloco: '', nome_morador: '', contato: '', dispositivo_instalado: 'MQ-9 + ESP32' }); carregarUnidades(localSel); }
  };

  const deleteUnidade = async (id: number) => {
    await fetch(URL_API + '/api/unidades/' + id, { method: 'DELETE' });
    if (localSel) carregarUnidades(localSel);
    toast.success('Unidade removida.');
  };

  const icone = (tipo: string) => {
    if (tipo.includes('Condom')) return <Home className="w-4 h-4" />;
    if (tipo.includes('Resid')) return <Warehouse className="w-4 h-4" />;
    return <Building2 className="w-4 h-4" />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Gestão de Cadastros</h1>
        <p className="text-sm text-muted-foreground mt-1">Adicione ou remova edifícios, condomínios, residências e suas unidades.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Coluna: Locais ── */}
        <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 font-semibold text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Locais</div>

          <form onSubmit={addLocal} className="p-4 space-y-2 border-b">
            <input required placeholder="Nome (Ex: Edifício Aurora)" className="w-full px-3 py-2 rounded-lg border bg-background text-sm" value={formLocal.nome} onChange={e => setFormLocal({ ...formLocal, nome: e.target.value })} />
            <select className="w-full px-3 py-2 rounded-lg border bg-background text-sm" value={formLocal.tipo} onChange={e => setFormLocal({ ...formLocal, tipo: e.target.value })}>
              <option>Edifício</option><option>Condomínio</option><option>Residência</option>
            </select>
            <input required placeholder="Endereço Completo" className="w-full px-3 py-2 rounded-lg border bg-background text-sm" value={formLocal.endereco} onChange={e => setFormLocal({ ...formLocal, endereco: e.target.value })} />
            <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 hover:opacity-90"><Plus className="w-4 h-4" /> Adicionar</button>
          </form>

          <div className="max-h-[400px] overflow-y-auto">
            {locais.map(l => (
              <div
                key={l.id}
                onClick={() => setLocalSel(l.id)}
                className={'flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-b last:border-0 ' + (localSel === l.id ? 'bg-secondary/10 border-l-4 border-l-secondary' : 'hover:bg-muted/50')}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {icone(l.tipo)}
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{l.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">{l.endereco}</div>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteLocal(l.id); }} className="text-destructive hover:bg-destructive/10 p-1.5 rounded shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            {locais.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhum local.</p>}
          </div>
        </div>

        {/* ── Coluna: Unidades ── */}
        <div className="lg:col-span-2 bg-card rounded-xl shadow-sm border overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 font-semibold text-sm flex items-center gap-2"><Home className="w-4 h-4" /> Unidades {localSel && <span className="text-muted-foreground font-normal">· {locais.find(l => l.id === localSel)?.nome}</span>}</div>

          {!localSel ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Selecione um local à esquerda.</div>
          ) : (
            <>
              <form onSubmit={addUnidade} className="p-4 grid grid-cols-2 gap-2 border-b">
                <input required placeholder="Apto/Casa (302)" className="px-3 py-2 rounded-lg border bg-background text-sm" value={formUni.identificacao} onChange={e => setFormUni({ ...formUni, identificacao: e.target.value })} />
                <input required placeholder="Andar/Bloco (3 Andar)" className="px-3 py-2 rounded-lg border bg-background text-sm" value={formUni.andar_ou_bloco} onChange={e => setFormUni({ ...formUni, andar_ou_bloco: e.target.value })} />
                <input required placeholder="Nome do Morador" className="px-3 py-2 rounded-lg border bg-background text-sm" value={formUni.nome_morador} onChange={e => setFormUni({ ...formUni, nome_morador: e.target.value })} />
                <input required placeholder="Contato" className="px-3 py-2 rounded-lg border bg-background text-sm" value={formUni.contato} onChange={e => setFormUni({ ...formUni, contato: e.target.value })} />
                <input required placeholder="Sensor Instalado" className="px-3 py-2 rounded-lg border bg-background text-sm col-span-2" value={formUni.dispositivo_instalado} onChange={e => setFormUni({ ...formUni, dispositivo_instalado: e.target.value })} />
                <button type="submit" className="col-span-2 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 hover:opacity-90"><Plus className="w-4 h-4" /> Adicionar Unidade</button>
              </form>

              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto">
                {unidades.map(u => (
                  <div key={u.id} className="p-3 bg-background border rounded-lg flex justify-between items-start">
                    <div className="min-w-0">
                      <div className="font-bold">{u.identificacao} <span className="font-normal text-xs text-muted-foreground">({u.andar_ou_bloco})</span></div>
                      <div className="text-sm mt-0.5">👤 {u.nome_morador}</div>
                      <div className="text-xs text-muted-foreground">📱 {u.contato} · 📡 {u.dispositivo_instalado}</div>
                    </div>
                    <button onClick={() => deleteUnidade(u.id)} className="text-destructive hover:bg-destructive/10 p-1.5 rounded shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {unidades.length === 0 && <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">Nenhuma unidade neste local.</div>}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
