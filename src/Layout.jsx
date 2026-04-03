import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { 
  LayoutDashboard, 
  Building2, 
  Calendar, 
  Users, 
  FileText, 
  Settings,
  LogOut,
  ChevronDown,
  ListTodo,
  ClipboardList,
  Ticket,
  BookOpen,
  Menu,
  X,
  TrendingUp
} from 'lucide-react';
import NotificaBell from '@/components/NotificaBell';
import { Button } from '@/components/ui/button';

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const sidebarOpen = true;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [centri, setCentri] = useState([]);
  const [centroSelezionato, setCentroSelezionato] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndCentri();
  }, []);

  useEffect(() => {
    const scheduleReload = () => {
      const now = new Date();
      const next = new Date();
      next.setHours(5, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const msUntil = next - now;
      return setTimeout(() => { window.location.reload(); }, msUntil);
    };
    const t = scheduleReload();
    return () => clearTimeout(t);
  }, []);

  const loadUserAndCentri = async () => {
    try {
      const userData = await base44.auth.me();
      
      // Verifica sempre se l'utente è un direttore registrato
      const [direttori, vigilanze] = await Promise.all([
        base44.entities.Direttore.filter({ email: userData.email }),
        base44.entities.Vigilanza.filter({ email: userData.email })
      ]);
      
      if (direttori.length > 0) {
        // Questo utente è un direttore
        setDisplayName(direttori[0].full_name);
        if (userData.tipo_account !== 'direttore') {
          await base44.auth.updateMe({ 
            tipo_account: 'direttore',
            full_name: direttori[0].full_name
          });
          userData.tipo_account = 'direttore';
          userData.full_name = direttori[0].full_name;
        }
        
        // Marca l'invito come accettato
        if (!direttori[0].invito_accettato) {
          await base44.entities.Direttore.update(direttori[0].id, { invito_accettato: true });
        }
      } else if (vigilanze.length > 0) {
        // Questo utente è vigilanza
        setDisplayName(vigilanze[0].full_name);
        if (userData.tipo_account !== 'vigilanza') {
          await base44.auth.updateMe({ 
            tipo_account: 'vigilanza',
            full_name: vigilanze[0].full_name
          });
          userData.tipo_account = 'vigilanza';
          userData.full_name = vigilanze[0].full_name;
        }
        
        // Marca l'invito come accettato
        if (!vigilanze[0].invito_accettato) {
          await base44.entities.Vigilanza.update(vigilanze[0].id, { invito_accettato: true });
        }
      } else if (userData.role === 'admin') {
        // Solo gli admin della piattaforma sono proprietà
        if (userData.tipo_account !== 'proprieta') {
          await base44.auth.updateMe({ tipo_account: 'proprieta' });
          userData.tipo_account = 'proprieta';
        }
      } else {
        // Utente non autorizzato: non è direttore, vigilanza né admin
        userData.tipo_account = null;
      }
      
      setUser(userData);

      // Redirect direttore e vigilanza alla dashboard se aprono la root
      if ((userData.tipo_account === 'direttore' || userData.tipo_account === 'vigilanza') && location.pathname === '/') {
        navigate(createPageUrl('Dashboard'));
      }

      if (userData.tipo_account === 'proprieta') {
        const allCentri = await base44.entities.CentroCommerciale.list();
        setCentri(allCentri);
        if (allCentri.length > 0) {
          const savedCentroId = localStorage.getItem('centroSelezionatoId');
          const centroIniziale = allCentri.find(c => c.id === savedCentroId) || allCentri[0];
          setCentroSelezionato(centroIniziale);
        }
      } else if (userData.tipo_account === 'vigilanza') {
        const assegnazioni = await base44.entities.Assegnazione.filter({ user_email: userData.email });
        const centriIds = [...new Set(assegnazioni.map(a => a.centro_id))];
        
        if (centriIds.length > 0) {
          const allCentri = await base44.entities.CentroCommerciale.list();
          const centriAssegnati = allCentri.filter(c => centriIds.includes(c.id) && c.attivo);
          setCentri(centriAssegnati);
          if (centriAssegnati.length > 0) {
            const savedCentroId = localStorage.getItem('centroSelezionatoId');
            const centroIniziale = centriAssegnati.find(c => c.id === savedCentroId) || centriAssegnati[0];
            setCentroSelezionato(centroIniziale);
          }
        }
      } else if (userData.tipo_account === 'direttore') {
        const assegnazioni = await base44.entities.Assegnazione.filter({ user_email: userData.email });
        const centriIds = [...new Set(assegnazioni.map(a => a.centro_id))];
        
        console.log('Direttore assegnazioni:', assegnazioni);
        console.log('Centri IDs:', centriIds);
        
        if (centriIds.length > 0) {
          const allCentri = await base44.entities.CentroCommerciale.list();
          const centriAssegnati = allCentri.filter(c => centriIds.includes(c.id) && c.attivo);
          
          console.log('Centri assegnati:', centriAssegnati);
          
          setCentri(centriAssegnati);
          
          if (centriAssegnati.length > 0) {
            const savedCentroId = localStorage.getItem('centroSelezionatoId');
            const centroIniziale = centriAssegnati.find(c => c.id === savedCentroId) || centriAssegnati[0];
            console.log('Centro selezionato:', centroIniziale);
            setCentroSelezionato(centroIniziale);
          } else {
            console.log('Nessun centro attivo assegnato');
            setCentri([]);
            setCentroSelezionato(null);
          }
        } else {
          console.log('Nessuna assegnazione trovata');
          setCentri([]);
          setCentroSelezionato(null);
        }
      }
    } catch (error) {
      console.error('Errore caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCentroChange = (centro) => {
    setCentroSelezionato(centro);
    localStorage.setItem('centroSelezionatoId', centro.id);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const navigationItems = [
    { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard, roles: ['proprieta', 'direttore', 'vigilanza'] },
    { name: 'Task', page: 'Task', icon: ListTodo, roles: ['proprieta', 'direttore', 'vigilanza'] },
    { name: 'Controlli', page: 'CalendarioManutenzioni', icon: ClipboardList, roles: ['proprieta', 'direttore', 'vigilanza'] },
    { name: 'Ticket', page: 'Ticket', icon: Ticket, roles: ['proprieta', 'direttore', 'vigilanza'] },
    { name: 'Calendario Expo', page: 'Calendario', icon: Calendar, roles: ['proprieta', 'direttore', 'vigilanza'] },
    { name: 'Clienti', page: 'Clienti', icon: Users, roles: ['proprieta', 'direttore'] },
    { name: 'Spazi Expo', page: 'SpaziExpo', icon: Building2, roles: ['proprieta', 'direttore', 'vigilanza'] },
    { name: 'Report', page: 'Report', icon: BookOpen, roles: ['proprieta', 'direttore', 'vigilanza'] },
    { name: 'Capex', page: 'Capex', icon: TrendingUp, roles: ['proprieta', 'direttore', 'vigilanza'] },
  { name: 'Documenti', page: 'Documenti', icon: FileText, roles: ['proprieta', 'direttore'] },
    { name: 'Gestione', page: 'Gestione', icon: Settings, roles: ['proprieta', 'direttore'] },
  ];

  const filteredNav = navigationItems.filter(item => 
    user?.tipo_account && item.roles.includes(user.tipo_account)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <style>{`
        :root {
          --navy: #1e3a5f;
          --blue: #3b82f6;
          --green: #10b981;
        }
      `}</style>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-50 w-64 overflow-hidden transition-transform duration-200 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="https://media.base44.com/images/public/698c37dd48531465480aa3ae/7dd144918_image.png" alt="Mall Pilot" className="w-8 h-8 rounded-lg object-cover" />
                <span className="font-bold text-lg text-slate-800">Mall Pilot</span>
              </div>
              {(user?.tipo_account === 'vigilanza' || user?.tipo_account === 'direttore') && (
                <NotificaBell user={user} />
              )}
            </div>
          </div>

          {/* Centro Selector */}
          {centroSelezionato && centri.length > 0 && (
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <select
                  value={centroSelezionato.id || 'tutti'}
                  onChange={(e) => {
                    if (e.target.value === 'tutti') {
                      handleCentroChange({ id: 'tutti', nome: 'Tutti i Centri' });
                    } else {
                      const centro = centri.find(c => c.id === e.target.value);
                      handleCentroChange(centro);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  {centri.length > 1 && (
                    <option value="tutti">Tutti i Centri</option>
                  )}
                  {centri.map(centro => (
                    <option key={centro.id} value={centro.id}>
                      {centro.nome}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-1">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-slate-200">
            {sidebarOpen ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{displayName || user?.full_name}</p>
                    <p className="text-xs text-slate-500 capitalize">{user?.tipo_account}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full justify-start gap-2 text-slate-600 hover:text-red-600 hover:border-red-200"
                >
                  <LogOut className="w-4 h-4" />
                  Esci
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="w-full text-slate-600 hover:text-red-600"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 ml-0">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-30 h-16 flex items-center px-4">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-lg hover:bg-slate-100">
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <div className="ml-3">
            <h1 className="font-bold text-slate-800">Mall Pilot</h1>
          </div>
        </div>
        <div className="min-h-screen pt-16 md:pt-0">
          {!user?.tipo_account ? (
            <div className="flex items-center justify-center min-h-screen p-8">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600">Configurazione account...</p>
              </div>
            </div>
          ) : user?.tipo_account === null || user?.tipo_account === undefined ? (
            <div className="flex items-center justify-center min-h-screen p-8">
              <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-red-100">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-3">Accesso non autorizzato</h1>
                <p className="text-slate-600 mb-6">
                  Il tuo account non è stato abilitato per questa applicazione.<br />
                  Contatta la proprietà per richiedere l'accesso.
                </p>
                <button
                  onClick={() => base44.auth.logout()}
                  className="px-5 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
                >
                  Esci
                </button>
              </div>
            </div>
          ) : (
            React.cloneElement(children, { centroSelezionato, user })
          )}
        </div>
      </main>
    </div>
  );
}