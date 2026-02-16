import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, Pencil, Trash2, TrendingUp, Calendar, DollarSign, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Clienti() {
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
    loadClienti();
  }, []);

  const loadClienti = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.Cliente.list();
      setClienti(data);
      
      // Calcola statistiche per ogni cliente
      const stats = {};
      const prenotazioni = await base44.entities.Prenotazione.list();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      for (const cliente of data) {
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
        await base44.entities.Cliente.create(formData);
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
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Dati Azienda</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="ragione_sociale">Ragione Sociale *</Label>
                    <Input
                      id="ragione_sociale"
                      value={formData.ragione_sociale}
                      onChange={(e) => setFormData({ ...formData, ragione_sociale: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="partita_iva">Partita IVA</Label>
                    <Input
                      id="partita_iva"
                      value={formData.partita_iva}
                      onChange={(e) => setFormData({ ...formData, partita_iva: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="codice_fiscale">Codice Fiscale</Label>
                    <Input
                      id="codice_fiscale"
                      value={formData.codice_fiscale}
                      onChange={(e) => setFormData({ ...formData, codice_fiscale: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pec">PEC</Label>
                    <Input
                      id="pec"
                      value={formData.pec}
                      onChange={(e) => setFormData({ ...formData, pec: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="telefono">Telefono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Indirizzo</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="indirizzo">Indirizzo</Label>
                    <Input
                      id="indirizzo"
                      value={formData.indirizzo}
                      onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="citta">Città</Label>
                    <Input
                      id="citta"
                      value={formData.citta}
                      onChange={(e) => setFormData({ ...formData, citta: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="provincia">Provincia</Label>
                    <Input
                      id="provincia"
                      value={formData.provincia}
                      onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cap">CAP</Label>
                    <Input
                      id="cap"
                      value={formData.cap}
                      onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Referente</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="referente_nome">Nome Referente</Label>
                    <Input
                      id="referente_nome"
                      value={formData.referente_nome}
                      onChange={(e) => setFormData({ ...formData, referente_nome: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="referente_telefono">Telefono Referente</Label>
                    <Input
                      id="referente_telefono"
                      value={formData.referente_telefono}
                      onChange={(e) => setFormData({ ...formData, referente_telefono: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="referente_email">Email Referente</Label>
                    <Input
                      id="referente_email"
                      type="email"
                      value={formData.referente_email}
                      onChange={(e) => setFormData({ ...formData, referente_email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Annulla
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
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