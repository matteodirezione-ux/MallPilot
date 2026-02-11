import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Building2, Users, Pencil, Trash2, UserPlus, Target } from 'lucide-react';
import { toast } from 'sonner';

export default function Gestione({ user }) {
  const [centri, setCentri] = useState([]);
  const [utenti, setUtenti] = useState([]);
  const [assegnazioni, setAssegnazioni] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogCentroOpen, setDialogCentroOpen] = useState(false);
  const [dialogUtenteOpen, setDialogUtenteOpen] = useState(false);
  const [dialogBudgetOpen, setDialogBudgetOpen] = useState(false);
  const [editingCentro, setEditingCentro] = useState(null);
  const [editingDirettore, setEditingDirettore] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);

  const [formCentro, setFormCentro] = useState({
    nome: '',
    indirizzo: '',
    citta: '',
    provincia: '',
    cap: '',
    numero_spazi_totali: '',
    attivo: true
  });

  const [formUtente, setFormUtente] = useState({
    full_name: '',
    email: '',
    role: 'user'
  });

  const [formBudget, setFormBudget] = useState({
    centro_id: '',
    anno: new Date().getFullYear(),
    importo_budget: ''
  });

  const [assegnazioniForm, setAssegnazioniForm] = useState({
    user_email: '',
    centri_selezionati: []
  });

  useEffect(() => {
    if (user?.tipo_account === 'proprieta') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [centriData, utentiData, assegnazioniData, budgetsData] = await Promise.all([
        base44.entities.CentroCommerciale.list(),
        base44.entities.User.list(),
        base44.entities.Assegnazione.list(),
        base44.entities.Budget.list()
      ]);
      setCentri(centriData);
      setUtenti(utentiData.filter(u => u.tipo_account === 'direttore'));
      setAssegnazioni(assegnazioniData);
      setBudgets(budgetsData);
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCentro = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formCentro,
        numero_spazi_totali: formCentro.numero_spazi_totali ? parseInt(formCentro.numero_spazi_totali) : null
      };

      if (editingCentro) {
        await base44.entities.CentroCommerciale.update(editingCentro.id, dataToSave);
        toast.success('Centro aggiornato');
      } else {
        await base44.entities.CentroCommerciale.create(dataToSave);
        toast.success('Centro creato');
      }

      setDialogCentroOpen(false);
      resetFormCentro();
      loadData();
    } catch (error) {
      console.error('Errore salvataggio centro:', error);
      toast.error('Errore nel salvataggio del centro');
    }
  };

  const handleInvitaUtente = async (e) => {
    e.preventDefault();
    
    if (assegnazioniForm.centri_selezionati.length === 0) {
      toast.error('Seleziona almeno un centro');
      return;
    }

    try {
      if (editingDirettore) {
        // Aggiorna nome tramite backend function
        const updateResponse = await base44.functions.invoke('updateDirettore', {
          userId: editingDirettore.id,
          full_name: formUtente.full_name
        });

        if (updateResponse.data?.error) {
          throw new Error(updateResponse.data.error);
        }

        // Aggiorna assegnazioni centri
        const assegnazioniAttuali = assegnazioni.filter(a => a.user_email === editingDirettore.email);
        const centriAttualiIds = assegnazioniAttuali.map(a => a.centro_id);
        
        const daRimuovere = assegnazioniAttuali.filter(a => !assegnazioniForm.centri_selezionati.includes(a.centro_id));
        const daAggiungere = assegnazioniForm.centri_selezionati.filter(id => !centriAttualiIds.includes(id));
        
        await Promise.all([
          ...daRimuovere.map(a => base44.entities.Assegnazione.delete(a.id)),
          ...daAggiungere.map(centro_id => base44.entities.Assegnazione.create({
            user_email: editingDirettore.email,
            centro_id
          }))
        ]);

        toast.success('Direttore aggiornato');
      } else {
        // Invita nuovo direttore
        await base44.users.inviteUser(formUtente.email, formUtente.role);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const users = await base44.entities.User.filter({ email: formUtente.email });
        if (users.length === 0) {
          throw new Error('Utente non trovato dopo invito');
        }

        const newUser = users[0];
        await base44.entities.User.update(newUser.id, {
          tipo_account: 'direttore',
          full_name: formUtente.full_name
        });
        
        await Promise.all(
          assegnazioniForm.centri_selezionati.map(centro_id =>
            base44.entities.Assegnazione.create({
              user_email: formUtente.email,
              centro_id
            })
          )
        );

        toast.success('Direttore invitato');
      }
      
      setDialogUtenteOpen(false);
      resetFormUtente();
      await loadData();
    } catch (error) {
      console.error('Errore:', error);
      toast.error(error.message || 'Errore nel salvataggio');
    }
  };

  const handleSubmitBudget = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formBudget,
        anno: parseInt(formBudget.anno),
        importo_budget: parseFloat(formBudget.importo_budget)
      };

      if (editingBudget) {
        await base44.entities.Budget.update(editingBudget.id, dataToSave);
        toast.success('Budget aggiornato');
      } else {
        await base44.entities.Budget.create(dataToSave);
        toast.success('Budget creato');
      }

      setDialogBudgetOpen(false);
      resetFormBudget();
      loadData();
    } catch (error) {
      console.error('Errore salvataggio budget:', error);
      toast.error('Errore nel salvataggio del budget');
    }
  };

  const handleDeleteCentro = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questo centro?')) return;
    try {
      await base44.entities.CentroCommerciale.delete(id);
      toast.success('Centro eliminato');
      loadData();
    } catch (error) {
      console.error('Errore eliminazione centro:', error);
      toast.error('Errore nell\'eliminazione del centro');
    }
  };

  const handleDeleteAssegnazione = async (id) => {
    if (!confirm('Sei sicuro di voler rimuovere questa assegnazione?')) return;
    try {
      await base44.entities.Assegnazione.delete(id);
      toast.success('Assegnazione rimossa');
      loadData();
    } catch (error) {
      console.error('Errore rimozione assegnazione:', error);
      toast.error('Errore nella rimozione dell\'assegnazione');
    }
  };

  const handleEditCentro = (centro) => {
    setEditingCentro(centro);
    setFormCentro({ ...centro });
    setDialogCentroOpen(true);
  };

  const handleEditBudget = (budget) => {
    setEditingBudget(budget);
    setFormBudget({ ...budget });
    setDialogBudgetOpen(true);
  };

  const resetFormCentro = () => {
    setFormCentro({
      nome: '',
      indirizzo: '',
      citta: '',
      provincia: '',
      cap: '',
      numero_spazi_totali: '',
      attivo: true
    });
    setEditingCentro(null);
  };

  const handleEditDirettore = (direttore) => {
    const centriAssegnatiIds = assegnazioni
      .filter(a => a.user_email === direttore.email)
      .map(a => a.centro_id);
    
    setEditingDirettore(direttore);
    setFormUtente({
      full_name: direttore.full_name || '',
      email: direttore.email || '',
      role: 'user'
    });
    setAssegnazioniForm({
      user_email: direttore.email || '',
      centri_selezionati: centriAssegnatiIds
    });
    setDialogUtenteOpen(true);
  };

  const resetFormUtente = () => {
    setFormUtente({
      full_name: '',
      email: '',
      role: 'user'
    });
    setAssegnazioniForm({
      user_email: '',
      centri_selezionati: []
    });
    setEditingDirettore(null);
  };

  const resetFormBudget = () => {
    setFormBudget({
      centro_id: '',
      anno: new Date().getFullYear(),
      importo_budget: ''
    });
    setEditingBudget(null);
  };

  const getCentriAssegnati = (userEmail) => {
    const centriIds = assegnazioni
      .filter(a => a.user_email === userEmail)
      .map(a => a.centro_id);
    return centri.filter(c => centriIds.includes(c.id));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (user?.tipo_account !== 'proprieta') {
    return (
      <div className="p-8">
        <Card className="bg-white border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-slate-500">Accesso non autorizzato</p>
          </CardContent>
        </Card>
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
        <p className="text-slate-600">Amministrazione centri commerciali e utenti</p>
      </div>

      <Tabs defaultValue="centri" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="centri">Centri Commerciali</TabsTrigger>
          <TabsTrigger value="direttori">Direttori</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
        </TabsList>

        {/* Tab Centri */}
        <TabsContent value="centri">
          <div className="flex justify-end mb-4">
            <Dialog open={dialogCentroOpen} onOpenChange={(open) => {
              setDialogCentroOpen(open);
              if (!open) resetFormCentro();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuovo Centro
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingCentro ? 'Modifica Centro' : 'Nuovo Centro Commerciale'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitCentro} className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome Centro *</Label>
                    <Input
                      id="nome"
                      value={formCentro.nome}
                      onChange={(e) => setFormCentro({ ...formCentro, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="indirizzo">Indirizzo</Label>
                      <Input
                        id="indirizzo"
                        value={formCentro.indirizzo}
                        onChange={(e) => setFormCentro({ ...formCentro, indirizzo: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="citta">Città *</Label>
                      <Input
                        id="citta"
                        value={formCentro.citta}
                        onChange={(e) => setFormCentro({ ...formCentro, citta: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="provincia">Provincia</Label>
                      <Input
                        id="provincia"
                        value={formCentro.provincia}
                        onChange={(e) => setFormCentro({ ...formCentro, provincia: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cap">CAP</Label>
                      <Input
                        id="cap"
                        value={formCentro.cap}
                        onChange={(e) => setFormCentro({ ...formCentro, cap: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="numero_spazi_totali">Numero Spazi Totali</Label>
                      <Input
                        id="numero_spazi_totali"
                        type="number"
                        value={formCentro.numero_spazi_totali}
                        onChange={(e) => setFormCentro({ ...formCentro, numero_spazi_totali: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="attivo"
                      checked={formCentro.attivo}
                      onChange={(e) => setFormCentro({ ...formCentro, attivo: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="attivo" className="cursor-pointer">Centro attivo</Label>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogCentroOpen(false)}>
                      Annulla
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      {editingCentro ? 'Aggiorna' : 'Crea'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {centri.map(centro => (
              <Card key={centro.id} className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{centro.nome}</h3>
                        <p className="text-sm text-slate-600">{centro.citta}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditCentro(centro)}
                        className="text-blue-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCentro(centro.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {centro.indirizzo && (
                    <p className="text-sm text-slate-600 mb-2">{centro.indirizzo}</p>
                  )}
                  {centro.numero_spazi_totali && (
                    <p className="text-sm text-slate-600">
                      Spazi totali: {centro.numero_spazi_totali}
                    </p>
                  )}
                  {!centro.attivo && (
                    <div className="mt-3 px-2 py-1 bg-red-50 text-red-700 text-xs rounded-lg text-center">
                      Non attivo
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab Direttori */}
        <TabsContent value="direttori">
          <div className="flex justify-end mb-4">
            <Dialog open={dialogUtenteOpen} onOpenChange={(open) => {
              setDialogUtenteOpen(open);
              if (!open) resetFormUtente();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invita Direttore
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingDirettore ? 'Modifica Direttore' : 'Invita Nuovo Direttore'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleInvitaUtente} className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Nome e Cognome *</Label>
                    <Input
                      id="full_name"
                      value={formUtente.full_name}
                      onChange={(e) => setFormUtente({ ...formUtente, full_name: e.target.value })}
                      placeholder="es. Mario Rossi"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formUtente.email}
                      onChange={(e) => setFormUtente({ ...formUtente, email: e.target.value })}
                      placeholder="email@esempio.com"
                      disabled={editingDirettore ? true : false}
                      className={editingDirettore ? "bg-slate-50" : ""}
                      required
                    />
                    {editingDirettore && (
                      <p className="text-xs text-slate-500 mt-1">L'email non può essere modificata dopo la creazione</p>
                    )}
                  </div>
                  <div>
                    <Label>Assegna Centri *</Label>
                    <p className="text-sm text-slate-500 mb-2">
                      Seleziona i centri che il direttore potrà gestire
                    </p>
                    <div className="space-y-2 mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                      {centri.filter(c => c.attivo).length > 0 ? (
                        centri.filter(c => c.attivo).map(centro => (
                          <div key={centro.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`centro-${centro.id}`}
                              checked={assegnazioniForm.centri_selezionati.includes(centro.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAssegnazioniForm({
                                    ...assegnazioniForm,
                                    centri_selezionati: [...assegnazioniForm.centri_selezionati, centro.id]
                                  });
                                } else {
                                  setAssegnazioniForm({
                                    ...assegnazioniForm,
                                    centri_selezionati: assegnazioniForm.centri_selezionati.filter(id => id !== centro.id)
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <Label htmlFor={`centro-${centro.id}`} className="cursor-pointer text-sm">
                              {centro.nome}
                            </Label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-2">
                          Nessun centro disponibile. Crea prima un centro commerciale.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogUtenteOpen(false)}>
                      Annulla
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {editingDirettore ? 'Aggiorna' : 'Invita Direttore'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {utenti.map(utente => {
              const centriAssegnati = getCentriAssegnati(utente.email);
              const assegnazioniUtente = assegnazioni.filter(a => a.user_email === utente.email);

              return (
                <Card key={utente.id} className="bg-white border-slate-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-800">{utente.full_name}</h3>
                            <p className="text-sm text-slate-600">{utente.email}</p>
                          </div>
                        </div>
                        <div className="ml-13">
                          <p className="text-sm font-medium text-slate-700 mb-2">
                            Centri Assegnati ({centriAssegnati.length}):
                          </p>
                          {centriAssegnati.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {centriAssegnati.map(centro => {
                                const assegnazione = assegnazioniUtente.find(a => a.centro_id === centro.id);
                                return (
                                  <div
                                    key={centro.id}
                                    className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-800 rounded-lg text-sm"
                                  >
                                    <span>{centro.nome}</span>
                                    <button
                                      onClick={() => handleDeleteAssegnazione(assegnazione.id)}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">Nessun centro assegnato</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditDirettore(utente)}
                        className="text-blue-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab Budget */}
        <TabsContent value="budget">
          <div className="flex justify-end mb-4">
            <Dialog open={dialogBudgetOpen} onOpenChange={(open) => {
              setDialogBudgetOpen(open);
              if (!open) resetFormBudget();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuovo Budget
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingBudget ? 'Modifica Budget' : 'Nuovo Budget Annuale'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitBudget} className="space-y-4">
                  <div>
                    <Label htmlFor="centro_id">Centro *</Label>
                    <select
                      id="centro_id"
                      value={formBudget.centro_id}
                      onChange={(e) => setFormBudget({ ...formBudget, centro_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    >
                      <option value="">Seleziona centro</option>
                      {centri.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="anno">Anno *</Label>
                    <Input
                      id="anno"
                      type="number"
                      value={formBudget.anno}
                      onChange={(e) => setFormBudget({ ...formBudget, anno: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="importo_budget">Importo Budget (€) *</Label>
                    <Input
                      id="importo_budget"
                      type="number"
                      step="0.01"
                      value={formBudget.importo_budget}
                      onChange={(e) => setFormBudget({ ...formBudget, importo_budget: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogBudgetOpen(false)}>
                      Annulla
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      {editingBudget ? 'Aggiorna' : 'Crea'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets.map(budget => {
              const centro = centri.find(c => c.id === budget.centro_id);
              return (
                <Card key={budget.id} className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                          <Target className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800">{centro?.nome}</h3>
                          <p className="text-sm text-slate-600">Anno {budget.anno}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditBudget(budget)}
                          className="text-blue-600"
                        >
                          <Pencil className="w-4 h-4" />
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
    </div>
  );
}