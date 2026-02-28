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
  const [sortBy, setSortBy] = useState('incassoAnno');

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
            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="azienda" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="azienda">Dati Azienda</TabsTrigger>
                  <TabsTrigger value="indirizzo">Indirizzo</TabsTrigger>
                  <TabsTrigger value="referente">Referente</TabsTrigger>
                </TabsList>

                {/* Dati Azienda */}
                <TabsContent value="azienda" className="space-y-3">
                  {[
                    { label: 'Ragione Sociale *', key: 'ragione_sociale', required: true },
                    { label: 'Partita IVA', key: 'partita_iva' },
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
                </TabsContent>

                {/* Indirizzo */}
                <TabsContent value="indirizzo" className="space-y-3">
                  {[
                    { label: 'Indirizzo', key: 'indirizzo' },
                    { label: 'Città', key: 'citta' },
                    { label: 'Provincia', key: 'provincia' },
                    { label: 'CAP', key: 'cap' },
                  ].map(({ label, key }) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="w-36 flex-shrink-0 text-sm font-medium text-slate-700">{label}</label>
                      <div className="flex-1 min-w-0">
                        <Input
                          value={formData[key] || ''}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </TabsContent>

                {/* Referente e Note */}
                <TabsContent value="referente" className="space-y-3">
                  {[
                    { label: 'Nome Referente', key: 'referente_nome' },
                    { label: 'Telefono', key: 'referente_telefono' },
                    { label: 'Email Referente', key: 'referente_email', type: 'email' },
                  ].map(({ label, key, type = 'text' }) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="w-36 flex-shrink-0 text-sm font-medium text-slate-700">{label}</label>
                      <div className="flex-1 min-w-0">
                        <Input
                          type={type}
                          value={formData[key] || ''}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
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
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Annulla
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">
                  {editingCliente ? 'Aggiorna' : 'Crea'}
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
              <Card key={cliente.id} className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-slate-800 mb-1">
                        {cliente.ragione_sociale}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                        {cliente.email && <span>📧 {cliente.email}</span>}
                        {cliente.telefono && <span>📞 {cliente.telefono}</span>}
                        {cliente.partita_iva && <span>P.IVA: {cliente.partita_iva}</span>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-600">Incasso {new Date().getFullYear()}</p>
                            <p className="text-lg font-semibold text-slate-800">
                              {formatCurrency(stats.incassoAnno || 0)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-600">Numero affitti totali</p>
                            <p className="text-lg font-semibold text-slate-800">
                              {stats.numeroAffitti || 0}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-600">Ultimo Affitto</p>
                            <p className="text-lg font-semibold text-slate-800">
                              {stats.giorniDaUltimoAffitto !== null
                                ? `${stats.giorniDaUltimoAffitto} giorni fa`
                                : 'Mai'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(cliente)}
                        className="text-blue-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cliente.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {cliente.referente_nome && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Referente:</span> {cliente.referente_nome}
                        {cliente.referente_telefono && ` • ${cliente.referente_telefono}`}
                        {cliente.referente_email && ` • ${cliente.referente_email}`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}