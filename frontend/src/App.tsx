import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { GasStoreProvider } from './store/gasStore';
import { Toaster } from 'sonner';
import { Flame, Building2, Bell, Settings, MapPin } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Edificios from './pages/Edificios';
import Alertas from './pages/Alertas';
import Configuracoes from './pages/Configuracoes';
import GestaoLocais from './pages/GestaoLocais';

const itensMenu = [
  { to: '/', label: 'Visão Geral', icon: Flame },
  { to: '/edificios', label: 'Edifícios', icon: Building2 },
  { to: '/alertas', label: 'Alertas', icon: Bell },
  { to: '/config', label: 'Configuração MQTT', icon: Settings },
  { to: '/cadastros', label: 'Gestão de Locais', icon: MapPin },
];

function App() {
  return (
    <GasStoreProvider>
      <BrowserRouter>
        <Toaster richColors position="top-right" />
        <div className="min-h-screen bg-background text-foreground flex flex-col">

          {/* ── Navbar ─────────────────────────────── */}
          <header className="bg-primary text-primary-foreground shadow-lg">
            <div className="max-w-[1440px] mx-auto px-4 h-14 flex items-center gap-1">
              {/* Logo */}
              <NavLink to="/" className="flex items-center gap-2 mr-6 font-extrabold text-lg tracking-tight">
                <Flame className="w-5 h-5 text-orange-400" />
                GasShield
              </NavLink>

              {/* Links */}
              <nav className="flex items-center gap-1 overflow-x-auto">
                {itensMenu.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ' +
                      (isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10')
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </header>

          {/* ── Conteúdo ───────────────────────────── */}
          <main className="flex-1 max-w-[1440px] w-full mx-auto p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/edificios" element={<Edificios />} />
              <Route path="/alertas" element={<Alertas />} />
              <Route path="/config" element={<Configuracoes />} />
              <Route path="/cadastros" element={<GestaoLocais />} />
            </Routes>
          </main>

        </div>
      </BrowserRouter>
    </GasStoreProvider>
  );
}

export default App;
