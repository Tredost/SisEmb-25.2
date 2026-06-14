import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, RefreshCw } from 'lucide-react';

const URL_API = 'http://localhost:3001';

type ConfigBroker = {
  broker_url: string;
  broker_porta: number;
  topico: string;
  edificio_real: string;
  unidade_real: string;
};

export default function Configuracoes() {
  const [config, setConfig] = useState<ConfigBroker>({
    broker_url: 'broker.hivemq.com',
    broker_porta: 1883,
    topico: 'ianes/gasshield/dispositivos/+/status',
    edificio_real: 'Aurora',
    unidade_real: '302',
  });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch(URL_API + '/api/config')
      .then(res => res.json())
      .then(data => { if (data && data.broker_url) setConfig(data); })
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: name === 'broker_porta' ? Number(value) : value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await fetch(URL_API + '/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.sucesso) {
        toast.success('Configurações salvas — MQTT reiniciado!');
      } else {
        toast.error('Erro ao salvar.');
      }
    } catch {
      toast.error('Falha na conexão com o servidor.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/30">
          <h1 className="text-xl font-bold">Configuração do Broker MQTT</h1>
          <p className="text-sm text-muted-foreground mt-1">Defina o broker, tópico e qual sensor físico será mapeado no painel.</p>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="URL do Broker" name="broker_url" value={config.broker_url} onChange={handleChange} placeholder="broker.hivemq.com" />
            <Campo label="Porta" name="broker_porta" value={String(config.broker_porta)} onChange={handleChange} type="number" />
          </div>

          <Campo label="Tópico de Inscrição" name="topico" value={config.topico} onChange={handleChange} placeholder="ianes/gasshield/dispositivos/+/status" />

          <div className="pt-4 border-t space-y-4">
            <div>
              <h3 className="font-semibold text-sm">Mapeamento de Sensor Real</h3>
              <p className="text-xs text-muted-foreground mt-1">Defina qual unidade no Dashboard receberá os dados reais do ESP32. As demais serão simuladas.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo label="Nome do Local (parte)" name="edificio_real" value={config.edificio_real} onChange={handleChange} placeholder="Aurora" />
              <Campo label="Nº do Apto/Casa" name="unidade_real" value={config.unidade_real} onChange={handleChange} placeholder="302" />
            </div>
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {salvando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {salvando ? 'Salvando...' : 'Salvar e Reiniciar MQTT'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Campo({ label, name, value, onChange, placeholder, type = 'text' }: {
  label: string; name: string; value: string; onChange: React.ChangeEventHandler<HTMLInputElement>; placeholder?: string; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <input
        required
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
      />
    </div>
  );
}
