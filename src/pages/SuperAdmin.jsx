import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Building, Pencil, Trash2, Users, Building2, Calendar, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SuperAdmin({ user }) {
  const [aziende, setAziende] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogProprietaOpen, setDialogProprietaOpen] = useState(false);
  const [editingAzienda, setEditingAzienda] = useState(null);
  const [aziendaPerInvito, setAziendaPerInvito] = useState(null);

  const [formAzienda, setFormAzienda] = useState({
    nome: '',
    ragione_sociale: '',
    partita_iva: '',
    email_contatto: '',
    telefono: '',
    indirizzo: '',
    citta: '',
    provincia: '',
    cap: '',
    data_attivazione: new Date().toISOString().split('T')[0],
    attiva: true,
    note: '',
    proprieta_email: '',
    proprieta_nome: ''
  });

  const [formProprieta, setFormProprieta] = useState({
    full_name: '',
    email: ''
  });

  useEffect(() => {
    if (user?.tipo_account === 'super_admin') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const aziendeData = await base44.entities.Azienda.list();
      setAziende(aziendeData);

      // Carica statistiche per ogni azienda
      const statsPromises = aziendeData.map(async (azienda) => {
        const [centri, utenti] = await Promise.all([
          base44.entities.CentroCommerciale.filter({ azienda_id: azienda.id }),
          base44.entities.User.filter({ azienda_id: azienda.id })
        ]);
        return {
          id: azienda.id,
          centri: centri.length,
          utenti: utenti.length
        };
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap = {};
      statsResults.forEach(stat => {
        statsMap[stat.id] = stat;
      });
      setStats(statsMap);
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAzienda) {
        const { proprieta_email, proprieta_nome, ...aziendaData } = formAzienda;
        await base44.entities.Azienda.update(editingAzienda.id, aziendaData);
        toast.success('Azienda aggiornata');
      } else {
        const { proprieta_email, proprieta_nome, ...aziendaData } = formAzienda;
        const nuovaAzienda = await base44.entities.Azienda.create(aziendaData);
        
        // Invita automaticamente la proprietà se email e nome sono forniti
        if (proprieta_email && proprieta_nome) {
          const response = await base44.functions.invoke('invitaProprieta', {
            email: proprieta_email,
            full_name: proprieta_nome,
            azienda_id: nuovaAzienda.id
          });
          
          if (response.data?.error) {
            toast.warning(`Azienda creata, ma errore nell'invito: ${response.data.error}`);
          } else {
            toast.success('Azienda creata e proprietà invitato con successo');
          }
        } else {
          toast.success('Azienda creata');
        }
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Errore salvataggio azienda:', error);
      toast.error('Errore nel salvataggio');
    }
  };

  const handleEdit = (azienda) => {
    setEditingAzienda(azienda);
    setFormAzienda({ ...azienda });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questa azienda? Verranno eliminati anche tutti i centri e le assegnazioni associate.')) return;
    try {
      await base44.entities.Azienda.delete(id);
      toast.success('Azienda eliminata');
      loadData();
    } catch (error) {
      console.error('Errore eliminazione azienda:', error);
      toast.error('Errore nell\'eliminazione');
    }
  };

  const handleInvitaProprieta = async (e) => {
    e.preventDefault();
    try {
      const response = await base44.functions.invoke('invitaProprieta', {
        email: formProprieta.email,
        full_name: formProprieta.full_name,
        azienda_id: aziendaPerInvito.id
      });

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }

      toast.success('Proprietà invitato con successo');
      setDialogProprietaOpen(false);
      setFormProprieta({ full_name: '', email: '' });
      setAziendaPerInvito(null);
      await loadData();
    } catch (error) {
      console.error('Errore:', error);
      toast.error(error.response?.data?.error || error.message || 'Errore nell\'invito');
    }
  };

  const resetForm = () => {
    setFormAzienda({
      nome: '',
      ragione_sociale: '',
      partita_iva: '',
      email_contatto: '',
      telefono: '',
      indirizzo: '',
      citta: '',
      provincia: '',
      cap: '',
      data_attivazione: new Date().toISOString().split('T')[0],
      attiva: true,
      note: '',
      proprieta_email: '',
      proprieta_nome: ''
    });
    setEditingAzienda(null);
  };

  if (user?.tipo_account !== 'super_admin') {
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Super Admin</h1>
          <p className="text-slate-600">Gestione Aziende Clienti</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuova Azienda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAzienda ? 'Modifica Azienda' : 'Nuova Azienda Cliente'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="nome">Nome Azienda *</Label>
                  <Input
                    id="nome"
                    value={formAzienda.nome}
                    onChange={(e) => setFormAzienda({ ...formAzienda, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="ragione_sociale">Ragione Sociale</Label>
                  <Input
                    id="ragione_sociale"
                    value={formAzienda.ragione_sociale}
                    onChange={(e) => setFormAzienda({ ...formAzienda, ragione_sociale: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="partita_iva">Partita IVA</Label>
                  <Input
                    id="partita_iva"
                    value={formAzienda.partita_iva}
                    onChange={(e) => setFormAzienda({ ...formAzienda, partita_iva: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email_contatto">Email Contatto *</Label>
                  <Input
                    id="email_contatto"
                    type="email"
                    value={formAzienda.email_contatto}
                    onChange={(e) => setFormAzienda({ ...formAzienda, email_contatto: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="telefono">Telefono</Label>
                  <Input
                    id="telefono"
                    value={formAzienda.telefono}
                    onChange={(e) => setFormAzienda({ ...formAzienda, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="data_attivazione">Data Attivazione</Label>
                  <Input
                    id="data_attivazione"
                    type="date"
                    value={formAzienda.data_attivazione}
                    onChange={(e) => setFormAzienda({ ...formAzienda, data_attivazione: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="indirizzo">Indirizzo</Label>
                  <Input
                    id="indirizzo"
                    value={formAzienda.indirizzo}
                    onChange={(e) => setFormAzienda({ ...formAzienda, indirizzo: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="citta">Città</Label>
                  <Input
                    id="citta"
                    value={formAzienda.citta}
                    onChange={(e) => setFormAzienda({ ...formAzienda, citta: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="provincia">Provincia</Label>
                  <Input
                    id="provincia"
                    value={formAzienda.provincia}
                    onChange={(e) => setFormAzienda({ ...formAzienda, provincia: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cap">CAP</Label>
                  <Input
                    id="cap"
                    value={formAzienda.cap}
                    onChange={(e) => setFormAzienda({ ...formAzienda, cap: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    value={formAzienda.note}
                    onChange={(e) => setFormAzienda({ ...formAzienda, note: e.target.value })}
                    rows={3}
                  />
                </div>
                {!editingAzienda && (
                  <>
                    <div className="col-span-2 pt-4 border-t border-slate-200">
                      <h3 className="font-medium text-slate-800 mb-3">Invita Proprietà (Opzionale)</h3>
                    </div>
                    <div>
                      <Label htmlFor="proprieta_nome">Nome Proprietà</Label>
                      <Input
                        id="proprieta_nome"
                        value={formAzienda.proprieta_nome}
                        onChange={(e) => setFormAzienda({ ...formAzienda, proprieta_nome: e.target.value })}
                        placeholder="es. Mario Rossi"
                      />
                    </div>
                    <div>
                      <Label htmlFor="proprieta_email">Email Proprietà</Label>
                      <Input
                        id="proprieta_email"
                        type="email"
                        value={formAzienda.proprieta_email}
                        onChange={(e) => setFormAzienda({ ...formAzienda, proprieta_email: e.target.value })}
                        placeholder="email@esempio.com"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Se compilato, verrà automaticamente inviato un invito via email
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="attiva"
                  checked={formAzienda.attiva}
                  onChange={(e) => setFormAzienda({ ...formAzienda, attiva: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="attiva" className="cursor-pointer">Azienda attiva</Label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingAzienda ? 'Aggiorna' : 'Crea'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {aziende.length === 0 ? (
        <Card className="bg-white border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="w-16 h-16 text-slate-300 mb-4" />
            <p className="text-slate-500 text-center mb-4">
              Nessuna azienda cliente registrata
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crea la prima azienda
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aziende.map((azienda) => {
            const aziendaStats = stats[azienda.id] || { centri: 0, utenti: 0 };
            return (
              <Card key={azienda.id} className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <Building className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-lg">{azienda.nome}</h3>
                        {azienda.citta && (
                          <p className="text-sm text-slate-600">{azienda.citta}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setAziendaPerInvito(azienda);
                          setDialogProprietaOpen(true);
                        }}
                        className="text-green-600"
                        title="Invita Proprietà"
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(azienda)}
                        className="text-blue-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(azienda.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    {azienda.email_contatto && (
                      <p className="text-sm text-slate-600">📧 {azienda.email_contatto}</p>
                    )}
                    {azienda.telefono && (
                      <p className="text-sm text-slate-600">📞 {azienda.telefono}</p>
                    )}
                    {azienda.partita_iva && (
                      <p className="text-sm text-slate-600">P.IVA: {azienda.partita_iva}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-xs text-slate-500">Centri</p>
                        <p className="font-semibold text-slate-800">{aziendaStats.centri}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-xs text-slate-500">Utenti</p>
                        <p className="font-semibold text-slate-800">{aziendaStats.utenti}</p>
                      </div>
                    </div>
                  </div>

                  {azienda.data_attivazione && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <p className="text-xs text-slate-500">
                        Attivato il {format(new Date(azienda.data_attivazione), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  )}

                  {!azienda.attiva && (
                    <div className="mt-3 px-2 py-1 bg-red-50 text-red-700 text-xs rounded-lg text-center">
                      Non attiva
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog Invita Proprietà */}
      <Dialog open={dialogProprietaOpen} onOpenChange={(open) => {
        setDialogProprietaOpen(open);
        if (!open) {
          setFormProprieta({ full_name: '', email: '' });
          setAziendaPerInvito(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invita Proprietà per {aziendaPerInvito?.nome}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvitaProprieta} className="space-y-4">
            <div>
              <Label htmlFor="prop_full_name">Nome e Cognome *</Label>
              <Input
                id="prop_full_name"
                value={formProprieta.full_name}
                onChange={(e) => setFormProprieta({ ...formProprieta, full_name: e.target.value })}
                placeholder="es. Mario Rossi"
                required
              />
            </div>
            <div>
              <Label htmlFor="prop_email">Email *</Label>
              <Input
                id="prop_email"
                type="email"
                value={formProprieta.email}
                onChange={(e) => setFormProprieta({ ...formProprieta, email: e.target.value })}
                placeholder="email@esempio.com"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Verrà inviato un invito via email al proprietario
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogProprietaOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                Invita Proprietà
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}