import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Building2, Users, Pencil, Trash2, UserPlus, Target, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function Gestione({ user }) {
  const [centri, setCentri] = useState([]);
  const [direttori, setDirettori] = useState([]);
  const [vigilanze, setVigilanze] = useState([]);
  const [assegnazioni, setAssegnazioni] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [centroDialog, setCentroDialog] = useState({ open: false, data: null });
  const [direttoreDialog, setDirettoreDialog] = useState({ open: false, data: null });
  const [vigilanzaDialog, setVigilanzaDialog] = useState({ open: false, data: null });
  const [budgetDialog, setBudgetDialog] = useState({ open: false, data: null });

  useEffect(() => {
    if (user?.tipo_account === 'proprieta') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [centriData, direttoriData, assegnazioniData, budgetsData] = await Promise.all([
        base44.entities.CentroCommerciale.list(),
        base44.entities.Direttore.list(),
        base44.entities.Assegnazione.list(),
        base44.entities.Budget.list()
      ]);
      
      setCentri(centriData);
      setDirettori(direttoriData);
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
          email: formData.email
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
          invito_accettato: false
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

  if (!user || user.tipo_account !== 'proprieta') {
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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Gestione</h1>
        <p className="text-slate-600">Amministra centri, direttori e budget</p>
      </div>

      <Tabs defaultValue="centri" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="centri">Centri Commerciali</TabsTrigger>
          <TabsTrigger value="direttori">Direttori</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
        </TabsList>

        {/* === TAB CENTRI === */}
        <TabsContent value="centri">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setCentroDialog({ open: true, data: null })} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Centro
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {centri.map(centro => (
              <Card key={centro.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between mb-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
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
          <div className="flex justify-end mb-4">
            <Button onClick={() => setDirettoreDialog({ open: true, data: null })} className="bg-blue-600">
              <UserPlus className="w-4 h-4 mr-2" />
              Nuovo Direttore
            </Button>
          </div>

          <div className="space-y-4">
            {direttori.map(dir => {
              const centriAssegnati = getCentriAssegnati(dir.email);
              return (
                <Card key={dir.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between">
                      <div className="flex-1">
                        <div className="flex gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{dir.full_name}</h3>
                              {!dir.invito_accettato && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                  In attesa
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600">{dir.email}</p>
                          </div>
                        </div>
                        <div className="ml-13">
                          <p className="text-sm font-medium mb-2">Centri assegnati ({centriAssegnati.length}):</p>
                          {centriAssegnati.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {centriAssegnati.map(centro => {
                                const assegnazione = assegnazioni.find(a => a.user_email === dir.email && a.centro_id === centro.id);
                                return (
                                  <div key={centro.id} className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-800 rounded-lg text-sm">
                                    <span>{centro.nome}</span>
                                    <button onClick={() => deleteAssegnazione(assegnazione.id)} className="hover:text-blue-600">
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
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDirettoreDialog({ open: true, data: dir })}>
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteDirettore(dir)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* === TAB BUDGET === */}
        <TabsContent value="budget">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setBudgetDialog({ open: true, data: null })} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Budget
            </Button>
          </div>

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
    nome: '', citta: '', indirizzo: '', provincia: '', cap: '', numero_spazi_totali: '', iban: '', attivo: true
  });

  useEffect(() => {
    if (data) {
      setForm(data);
    } else {
      setForm({ 
        nome: '', citta: '', indirizzo: '', provincia: '', cap: '', numero_spazi_totali: '', iban: '', attivo: true
      });
    }
  }, [data, open]);

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
            <Button type="submit" className="bg-blue-600">{data ? 'Aggiorna' : 'Crea'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DirettoreDialog({ open, data, centri, assegnazioni, onClose, onSave }) {
  const [form, setForm] = useState({ full_name: '', email: '', centri_ids: [] });

  useEffect(() => {
    if (data) {
      const centriIds = assegnazioni.filter(a => a.user_email === data.email).map(a => a.centro_id);
      setForm({ full_name: data.full_name, email: data.email, centri_ids: centriIds });
    } else {
      setForm({ full_name: '', email: '', centri_ids: [] });
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
    setForm(prev => ({
      ...prev,
      centri_ids: prev.centri_ids.includes(centroId)
        ? prev.centri_ids.filter(id => id !== centroId)
        : [...prev.centri_ids, centroId]
    }));
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
                <label key={centro.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.centri_ids.includes(centro.id)}
                    onChange={() => toggleCentro(centro.id)}
                  />
                  <span className="text-sm">{centro.nome}</span>
                </label>
              ))}
            </div>
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