import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionInfoButton from '@/components/onboarding/SectionInfoButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Building2, Users, Pencil, Trash2, UserPlus, Target, ShieldCheck, Upload, Loader2, Wrench, Store, Database } from 'lucide-react';
import { toast } from 'sonner';
import BackupSection from '@/components/gestione/BackupSection';

export default function Gestione({ user }) {
  const [centri, setCentri] = useState([]);
  const [direttori, setDirettori] = useState([]);
  const [vigilanze, setVigilanze] = useState([]);
  const [manutentori, setManutentori] = useState([]);
  const [tenant, setTenant] = useState([]);
  const [assegnazioni, setAssegnazioni] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(null);
  
  // Dialogs
  const [centroDialog, setCentroDialog] = useState({ open: false, data: null });
  const [direttoreDialog, setDirettoreDialog] = useState({ open: false, data: null });
  const [vigilanzaDialog, setVigilanzaDialog] = useState({ open: false, data: null });
  const [manutentoreDialog, setManutentoreDialog] = useState({ open: false, data: null });
  const [tenantDialog, setTenantDialog] = useState({ open: false, data: null });
  const [budgetDialog, setBudgetDialog] = useState({ open: false, data: null });

  const isProprieta = user?.tipo_account === 'proprieta';

  useEffect(() => {
    if (user?.tipo_account === 'proprieta' || user?.tipo_account === 'direttore') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [centriData, direttoriData, vigilanzeData, manutentoriData, tenantData, assegnazioniData, budgetsData] = await Promise.all([
        base44.entities.CentroCommerciale.list(),
        base44.entities.Direttore.list(),
        base44.entities.Vigilanza.list(),
        base44.entities.Manutentore.list(),
        base44.entities.Tenant.list(),
        base44.entities.Assegnazione.list(),
        base44.entities.Budget.list()
      ]);

      // Per il direttore, filtra solo i centri assegnati e gli utenti collegati
      if (user?.tipo_account === 'direttore') {
        const centriIds = assegnazioniData.filter(a => a.user_email === user.email).map(a => a.centro_id);
        setCentri(centriData.filter(c => centriIds.includes(c.id)));
        // Email degli utenti assegnati ai centri del direttore
        const emailAssegnate = [...new Set(assegnazioniData.filter(a => centriIds.includes(a.centro_id)).map(a => a.user_email))];
        setDirettori(direttoriData.filter(d => emailAssegnate.includes(d.email)));
        setVigilanze(vigilanzeData.filter(v => emailAssegnate.includes(v.email)));
        setManutentori(manutentoriData.filter(m => emailAssegnate.includes(m.email)));
        setTenant(tenantData.filter(t => centriIds.includes(t.centro_id)));
      } else {
        setCentri(centriData);
        setDirettori(direttoriData);
        setVigilanze(vigilanzeData);
        setManutentori(manutentoriData);
        setTenant(tenantData);
      }
      setAssegnazioni(assegnazioniData);
      setBudgets(budgetsData);
    } catch (error) {
      console.error('Errore caricamento:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  // === CENTRI ===
  const saveCentro = async (formData) => {
    try {
      const data = {
        ...formData,
        numero_spazi_totali: formData.numero_spazi_totali ? parseInt(formData.numero_spazi_totali) : null
      };

      if (centroDialog.data) {
        await base44.entities.CentroCommerciale.update(centroDialog.data.id, data);
        toast.success('Centro aggiornato');
      } else {
        await base44.entities.CentroCommerciale.create(data);
        toast.success('Centro creato');
      }
      
      setCentroDialog({ open: false, data: null });
      loadData();
    } catch (error) {
      toast.error('Errore: ' + error.message);
    }
  };

  const deleteCentro = async (id) => {
    if (!confirm('Eliminare questo centro?')) return;
    try {
      await base44.entities.CentroCommerciale.delete(id);
      toast.success('Centro eliminato');
      loadData();
    } catch (error) {
      toast.error('Errore eliminazione');
    }
  };

  // === DIRETTORI ===
  const saveDirettore = async (formData) => {
    try {
      if (direttoreDialog.data) {
        // Modifica direttore esistente
        await base44.entities.Direttore.update(direttoreDialog.data.id, {
          full_name: formData.full_name,
          email: formData.email,
          centro_preferito_id: formData.centro_preferito_id || null
        });
        
        // Aggiorna assegnazioni
        const assegnazioniAttuali = assegnazioni.filter(a => a.user_email === direttoreDialog.data.email);
        const centriAttualiIds = assegnazioniAttuali.map(a => a.centro_id);
        
        const daRimuovere = assegnazioniAttuali.filter(a => !formData.centri_ids.includes(a.centro_id));
        const daAggiungere = formData.centri_ids.filter(id => !centriAttualiIds.includes(id));
        
        await Promise.all([
          ...daRimuovere.map(a => base44.entities.Assegnazione.delete(a.id)),
          ...daAggiungere.map(centro_id => 
            base44.entities.Assegnazione.create({
              user_email: formData.email,
              centro_id
            })
          )
        ]);
        
        toast.success('Direttore aggiornato');
      } else {
        // Crea nuovo direttore
        await base44.entities.Direttore.create({
          full_name: formData.full_name,
          email: formData.email,
          invito_accettato: false,
          centro_preferito_id: formData.centro_preferito_id || null
        });
        
        // Crea assegnazioni
        await Promise.all(
          formData.centri_ids.map(centro_id =>
            base44.entities.Assegnazione.create({
              user_email: formData.email,
              centro_id
            })
          )
        );
        
        toast.success('Direttore creato con successo');
      }
      
      setDirettoreDialog({ open: false, data: null });
      loadData();
    } catch (error) {
      toast.error('Errore: ' + error.message);
    }
  };

  const deleteDirettore = async (dir) => {
    if (!confirm(`Eliminare il direttore ${dir.full_name}? Verranno rimosse anche tutte le sue assegnazioni.`)) return;
    try {
      const assegnazioniDir = assegnazioni.filter(a => a.user_email === dir.email);
      await Promise.all([
        base44.entities.Direttore.delete(dir.id),
        ...assegnazioniDir.map(a => base44.entities.Assegnazione.delete(a.id))
      ]);
      toast.success('Direttore eliminato');
      loadData();
    } catch (error) {
      toast.error('Errore eliminazione');
    }
  };

  const deleteAssegnazione = async (id) => {
    if (!confirm('Rimuovere questa assegnazione?')) return;
    try {
      await base44.entities.Assegnazione.delete(id);
      toast.success('Assegnazione rimossa');
      loadData();
    } catch (error) {
      toast.error('Errore rimozione');
    }
  };

  // === VIGILANZA ===
  const saveVigilanza = async (formData) => {
    try {
      if (vigilanzaDialog.data) {
        await base44.entities.Vigilanza.update(vigilanzaDialog.data.id, {
          full_name: formData.full_name,
          email: formData.email,
          centro_preferito_id: formData.centro_preferito_id || null
        });
        
        const assegnazioniAttuali = assegnazioni.filter(a => a.user_email === vigilanzaDialog.data.email);
        const centriAttualiIds = assegnazioniAttuali.map(a => a.centro_id);
        const daRimuovere = assegnazioniAttuali.filter(a => !formData.centri_ids.includes(a.centro_id));
        const daAggiungere = formData.centri_ids.filter(id => !centriAttualiIds.includes(id));
        
        await Promise.all([
          ...daRimuovere.map(a => base44.entities.Assegnazione.delete(a.id)),
          ...daAggiungere.map(centro_id => base44.entities.Assegnazione.create({ user_email: formData.email, centro_id }))
        ]);
        
        toast.success('Vigilanza aggiornata');
      } else {
        await base44.entities.Vigilanza.create({ full_name: formData.full_name, email: formData.email, invito_accettato: false, centro_preferito_id: formData.centro_preferito_id || null });
        await Promise.all(
          formData.centri_ids.map(centro_id => base44.entities.Assegnazione.create({ user_email: formData.email, centro_id }))
        );
        // Invita l'utente
        await base44.users.inviteUser(formData.email, 'user');
        toast.success('Account vigilanza creato, invito inviato via email');
      }
      
      setVigilanzaDialog({ open: false, data: null });
      loadData();
    } catch (error) {
      toast.error('Errore: ' + error.message);
    }
  };

  const deleteVigilanza = async (vig) => {
    if (!confirm(`Eliminare l'account vigilanza ${vig.full_name}?`)) return;
    try {
      const assegnazioniVig = assegnazioni.filter(a => a.user_email === vig.email);
      await Promise.all([
        base44.entities.Vigilanza.delete(vig.id),
        ...assegnazioniVig.map(a => base44.entities.Assegnazione.delete(a.id))
      ]);
      toast.success('Account vigilanza eliminato');
      loadData();
    } catch (error) {
      toast.error('Errore eliminazione');
    }
  };

  // === TENANT ===
  const saveTenant = async (formData) => {
    try {
      if (tenantDialog.data) {
        await base44.entities.Tenant.update(tenantDialog.data.id, formData);
        toast.success('Tenant aggiornato');
      } else {
        const nuovoTenant = await base44.entities.Tenant.create(formData);
        // Invita l'utente tenant
        try {
          await base44.users.inviteUser(formData.email_referente, 'user');
          toast.success('Tenant creato, invito inviato via email');
        } catch (inviteErr) {
          toast.success('Tenant creato. Se l\'utente è già registrato potrà accedere direttamente.');
        }
      }
      setTenantDialog({ open: false, data: null });
      loadData();
    } catch (error) {
      toast.error('Errore: ' + error.message);
    }
  };

  const deleteTenant = async (ten) => {
    if (!confirm(`Eliminare il tenant ${ten.ragione_sociale}?`)) return;
    try {
      await base44.entities.Tenant.delete(ten.id);
      toast.success('Tenant eliminato');
      loadData();
    } catch (error) {
      toast.error('Errore eliminazione');
    }
  };

  // === MANUTENTORI ===
  const saveManutentore = async (formData) => {
    try {
      if (manutentoreDialog.data) {
        await base44.entities.Manutentore.update(manutentoreDialog.data.id, {
          full_name: formData.full_name,
          email: formData.email,
          azienda: formData.azienda,
          centro_preferito_id: formData.centro_preferito_id || null
        });
        // Aggiorna assegnazioni centri
        const vecchieAssegnazioni = assegnazioni.filter(a => a.user_email === formData.email);
        const vecchieIds = vecchieAssegnazioni.map(a => a.centro_id);
        const daAggiungere = formData.centri_ids.filter(id => !vecchieIds.includes(id));
        const daRimuovere = vecchieAssegnazioni.filter(a => !formData.centri_ids.includes(a.centro_id));
        await Promise.all([
          ...daAggiungere.map(centro_id => base44.entities.Assegnazione.create({ user_email: formData.email, centro_id })),
          ...daRimuovere.map(a => base44.entities.Assegnazione.delete(a.id))
        ]);
        toast.success('Manutentore aggiornato');
      } else {
        const nuovoMan = await base44.entities.Manutentore.create({ full_name: formData.full_name, email: formData.email, azienda: formData.azienda, invito_accettato: false, centro_preferito_id: formData.centro_preferito_id || null });
        await Promise.all(
          formData.centri_ids.map(centro_id => base44.entities.Assegnazione.create({ user_email: formData.email, centro_id }))
        );
        try {
          await base44.users.inviteUser(formData.email, 'user');
          toast.success('Account manutentore creato, invito inviato via email');
        } catch (inviteErr) {
          // L'utente potrebbe già esistere - il record è comunque stato creato
          toast.success('Account manutentore creato. Se l\'utente è già registrato potrà accedere direttamente.');
        }
      }
      setManutentoreDialog({ open: false, data: null });
      loadData();
    } catch (error) {
      toast.error('Errore: ' + error.message);
    }
  };

  const deleteManutentore = async (man) => {
    if (!confirm(`Eliminare l'account manutentore ${man.full_name}?`)) return;
    try {
      const assegnazioniMan = assegnazioni.filter(a => a.user_email === man.email);
      await Promise.all([
        base44.entities.Manutentore.delete(man.id),
        ...assegnazioniMan.map(a => base44.entities.Assegnazione.delete(a.id))
      ]);
      toast.success('Account manutentore eliminato');
      loadData();
    } catch (error) {
      toast.error('Errore eliminazione');
    }
  };

  // === BUDGET ===
  const saveBudget = async (formData) => {
    try {
      const data = {
        ...formData,
        anno: parseInt(formData.anno),
        importo_budget: parseFloat(formData.importo_budget)
      };

      if (budgetDialog.data) {
        await base44.entities.Budget.update(budgetDialog.data.id, data);
        toast.success('Budget aggiornato');
      } else {
        await base44.entities.Budget.create(data);
        toast.success('Budget creato');
      }
      
      setBudgetDialog({ open: false, data: null });
      loadData();
    } catch (error) {
      toast.error('Errore: ' + error.message);
    }
  };

  const deleteBudget = async (id) => {
    if (!confirm('Eliminare questo budget?')) return;
    try {
      await base44.entities.Budget.delete(id);
      toast.success('Budget eliminato');
      loadData();
    } catch (error) {
      toast.error('Errore eliminazione');
    }
  };

  // === UI HELPERS ===
  const getCentriAssegnati = (email) => {
    const ids = assegnazioni.filter(a => a.user_email === email).map(a => a.centro_id);
    return centri.filter(c => ids.includes(c.id));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const isDirettore = user?.tipo_account === 'direttore';
  const isPropieta = user?.tipo_account === 'proprieta';
  
  const defaultTab = isDirettore ? "vigilanza" : "centri";
  const currentTab = activeTab || defaultTab;

  if (!user || (!isPropieta && !isDirettore)) {
    return (
      <div className="p-8">
        <Card><CardContent className="py-12 text-center text-slate-500">
          Accesso non autorizzato
        </CardContent></Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2 flex items-center gap-2">Gestione <SectionInfoButton section="Gestione" /></h1>
        <p className="text-slate-600 text-sm">Amministra centri, direttori e budget</p>
      </div>

      <Tabs value={currentTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 w-full">
            {/* Desktop tabs */}
            <div className="hidden sm:block">
              <TabsList className="w-full sm:w-auto">
                {isPropieta && <TabsTrigger value="centri">Centri</TabsTrigger>}
                {isPropieta && <TabsTrigger value="direttori">Direttori</TabsTrigger>}
                <TabsTrigger value="vigilanza">Vigilanza</TabsTrigger>
                <TabsTrigger value="tenant">Tenant</TabsTrigger>
                <TabsTrigger value="manutentori">Manutentori</TabsTrigger>
                {isPropieta && <TabsTrigger value="budget">Budget</TabsTrigger>}
                {(isPropieta || isDirettore) && <TabsTrigger value="backup"><Database className="w-4 h-4 mr-1 inline" />Backup</TabsTrigger>}
              </TabsList>
            </div>

            {/* Buttons on the right */}
            <div className="hidden sm:flex gap-2">
              {currentTab === 'centri' && isPropieta && (
                <Button onClick={() => setCentroDialog({ open: true, data: null })} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuovo Centro
                </Button>
              )}
              {currentTab === 'direttori' && isPropieta && (
                <Button onClick={() => setDirettoreDialog({ open: true, data: null })} className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nuovo Direttore
                </Button>
              )}
              {currentTab === 'vigilanza' && (
                <Button onClick={() => setVigilanzaDialog({ open: true, data: null })} className="bg-blue-600 hover:bg-blue-700">
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Nuovo Account Vigilanza
                </Button>
              )}
              {currentTab === 'tenant' && (
                <Button onClick={() => setTenantDialog({ open: true, data: null })} className="bg-blue-600 hover:bg-blue-700">
                  <Store className="w-4 h-4 mr-2" />
                  Nuovo Tenant
                </Button>
              )}
              {currentTab === 'manutentori' && (
                <Button onClick={() => setManutentoreDialog({ open: true, data: null })} className="bg-blue-600 hover:bg-blue-700">
                  <Wrench className="w-4 h-4 mr-2" />
                  Nuovo Account Manutentore
                </Button>
              )}
              {currentTab === 'budget' && isPropieta && (
                <Button onClick={() => setBudgetDialog({ open: true, data: null })} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuovo Budget
                </Button>
              )}
            </div>
          </div>
            
            {/* Mobile select dropdown */}
            <div className="sm:hidden w-full">
              <select
                value={currentTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                {isPropieta && <option value="centri">Centri</option>}
                {isPropieta && <option value="direttori">Direttori</option>}
                <option value="vigilanza">Vigilanza</option>
                <option value="tenant">Tenant</option>
                <option value="manutentori">Manutentori</option>
                {isPropieta && <option value="budget">Budget</option>}
                {(isPropieta || isDirettore) && <option value="backup">Backup</option>}
              </select>
            </div>

            {/* Mobile buttons */}
            <div className="sm:hidden w-full">
              {currentTab === 'centri' && isPropieta && (
                <Button onClick={() => setCentroDialog({ open: true, data: null })} className="bg-blue-600 hover:bg-blue-700 w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuovo Centro
                </Button>
              )}
              {currentTab === 'direttori' && isPropieta && (
                <Button onClick={() => setDirettoreDialog({ open: true, data: null })} className="bg-blue-600 hover:bg-blue-700 w-full">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nuovo Direttore
                </Button>
              )}
              {currentTab === 'vigilanza' && (
                <Button onClick={() => setVigilanzaDialog({ open: true, data: null })} className="bg-blue-600 hover:bg-blue-700 w-full">
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Nuovo Account Vigilanza
                </Button>
              )}
              {currentTab === 'tenant' && (
                <Button onClick={() => setTenantDialog({ open: true, data: null })} className="bg-blue-600 hover:bg-blue-700 w-full">
                  <Store className="w-4 h-4 mr-2" />
                  Nuovo Tenant
                </Button>
              )}
              {currentTab === 'manutentori' && (
                <Button onClick={() => setManutentoreDialog({ open: true, data: null })} className="bg-blue-600 hover:bg-blue-700 w-full">
                  <Wrench className="w-4 h-4 mr-2" />
                  Nuovo Account Manutentore
                </Button>
              )}
              {currentTab === 'budget' && isPropieta && (
                <Button onClick={() => setBudgetDialog({ open: true, data: null })} className="bg-blue-600 hover:bg-blue-700 w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuovo Budget
                </Button>
              )}
            </div>
          </div>

        {/* === TAB CENTRI === */}
        <TabsContent value="centri">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {centri.map(centro => (
              <Card key={centro.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between mb-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {centro.logo_url
                          ? <img src={centro.logo_url} alt="logo" className="w-full h-full object-contain" />
                          : <Building2 className="w-5 h-5 text-blue-600" />
                        }
                      </div>
                      <div>
                        <h3 className="font-semibold">{centro.nome}</h3>
                        <p className="text-sm text-slate-600">{centro.citta}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setCentroDialog({ open: true, data: centro })}>
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteCentro(centro.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  {centro.indirizzo && <p className="text-sm text-slate-600 mb-2">{centro.indirizzo}</p>}
                  {centro.numero_spazi_totali && <p className="text-sm text-slate-600">Spazi: {centro.numero_spazi_totali}</p>}
                  {!centro.attivo && <div className="mt-3 px-2 py-1 bg-red-50 text-red-700 text-xs rounded text-center">Non attivo</div>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* === TAB DIRETTORI === */}
        <TabsContent value="direttori">

          <div className="space-y-4">
            {direttori.map(dir => {
              const centriAssegnati = getCentriAssegnati(dir.email);
              return (
                <Card key={dir.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold">{dir.full_name}</h3>
                              {!dir.invito_accettato && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                  In attesa
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 truncate">{dir.email}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Centri assegnati ({centriAssegnati.length}):</p>
                          {centriAssegnati.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {centriAssegnati.map(centro => {
                                const assegnazione = assegnazioni.find(a => a.user_email === dir.email && a.centro_id === centro.id);
                                return (
                                  <div key={centro.id} className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-800 rounded-lg text-xs md:text-sm">
                                    <span className="truncate">{centro.nome}</span>
                                    <button onClick={() => deleteAssegnazione(assegnazione.id)} className="hover:text-blue-600 flex-shrink-0">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">Nessun centro</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 self-start md:self-auto">
                        <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => setDirettoreDialog({ open: true, data: dir })}>
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </Button>
                        {isProprieta && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => deleteDirettore(dir)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* === TAB TENANT === */}
        <TabsContent value="tenant">
          <div className="space-y-4">
            {tenant.map(ten => (
              <Card key={ten.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Store className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold">{ten.ragione_sociale}</h3>
                          <p className="text-sm text-slate-600 truncate">{ten.insegna || 'Nessuna insegna'}</p>
                          <p className="text-sm text-slate-500 truncate">Negozio {ten.numero_negozio}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                        {ten.telefono && <span>📞 {ten.telefono}</span>}
                        {ten.referente_tecnico && <span>👤 {ten.referente_tecnico}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 self-start md:self-auto">
                      <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => setTenantDialog({ open: true, data: ten })}>
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </Button>
                      {isProprieta && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => deleteTenant(ten)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {tenant.length === 0 && (
              <Card><CardContent className="py-12 text-center text-slate-500">
                Nessun tenant configurato
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* === TAB VIGILANZA === */}
        <TabsContent value="vigilanza">
          <div className="space-y-4">
            {vigilanze.map(vig => {
              const centriAssegnati = getCentriAssegnati(vig.email);
              return (
                <Card key={vig.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck className="w-5 h-5 text-orange-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold">{vig.full_name}</h3>
                              {!vig.invito_accettato && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">In attesa</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 truncate">{vig.email}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Centri assegnati ({centriAssegnati.length}):</p>
                          {centriAssegnati.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {centriAssegnati.map(centro => (
                                <div key={centro.id} className="px-3 py-1 bg-orange-50 text-orange-800 rounded-lg text-xs md:text-sm">
                                  {centro.nome}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">Nessun centro</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 self-start md:self-auto">
                        <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => setVigilanzaDialog({ open: true, data: vig })}>
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </Button>
                        {isProprieta && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => deleteVigilanza(vig)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {vigilanze.length === 0 && (
              <Card><CardContent className="py-12 text-center text-slate-500">
                Nessun account vigilanza configurato
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* === TAB MANUTENTORI === */}
        <TabsContent value="manutentori">

          <div className="space-y-4">
            {manutentori.map(man => {
              const centriAssegnati = getCentriAssegnati(man.email);
              return (
              <Card key={man.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:justify-between gap-3">
                     <div className="flex-1 min-w-0">
                       <div className="flex gap-3 mb-3">
                       <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                         <Wrench className="w-5 h-5 text-yellow-600" />
                       </div>
                       <div className="min-w-0 flex-1">
                         <div className="flex flex-wrap items-center gap-2">
                           <h3 className="font-semibold">{man.full_name}</h3>
                           {!man.invito_accettato && (
                             <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">In attesa</span>
                           )}
                         </div>
                         <p className="text-sm text-slate-600 truncate">{man.email}</p>
                         {man.azienda && <p className="text-sm text-slate-500 truncate">{man.azienda}</p>}
                       </div>
                       </div>
                       <div>
                         <p className="text-sm font-medium mb-2">Centri abbinati ({centriAssegnati.length}):</p>
                         {centriAssegnati.length > 0 ? (
                           <div className="flex flex-wrap gap-2">
                             {centriAssegnati.map(centro => {
                               const assegnazione = assegnazioni.find(a => a.user_email === man.email && a.centro_id === centro.id);
                               return (
                                 <div key={centro.id} className="flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-800 rounded-lg text-xs md:text-sm">
                                   <span className="truncate">{centro.nome}</span>
                                   <button onClick={() => deleteAssegnazione(assegnazione.id)} className="hover:text-yellow-600 flex-shrink-0">
                                     <Trash2 className="w-3 h-3" />
                                   </button>
                                 </div>
                               );
                             })}
                           </div>
                         ) : (
                           <p className="text-sm text-slate-500">Nessun centro</p>
                         )}
                       </div>
                     </div>
                     <div className="flex gap-1 flex-shrink-0 self-start md:self-auto">
                       <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => setManutentoreDialog({ open: true, data: man })}>
                         <Pencil className="w-4 h-4 text-blue-600" />
                       </Button>
                       {isProprieta && (
                       <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => deleteManutentore(man)}>
                         <Trash2 className="w-4 h-4 text-red-600" />
                       </Button>
                       )}
                     </div>
                   </div>
                </CardContent>
              </Card>
              );
            })}
            {manutentori.length === 0 && (
              <Card><CardContent className="py-12 text-center text-slate-500">
                Nessun account manutentore configurato
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* === TAB BUDGET === */}
        <TabsContent value="budget">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets.map(budget => {
              const centro = centri.find(c => c.id === budget.centro_id);
              return (
                <Card key={budget.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between mb-4">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                          <Target className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{centro?.nome}</h3>
                          <p className="text-sm text-slate-600">Anno {budget.anno}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setBudgetDialog({ open: true, data: budget })}>
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteBudget(budget.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(budget.importo_budget)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* === TAB BACKUP === */}
        {(isPropieta || isDirettore) && (
          <TabsContent value="backup">
            <div className="max-w-2xl">
              <BackupSection user={user} centri={centri} />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* === DIALOGS === */}
      <CentroDialog 
        open={centroDialog.open} 
        data={centroDialog.data}
        onClose={() => setCentroDialog({ open: false, data: null })}
        onSave={saveCentro}
      />
      
      <DirettoreDialog 
        open={direttoreDialog.open} 
        data={direttoreDialog.data}
        centri={centri}
        assegnazioni={assegnazioni}
        onClose={() => setDirettoreDialog({ open: false, data: null })}
        onSave={saveDirettore}
      />
      
      <VigilanzaDialog
        open={vigilanzaDialog.open}
        data={vigilanzaDialog.data}
        centri={centri}
        assegnazioni={assegnazioni}
        onClose={() => setVigilanzaDialog({ open: false, data: null })}
        onSave={saveVigilanza}
      />

      <TenantDialog
        open={tenantDialog.open}
        data={tenantDialog.data}
        centri={centri}
        onClose={() => setTenantDialog({ open: false, data: null })}
        onSave={saveTenant}
      />

      <ManutentoreDialog
        open={manutentoreDialog.open}
        data={manutentoreDialog.data}
        centri={centri}
        assegnazioni={assegnazioni}
        onClose={() => setManutentoreDialog({ open: false, data: null })}
        onSave={saveManutentore}
      />

      <BudgetDialog 
        open={budgetDialog.open} 
        data={budgetDialog.data}
        centri={centri}
        onClose={() => setBudgetDialog({ open: false, data: null })}
        onSave={saveBudget}
      />
    </div>
  );
}

// === DIALOG COMPONENTS ===
function CentroDialog({ open, data, onClose, onSave }) {
  const [form, setForm] = useState({
    nome: '', citta: '', indirizzo: '', provincia: '', cap: '', numero_spazi_totali: '', iban: '', logo_url: '', attivo: true
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({ logo_url: '', ...data });
    } else {
      setForm({ nome: '', citta: '', indirizzo: '', provincia: '', cap: '', numero_spazi_totali: '', iban: '', logo_url: '', attivo: true });
    }
  }, [data, open]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, logo_url: file_url }));
    setUploadingLogo(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{data ? 'Modifica Centro' : 'Nuovo Centro'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Logo */}
          <div>
            <Label>Logo</Label>
            <div className="flex items-center gap-4 mt-2">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {form.logo_url
                  ? <img src={form.logo_url} alt="logo" className="w-full h-full object-contain p-1" />
                  : <Building2 className="w-8 h-8 text-slate-300" />
                }
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-600 w-fit">
                  {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingLogo ? 'Caricamento...' : 'Carica logo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                </label>
                {form.logo_url && (
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, logo_url: '' }))} className="text-xs text-red-500 hover:text-red-700 text-left">
                    Rimuovi logo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label>Nome Centro *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Indirizzo</Label>
              <Input value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} />
            </div>
            <div>
              <Label>Città *</Label>
              <Input value={form.citta} onChange={(e) => setForm({ ...form, citta: e.target.value })} required />
            </div>
            <div>
              <Label>Provincia</Label>
              <Input value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })} />
            </div>
            <div>
              <Label>CAP</Label>
              <Input value={form.cap} onChange={(e) => setForm({ ...form, cap: e.target.value })} />
            </div>
            <div>
              <Label>N. Spazi</Label>
              <Input type="number" value={form.numero_spazi_totali} onChange={(e) => setForm({ ...form, numero_spazi_totali: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>IBAN</Label>
              <Input value={form.iban || ''} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="es. IT29H0538713202000001501918" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.attivo} onChange={(e) => setForm({ ...form, attivo: e.target.checked })} />
            <Label>Attivo</Label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <Button type="submit" className="bg-blue-600" disabled={uploadingLogo}>{data ? 'Aggiorna' : 'Crea'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DirettoreDialog({ open, data, centri, assegnazioni, onClose, onSave }) {
  const [form, setForm] = useState({ full_name: '', email: '', centri_ids: [], centro_preferito_id: '' });

  useEffect(() => {
    if (data) {
      const centriIds = assegnazioni.filter(a => a.user_email === data.email).map(a => a.centro_id);
      setForm({ full_name: data.full_name, email: data.email, centri_ids: centriIds, centro_preferito_id: data.centro_preferito_id || centriIds[0] || '' });
    } else {
      setForm({ full_name: '', email: '', centri_ids: [], centro_preferito_id: '' });
    }
  }, [data, open, assegnazioni]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.centri_ids.length === 0) {
      toast.error('Seleziona almeno un centro');
      return;
    }
    onSave(form);
  };

  const toggleCentro = (centroId) => {
    setForm(prev => {
      const newIds = prev.centri_ids.includes(centroId)
        ? prev.centri_ids.filter(id => id !== centroId)
        : [...prev.centri_ids, centroId];
      // Se si deseleziona il preferito, resetta
      const newPreferito = newIds.includes(prev.centro_preferito_id) ? prev.centro_preferito_id : (newIds[0] || '');
      return { ...prev, centri_ids: newIds, centro_preferito_id: newPreferito };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data ? 'Modifica Direttore' : 'Nuovo Direttore'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome e Cognome *</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!data} />
          </div>
          <div>
            <Label>Centri Assegnati *</Label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 mt-2">
              {centri.filter(c => c.attivo).map(centro => (
                <div key={centro.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.centri_ids.includes(centro.id)}
                    onChange={() => toggleCentro(centro.id)}
                    className="cursor-pointer"
                  />
                  <span className="text-sm flex-1 cursor-pointer" onClick={() => toggleCentro(centro.id)}>{centro.nome}</span>
                  {form.centri_ids.includes(centro.id) && (
                    <button
                      type="button"
                      title="Imposta come preferito"
                      onClick={() => setForm(prev => ({ ...prev, centro_preferito_id: centro.id }))}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        form.centro_preferito_id === centro.id
                          ? 'bg-yellow-400 border-yellow-400 text-white font-semibold'
                          : 'border-slate-300 text-slate-400 hover:border-yellow-400 hover:text-yellow-500'
                      }`}
                    >
                      ★
                    </button>
                  )}
                </div>
              ))}
            </div>
            {form.centri_ids.length > 1 && (
              <p className="text-xs text-slate-500 mt-1">★ = centro preferito (aperto di default all'accesso)</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <Button type="submit" className="bg-blue-600">{data ? 'Aggiorna' : 'Crea'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VigilanzaDialog({ open, data, centri, assegnazioni, onClose, onSave }) {
  const [form, setForm] = useState({ full_name: '', email: '', centri_ids: [], centro_preferito_id: '' });

  useEffect(() => {
    if (data) {
      const centriIds = assegnazioni.filter(a => a.user_email === data.email).map(a => a.centro_id);
      setForm({ full_name: data.full_name, email: data.email, centri_ids: centriIds, centro_preferito_id: data.centro_preferito_id || centriIds[0] || '' });
    } else {
      setForm({ full_name: '', email: '', centri_ids: [], centro_preferito_id: '' });
    }
  }, [data, open, assegnazioni]);

  const toggleCentro = (centroId) => {
    setForm(prev => {
      const newIds = prev.centri_ids.includes(centroId)
        ? prev.centri_ids.filter(id => id !== centroId)
        : [...prev.centri_ids, centroId];
      const newPreferito = newIds.includes(prev.centro_preferito_id) ? prev.centro_preferito_id : (newIds[0] || '');
      return { ...prev, centri_ids: newIds, centro_preferito_id: newPreferito };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.centri_ids.length === 0) {
      toast.error('Seleziona almeno un centro');
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data ? 'Modifica Account Vigilanza' : 'Nuovo Account Vigilanza'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome e Cognome *</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!data} />
          </div>
          <div>
            <Label>Centri da visualizzare *</Label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 mt-2">
              {centri.filter(c => c.attivo).map(centro => (
                <div key={centro.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.centri_ids.includes(centro.id)}
                    onChange={() => toggleCentro(centro.id)}
                    className="cursor-pointer"
                  />
                  <span className="text-sm flex-1 cursor-pointer" onClick={() => toggleCentro(centro.id)}>{centro.nome}</span>
                  {form.centri_ids.includes(centro.id) && (
                    <button
                      type="button"
                      title="Imposta come preferito"
                      onClick={() => setForm(prev => ({ ...prev, centro_preferito_id: centro.id }))}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        form.centro_preferito_id === centro.id
                          ? 'bg-yellow-400 border-yellow-400 text-white font-semibold'
                          : 'border-slate-300 text-slate-400 hover:border-yellow-400 hover:text-yellow-500'
                      }`}
                    >
                      ★
                    </button>
                  )}
                </div>
              ))}
            </div>
            {form.centri_ids.length > 1 && (
              <p className="text-xs text-slate-500 mt-1">★ = centro preferito (aperto di default all'accesso)</p>
            )}
          </div>
          {!data && (
            <p className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg">
              Verrà inviato un invito via email all'indirizzo specificato. L'utente potrà accedere solo al Calendario Vigilanza.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <Button type="submit" className="bg-blue-600">{data ? 'Aggiorna' : 'Crea e Invita'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ManutentoreDialog({ open, data, centri, assegnazioni, onClose, onSave }) {
  const [form, setForm] = useState({ full_name: '', email: '', azienda: '', centri_ids: [], centro_preferito_id: '' });

  useEffect(() => {
    if (data) {
      const centriIds = (assegnazioni || []).filter(a => a.user_email === data.email).map(a => a.centro_id);
      setForm({ full_name: data.full_name, email: data.email, azienda: data.azienda || '', centri_ids: centriIds, centro_preferito_id: data.centro_preferito_id || centriIds[0] || '' });
    } else {
      setForm({ full_name: '', email: '', azienda: '', centri_ids: [], centro_preferito_id: '' });
    }
  }, [data, open, assegnazioni]);

  const toggleCentro = (centroId) => {
    setForm(prev => {
      const newIds = prev.centri_ids.includes(centroId)
        ? prev.centri_ids.filter(id => id !== centroId)
        : [...prev.centri_ids, centroId];
      const newPreferito = newIds.includes(prev.centro_preferito_id) ? prev.centro_preferito_id : (newIds[0] || '');
      return { ...prev, centri_ids: newIds, centro_preferito_id: newPreferito };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data ? 'Modifica Manutentore' : 'Nuovo Account Manutentore'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome e Cognome *</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!data} />
          </div>
          <div>
            <Label>Azienda</Label>
            <Input value={form.azienda} onChange={(e) => setForm({ ...form, azienda: e.target.value })} placeholder="Nome azienda di manutenzione" />
          </div>
          <div>
            <Label>Centri da abbinare</Label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 mt-2">
              {(centri || []).filter(c => c.attivo).map(centro => (
                <div key={centro.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.centri_ids.includes(centro.id)}
                    onChange={() => toggleCentro(centro.id)}
                    className="cursor-pointer"
                  />
                  <span className="text-sm flex-1 cursor-pointer" onClick={() => toggleCentro(centro.id)}>{centro.nome}</span>
                  {form.centri_ids.includes(centro.id) && (
                    <button
                      type="button"
                      title="Imposta come preferito"
                      onClick={() => setForm(prev => ({ ...prev, centro_preferito_id: centro.id }))}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        form.centro_preferito_id === centro.id
                          ? 'bg-yellow-400 border-yellow-400 text-white font-semibold'
                          : 'border-slate-300 text-slate-400 hover:border-yellow-400 hover:text-yellow-500'
                      }`}
                    >
                      ★
                    </button>
                  )}
                </div>
              ))}
            </div>
            {form.centri_ids.length > 1 && (
              <p className="text-xs text-slate-500 mt-1">★ = centro preferito (aperto di default all'accesso)</p>
            )}
          </div>
          {!data && (
            <p className="text-xs text-slate-500 bg-yellow-50 p-3 rounded-lg">
              Verrà inviato un invito via email. Il manutentore potrà visualizzare solo i Ticket.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <Button type="submit" className="bg-blue-600">{data ? 'Aggiorna' : 'Crea e Invita'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TenantDialog({ open, data, centri, onClose, onSave }) {
  const [form, setForm] = useState({
    centro_id: '',
    numero_negozio: '',
    ragione_sociale: '',
    insegna: '',
    indirizzo_punto_vendita: '',
    telefono: '',
    email_referente: '',
    referente_tecnico: '',
    pec: '',
    note: ''
  });

  useEffect(() => {
    if (data) {
      setForm(data);
    } else {
      setForm({
        centro_id: '',
        numero_negozio: '',
        ragione_sociale: '',
        insegna: '',
        indirizzo_punto_vendita: '',
        telefono: '',
        email_referente: '',
        referente_tecnico: '',
        pec: '',
        note: ''
      });
    }
  }, [data, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data ? 'Modifica Tenant' : 'Nuovo Tenant'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Centro Commerciale *</Label>
              <select
                value={form.centro_id}
                onChange={(e) => setForm({ ...form, centro_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">Seleziona centro</option>
                {centri.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <Label>Numero Negozio *</Label>
              <Input value={form.numero_negozio} onChange={(e) => setForm({ ...form, numero_negozio: e.target.value })} required />
            </div>
            <div>
              <Label>Ragione Sociale *</Label>
              <Input value={form.ragione_sociale} onChange={(e) => setForm({ ...form, ragione_sociale: e.target.value })} required />
            </div>
            <div className="col-span-2">
              <Label>Insegna</Label>
              <Input value={form.insegna} onChange={(e) => setForm({ ...form, insegna: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Indirizzo Punto Vendita</Label>
              <Input value={form.indirizzo_punto_vendita} onChange={(e) => setForm({ ...form, indirizzo_punto_vendita: e.target.value })} />
            </div>
            <div>
              <Label>Telefono</Label>
              <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div>
              <Label>Email Referente *</Label>
              <Input type="email" value={form.email_referente} onChange={(e) => setForm({ ...form, email_referente: e.target.value })} required />
            </div>
            <div className="col-span-2">
              <Label>Referente Tecnico</Label>
              <Input value={form.referente_tecnico} onChange={(e) => setForm({ ...form, referente_tecnico: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>PEC</Label>
              <Input type="email" value={form.pec} onChange={(e) => setForm({ ...form, pec: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Note</Label>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg min-h-[80px]"
              />
            </div>
          </div>
          {!data && (
            <p className="text-xs text-slate-500 bg-green-50 p-3 rounded-lg">
              Verrà inviato un invito via email all'indirizzo del referente. Il tenant potrà accedere solo alla sezione Corrispettivi per inserire i dati del proprio negozio.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <Button type="submit" className="bg-blue-600">{data ? 'Aggiorna' : 'Crea e Invita'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BudgetDialog({ open, data, centri, onClose, onSave }) {
  const [form, setForm] = useState({ centro_id: '', anno: new Date().getFullYear(), importo_budget: '' });

  useEffect(() => {
    if (data) {
      setForm(data);
    } else {
      setForm({ centro_id: '', anno: new Date().getFullYear(), importo_budget: '' });
    }
  }, [data, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data ? 'Modifica Budget' : 'Nuovo Budget'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Centro *</Label>
            <select
              value={form.centro_id}
              onChange={(e) => setForm({ ...form, centro_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="">Seleziona centro</option>
              {centri.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <Label>Anno *</Label>
            <Input type="number" value={form.anno} onChange={(e) => setForm({ ...form, anno: e.target.value })} required />
          </div>
          <div>
            <Label>Importo (€) *</Label>
            <Input type="number" step="0.01" value={form.importo_budget} onChange={(e) => setForm({ ...form, importo_budget: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <Button type="submit" className="bg-blue-600">{data ? 'Aggiorna' : 'Crea'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}