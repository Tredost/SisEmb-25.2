import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Home, Phone, Plus, Trash2, User } from 'lucide-react';

const URL_API = 'http://localhost:3001';

type Local = { id: number; nome: string; tipo: string; endereco: string };
type Unidade = {
  id: number;
  id_local: number;
  identificacao: string;
  andar_ou_bloco: string;
  nome_morador: string;
  contato: string;
  dispositivo_instalado: string;
  device_id: string | null;
};

const FORM_INICIAL = {
  identificacao: '',
  andar_ou_bloco: '',
  nome_morador: '',
  contato: '',
  device_id: '',
};

export default function GestaoLocais() {
  const [idLocalPadrao, setIdLocalPadrao] = useState<number | null>(null);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editandoDeviceId, setEditandoDeviceId] = useState<Record<number, string>>({});
  const [formUni, setFormUni] = useState(FORM_INICIAL);

  const carregarUnidades = useCallback((idLocal: number) => {
    fetch(URL_API + '/api/unidades/local/' + idLocal)
      .then(r => r.json())
      .then(d => setUnidades(d || []))
      .catch(() => toast.error('Não foi possível carregar as unidades.'));
  }, []);

  const carregarLocalPadrao = useCallback(async () => {
    try {
      const locais: Local[] = await fetch(URL_API + '/api/locais').then(r => r.json());
      let localPadrao = locais?.[0] ?? null;

      if (!localPadrao) {
        localPadrao = await fetch(URL_API + '/api/locais', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: 'Edifício', tipo: 'Edifício', endereco: '' }),
        }).then(r => r.json());
      }

      setIdLocalPadrao(localPadrao.id);
      carregarUnidades(localPadrao.id);
    } catch {
      toast.error('Não foi possível preparar a gestão de unidades.');
    } finally {
      setCarregando(false);
    }
  }, [carregarUnidades]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarLocalPadrao();
  }, [carregarLocalPadrao]);

  const addUnidade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idLocalPadrao) return toast.error('Cadastro de unidades ainda não carregado.');

    const res = await fetch(URL_API + '/api/unidades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_local: idLocalPadrao,
        identificacao: formUni.identificacao,
        andar_ou_bloco: formUni.andar_ou_bloco,
        nome_morador: formUni.nome_morador,
        contato: formUni.contato,
        dispositivo_instalado: '',
        device_id: formUni.device_id,
      }),
    });

    if (res.ok) {
      toast.success('Unidade adicionada.');
      setFormUni(FORM_INICIAL);
      carregarUnidades(idLocalPadrao);
    } else {
      toast.error('Não foi possível adicionar a unidade.');
    }
  };

  const deleteUnidade = async (id: number) => {
    await fetch(URL_API + '/api/unidades/' + id, { method: 'DELETE' });
    if (idLocalPadrao) carregarUnidades(idLocalPadrao);
    toast.success('Unidade removida.');
  };

  const salvarDeviceId = async (id: number) => {
    const device_id = editandoDeviceId[id] ?? '';
    const res = await fetch(URL_API + '/api/unidades/' + id + '/device-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id }),
    });

    if (res.ok) {
      toast.success('Device ID atualizado.');
      if (idLocalPadrao) carregarUnidades(idLocalPadrao);
    } else {
      toast.error('Não foi possível atualizar o device_id.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Gestão de unidades</h1>
          <p className="text-sm text-muted-foreground mt-1">Cadastro e vínculo das unidades monitoradas pelo painel.</p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
          {unidades.length} unidade{unidades.length === 1 ? '' : 's'} cadastrada{unidades.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <form onSubmit={addUnidade} className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 border-b">
          <input required placeholder="Unidade (302)" className="px-3 py-2 rounded-lg border bg-background text-sm" value={formUni.identificacao} onChange={e => setFormUni({ ...formUni, identificacao: e.target.value })} />
          <input required placeholder="Andar/Bloco (3º andar)" className="px-3 py-2 rounded-lg border bg-background text-sm" value={formUni.andar_ou_bloco} onChange={e => setFormUni({ ...formUni, andar_ou_bloco: e.target.value })} />
          <input required placeholder="Nome do morador" className="px-3 py-2 rounded-lg border bg-background text-sm" value={formUni.nome_morador} onChange={e => setFormUni({ ...formUni, nome_morador: e.target.value })} />
          <input required placeholder="Contato" className="px-3 py-2 rounded-lg border bg-background text-sm" value={formUni.contato} onChange={e => setFormUni({ ...formUni, contato: e.target.value })} />
          <input placeholder="device_id (ex: esp32-sala)" className="px-3 py-2 rounded-lg border bg-background text-sm sm:col-span-2" value={formUni.device_id} onChange={e => setFormUni({ ...formUni, device_id: e.target.value })} />
          <button type="submit" disabled={carregando || !idLocalPadrao} className="sm:col-span-2 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Adicionar unidade
          </button>
        </form>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[550px] overflow-y-auto">
          {unidades.map(u => (
            <div key={u.id} className="p-3 bg-background border rounded-lg flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-muted-foreground" />
                  {u.identificacao}
                  <span className="font-normal text-xs text-muted-foreground">({u.andar_ou_bloco})</span>
                </div>
                <div className="text-sm mt-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-muted-foreground" /> {u.nome_morador}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {u.contato}</div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    placeholder="device_id"
                    className="w-full px-2 py-1 rounded border bg-background text-xs"
                    value={editandoDeviceId[u.id] ?? (u.device_id || '')}
                    onChange={e => setEditandoDeviceId({ ...editandoDeviceId, [u.id]: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => salvarDeviceId(u.id)}
                    className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
                  >
                    Salvar
                  </button>
                </div>
                <div className="text-xs text-muted-foreground mt-1">ID vinculado: {u.device_id || 'sem device_id'}</div>
              </div>
              <button onClick={() => deleteUnidade(u.id)} className="text-destructive hover:bg-destructive/10 p-1.5 rounded shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {!carregando && unidades.length === 0 && (
            <div className="sm:col-span-2 text-center py-8 text-muted-foreground text-sm">Nenhuma unidade cadastrada.</div>
          )}
        </div>
      </div>
    </div>
  );
}
