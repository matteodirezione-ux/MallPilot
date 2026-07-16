import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './Layout';

// Page imports
import Calendario from './pages/Calendario';
import CalendarioVigilanza from './pages/CalendarioVigilanza';
import Dashboard from './pages/Dashboard';
import Clienti from './pages/Clienti';
import CapexPage from './pages/Capex';
import Documenti from './pages/Documenti';
import Gestione from './pages/Gestione';
import Marketing from './pages/Marketing';
import Fornitori from './pages/Fornitori';
import Pulizie from './pages/Pulizie';
import SpaziExpo from './pages/SpaziExpo';
import Report from './pages/Report';
import Ticket from './pages/Ticket';
import TaskPage from './pages/Task';
import CalendarioManutenzioni from './pages/CalendarioManutenzioni';
import StorageReport from './pages/StorageReport';
import TenantPage from './pages/Tenant';
import Corrispettivi from './pages/Corrispettivi';
import LetturaContatori from './pages/LetturaContatori';
import Utenze from './pages/Utenze';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/Calendario" element={<Layout currentPageName="Calendario"><Calendario /></Layout>} />
      <Route path="/CalendarioVigilanza" element={<Layout currentPageName="CalendarioVigilanza"><CalendarioVigilanza /></Layout>} />
      <Route path="/" element={<Layout currentPageName="Dashboard"><Dashboard /></Layout>} />
      <Route path="/Dashboard" element={<Layout currentPageName="Dashboard"><Dashboard /></Layout>} />
      <Route path="/Clienti" element={<Layout currentPageName="Clienti"><Clienti /></Layout>} />
      <Route path="/Capex" element={<Layout currentPageName="Capex"><CapexPage /></Layout>} />
      <Route path="/Documenti" element={<Layout currentPageName="Documenti"><Documenti /></Layout>} />
      <Route path="/Gestione" element={<Layout currentPageName="Gestione"><Gestione /></Layout>} />
      <Route path="/Marketing" element={<Layout currentPageName="Marketing"><Marketing /></Layout>} />
      <Route path="/Fornitori" element={<Layout currentPageName="Fornitori"><Fornitori /></Layout>} />
      <Route path="/Pulizie" element={<Layout currentPageName="Pulizie"><Pulizie /></Layout>} />
      <Route path="/SpaziExpo" element={<Layout currentPageName="SpaziExpo"><SpaziExpo /></Layout>} />
      <Route path="/Report" element={<Layout currentPageName="Report"><Report /></Layout>} />
      <Route path="/Ticket" element={<Layout currentPageName="Ticket"><Ticket /></Layout>} />
      <Route path="/Task" element={<Layout currentPageName="Task"><TaskPage /></Layout>} />
      <Route path="/CalendarioManutenzioni" element={<Layout currentPageName="CalendarioManutenzioni"><CalendarioManutenzioni /></Layout>} />
      <Route path="/StorageReport" element={<Layout currentPageName="StorageReport"><StorageReport /></Layout>} />
      <Route path="/Tenant" element={<Layout currentPageName="Tenant"><TenantPage /></Layout>} />
      <Route path="/Corrispettivi" element={<Layout currentPageName="Corrispettivi"><Corrispettivi /></Layout>} />
      <Route path="/LetturaContatori" element={<Layout currentPageName="LetturaContatori"><LetturaContatori /></Layout>} />
      <Route path="/Utenze" element={<Layout currentPageName="Utenze"><Utenze /></Layout>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App