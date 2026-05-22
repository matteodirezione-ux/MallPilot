import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, Pencil, Trash2, TrendingUp, Calendar, DollarSign, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Clienti({ centroSelezionato }) {
  const [clienti, setClienti] = useState([]);
  const [clientiStats, setClientiStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('alfabetico');

  const [formData, setFormData] = useState({
    ragione_sociale: '',
    partita_iva: '',
    codice_fiscale: '',
    email: '',
    pec: '',
    telefono: '',
    indirizzo: '',
    citta: '',
    provincia: '',
    cap: '',
    referente_nome: '',
    referente_telefono: '',
    referente_email: '',
    note: ''
  });
  const [wizardStep, setWizardStep] = useState(0);
  const [detailCliente, setDetailCliente] = useState(null);

  useEffect(() => {
    if (centroSelezionato && centroSelezionato.id) {
      loadClienti();
    }
  }, [centroSelezionato]);

  const loadClienti = async () => {
    try {
      setLoading(true);
      const isTutti = centroSelezionato?.id === 'tutti';

      // Filtra clienti direttamente per centro_id
      const [clientiFiltrati, prenotazioni] = await Promise.all([
        isTutti
          ? base44.entities.Cliente.list()
          : base44.entities.Cliente.filter({ centro_id: centroSelezionato.id }),
        isTutti
          ? base44.entities.Prenotazione.list()
          : base44.entities.Prenotazione.filter({ centro_id: centroSelezionato.id })
      ]);
      
      setClienti(clientiFiltrati);
      
      // Calcola statistiche per ogni cliente
      const stats = {};
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      for (const cliente of clientiFiltrati) {
        const clientePrenotazioni = prenotazioni.filter(
          p => p.cliente_id === cliente.id && p.stato !== 'cancellata'
        );

        const prenotazioniAnno = clientePrenotazioni.filter(
          p => new Date(p.data_inizio) >= oneYearAgo
        );

        const incassoAnno = prenotazioniAnno.reduce(
          (sum, p) => sum + (p.prezzo_totale || 0), 0
        );

        const ultimaPrenotazione = clientePrenotazioni
          .sort((a, b) => new Date(b.data_fine) - new Date(a.data_fine))[0];

        const giorniDaUltimoAffitto = ultimaPrenotazione
          ? differenceInDays(new Date(), new Date(ultimaPrenotazione.data_fine))
          : null;

        stats[cliente.id] = {
          incassoAnno,
          numeroAffitti: clientePrenotazioni.length,
          giorniDaUltimoAffitto,
          ultimaPrenotazione
        };
      }

      setClientiStats(stats);
    } catch (error) {
      console.error('Errore caricamento clienti:', error);
      toast.error('Errore nel caricamento dei clienti');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        await base44.entities.Cliente.update(editingCliente.id, formData);
        toast.success('Cliente aggiornato con successo');
      } else {
        const centroId = centroSelezionato?.id !== 'tutti' ? centroSelezionato?.id : null;
        if (!centroId) {
          toast.error('Seleziona un centro specifico per creare un cliente');
          return;
        }
        await base44.entities.Cliente.create({ ...formData, centro_id: centroId });
        toast.success('Cliente creato con successo');
      }

      setDialogOpen(false);
      resetForm();
      loadClienti();
    } catch (error) {
      console.error('Errore salvataggio cliente:', error);
      toast.error('Errore nel salvataggio del cliente');
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({ ...cliente });
    setWizardStep(0);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questo cliente?')) return;
    try {
      await base44.entities.Cliente.delete(id);
      toast.success('Cliente eliminato');
      loadClienti();
    } catch (error) {
      console.error('Errore eliminazione cliente:', error);
      toast.error('Errore nell\'eliminazione del cliente');
    }
  };

  const resetForm = () => {
    setFormData({
      ragione_sociale: '',
      partita_iva: '',
      codice_fiscale: '',
      email: '',
      pec: '',
      telefono: '',
      indirizzo: '',
      citta: '',
      provincia: '',
      cap: '',
      referente_nome: '',
      referente_telefono: '',
      referente_email: '',
      note: ''
    });
    setEditingCliente(null);
    setWizardStep(0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };

  const filteredClienti = clienti
    .filter(cliente =>
      cliente.ragione_sociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.partita_iva?.includes(searchTerm)
    )
    .sort((a, b) => {
      const statsA = clientiStats[a.id] || {};
      const statsB = clientiStats[b.id] || {};
      
      switch (sortBy) {
        case 'alfabetico':
          return (a.ragione_sociale || '').localeCompare(b.ragione_sociale || '', 'it');
        case 'incassoAnno':
          return (statsB.incassoAnno || 0) - (statsA.incassoAnno || 0);
        case 'numeroAffitti':
          return (statsB.numeroAffitti || 0) - (statsA.numeroAffitti || 0);
        case 'ultimoAffitto':
          const giorniA = statsA.giorniDaUltimoAffitto !== null ? statsA.giorniDaUltimoAffitto : Infinity;
          const giorniB = statsB.giorniDaUltimoAffitto !== null ? statsB.giorniDaUltimoAffitto : Infinity;
          return giorniA - giorniB;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
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
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Clienti</h1>
          <p className="text-slate-600">Gestione anagrafica clienti business</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCliente ? 'Modifica Cliente' : 'Nuovo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={wizardStep === 2 ? handleSubmit : (e) => { e.preventDefault(); setWizardStep(wizardStep + 1); }}>
              {/* Progress Indicator */}
              <div className="mb-6 flex gap-2">
                {['Dati Azienda', 'Indirizzo', 'Referente'].map((label, idx) => (
                  <div key={idx} className="flex-1">
                    <div className={`h-1 rounded-full transition-colors ${idx <= wizardStep ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                    <p className={`text-xs mt-1 font-medium ${idx <= wizardStep ? 'text-blue-600' : 'text-slate-500'}`}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Step 0: Dati Azienda */}
              {wizardStep === 0 && (
                <div className="space-y-3">
                  {[
                    { label: 'Ragione Sociale *', key: 'ragione_sociale', required: true },
                    { label: 'Partita IVA *', key: 'partita_iva', required: true },
                    { label: 'Codice Fiscale', key: 'codice_fiscale' },
                    { label: 'Email *', key: 'email', type: 'email', required: true },
                    { label: 'PEC', key: 'pec' },
                    { label: 'Telefono', key: 'telefono' },
                  ].map(({ label, key, type = 'text', required }) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="w-36 flex-shrink-0 text-sm font-medium text-slate-700">{label}</label>
                      <div className="flex-1 min-w-0">
                        <Input
                          type={type}
                          value={formData[key] || ''}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          required={required}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 1: Indirizzo */}
              {wizardStep === 1 && (
                <div className="space-y-3">
                  {[
                    { label: 'Indirizzo *', key: 'indirizzo', required: true },
                    { label: 'Città *', key: 'citta', required: true },
                    { label: 'Provincia *', key: 'provincia', required: true },
                    { label: 'CAP *', key: 'cap', required: true },
                  ].map(({ label, key, required }) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="w-36 flex-shrink-0 text-sm font-medium text-slate-700">{label}</label>
                      <div className="flex-1 min-w-0">
                        <Input
                          value={formData[key] || ''}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          required={required}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 2: Referente */}
              {wizardStep === 2 && (
                <div className="space-y-3">
                  {[
                    { label: 'Nome Referente *', key: 'referente_nome', required: true },
                    { label: 'Telefono', key: 'referente_telefono' },
                    { label: 'Email Referente *', key: 'referente_email', type: 'email', required: true },
                  ].map(({ label, key, type = 'text', required }) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="w-36 flex-shrink-0 text-sm font-medium text-slate-700">{label}</label>
                      <div className="flex-1 min-w-0">
                        <Input
                          type={type}
                          value={formData[key] || ''}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          required={required}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-start gap-3 pt-1">
                    <label className="w-36 flex-shrink-0 text-sm font-medium text-slate-700 pt-2">Note</label>
                    <div className="flex-1 min-w-0">
                      <Textarea
                        value={formData.note || ''}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-3 pt-4 mt-4 border-t">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Annulla
                  </Button>
                  {wizardStep > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setWizardStep(wizardStep - 1)}>
                      Indietro
                    </Button>
                  )}
                </div>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">
                  {wizardStep === 2 ? (editingCliente ? 'Aggiorna' : 'Crea') : 'Avanti'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6 flex gap-4 items-center">
        <Input
          placeholder="Cerca clienti per ragione sociale, email o P.IVA..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-md text-sm text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            <option value="alfabetico">Alfabetico</option>
            <option value="incassoAnno">Incasso Anno</option>
            <option value="numeroAffitti">Numero Affitti</option>
            <option value="ultimoAffitto">Ultimo Affitto</option>
          </select>
        </div>
      </div>

      {filteredClienti.length === 0 ? (
        <Card className="bg-white border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-16 h-16 text-slate-300 mb-4" />
            <p className="text-slate-500 text-center mb-4">
              {searchTerm ? 'Nessun cliente trovato' : 'Nessun cliente registrato'}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi il primo cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredClienti.map((cliente) => {
            const stats = clientiStats[cliente.id] || {};
            return (
              <Card key={cliente.id} className="bg-white border-slate-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setDetailCliente(cliente)}>
                <CardContent className="p-3">
                  {/* Riga 1: nome + cards stats a destra + azioni */}
                  <div className="flex items-center gap-3">
                    {/* Sinistra: nome + referente */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-slate-800">{cliente.ragione_sociale}</h3>
                      {cliente.referente_nome && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          👤 {cliente.referente_nome}
                          {cliente.referente_telefono && ` · ${cliente.referente_telefono}`}
                          {cliente.referente_email && ` · ${cliente.referente_email}`}
                        </p>
                      )}
                    </div>
                    {/* Destra: cards stats */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center justify-between gap-4 p-2 bg-green-50 rounded-lg min-w-[160px]">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <p className="text-xs text-slate-500">Incasso {new Date().getFullYear()}</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{formatCurrency(stats.incassoAnno || 0)}</p>
                      </div>
                      <div className="flex items-center justify-between gap-4 p-2 bg-blue-50 rounded-lg min-w-[130px]">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          <p className="text-xs text-slate-500">Affitti totali</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{stats.numeroAffitti || 0}</p>
                      </div>
                      <div className="flex items-center justify-between gap-4 p-2 bg-purple-50 rounded-lg min-w-[140px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-purple-600" />
                          <p className="text-xs text-slate-500">Ultimo affitto</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-800">
                          {stats.giorniDaUltimoAffitto !== null ? `${stats.giorniDaUltimoAffitto}gg fa` : 'Mai'}
                        </p>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(cliente)} className="text-blue-600 h-7 w-7">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(cliente.id)} className="text-red-600 h-7 w-7">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog dettaglio cliente */}
      <Dialog open={!!detailCliente} onOpenChange={(open) => { if (!open) setDetailCliente(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailCliente?.ragione_sociale}</DialogTitle>
          </DialogHeader>
          {detailCliente && (
            <div className="space-y-4 text-sm">
              {/* Dati azienda */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Dati Azienda</p>
                <div className="space-y-1.5">
                  {detailCliente.partita_iva && <Row label="Partita IVA" value={detailCliente.partita_iva} />}
                  {detailCliente.codice_fiscale && <Row label="Cod. Fiscale" value={detailCliente.codice_fiscale} />}
                  {detailCliente.email && <Row label="Email" value={detailCliente.email} />}
                  {detailCliente.pec && <Row label="PEC" value={detailCliente.pec} />}
                  {detailCliente.telefono && <Row label="Telefono" value={detailCliente.telefono} />}
                </div>
              </div>
              {/* Indirizzo */}
              {(detailCliente.indirizzo || detailCliente.citta) && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Indirizzo</p>
                  <div className="space-y-1.5">
                    {detailCliente.indirizzo && <Row label="Indirizzo" value={detailCliente.indirizzo} />}
                    {detailCliente.citta && <Row label="Città" value={`${detailCliente.citta}${detailCliente.provincia ? ` (${detailCliente.provincia})` : ''}${detailCliente.cap ? ` - ${detailCliente.cap}` : ''}`} />}
                  </div>
                </div>
              )}
              {/* Referente */}
              {(detailCliente.referente_nome || detailCliente.referente_email) && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Referente</p>
                  <div className="space-y-1.5">
                    {detailCliente.referente_nome && <Row label="Nome" value={detailCliente.referente_nome} />}
                    {detailCliente.referente_telefono && <Row label="Telefono" value={detailCliente.referente_telefono} />}
                    {detailCliente.referente_email && <Row label="Email" value={detailCliente.referente_email} />}
                  </div>
                </div>
              )}
              {/* Note */}
              {detailCliente.note && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Note</p>
                  <p className="text-slate-700 bg-slate-50 rounded-lg p-3">{detailCliente.note}</p>
                </div>
              )}
              {/* Statistiche */}
              {clientiStats[detailCliente.id] && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Statistiche</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-green-50 rounded-lg text-center">
                      <p className="text-[10px] text-slate-500">Incasso {new Date().getFullYear()}</p>
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(clientiStats[detailCliente.id].incassoAnno || 0)}</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg text-center">
                      <p className="text-[10px] text-slate-500">Affitti totali</p>
                      <p className="text-sm font-semibold text-slate-800">{clientiStats[detailCliente.id].numeroAffitti || 0}</p>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-lg text-center">
                      <p className="text-[10px] text-slate-500">Ultimo affitto</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {clientiStats[detailCliente.id].giorniDaUltimoAffitto !== null ? `${clientiStats[detailCliente.id].giorniDaUltimoAffitto}gg fa` : 'Mai'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => { setDetailCliente(null); handleEdit(detailCliente); }}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Modifica
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  );
}