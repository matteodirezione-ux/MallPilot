import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Upload, Download, Trash2, FileCheck, Plus, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Documenti({ centroSelezionato }) {
  const [documenti, setDocumenti] = useState([]);
  const [prenotazioni, setPrenotazioni] = useState([]);
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [generatingContract, setGeneratingContract] = useState(false);
  const [selectedPrenotazione, setSelectedPrenotazione] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  const [formData, setFormData] = useState({
    tipo_documento: 'contratto',
    nome_file: '',
    file_url: '',
    prenotazione_id: '',
    cliente_id: '',
    note: ''
  });

  useEffect(() => {
    if (centroSelezionato && centroSelezionato.id) {
      loadData();
    }
  }, [centroSelezionato]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (!centroSelezionato || !centroSelezionato.id || !centroSelezionato.nome) {
        setLoading(false);
        return;
      }
      
      const isTutti = centroSelezionato?.id === 'tutti';
      const [documentiData, prenotazioniData, clientiData] = await Promise.all([
        isTutti
          ? base44.entities.Documento.list()
          : base44.entities.Documento.filter({ centro_id: centroSelezionato.id }),
        isTutti
          ? base44.entities.Prenotazione.list()
          : base44.entities.Prenotazione.filter({ centro_id: centroSelezionato.id }),
        base44.entities.Cliente.list()
      ]);
      setDocumenti(documentiData || []);
      setPrenotazioni(prenotazioniData || []);
      setClienti(clientiData || []);
    } catch (error) {
      console.error('Errore caricamento documenti:', error);
      toast.error('Errore nel caricamento dei documenti');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        file_url,
        nome_file: prev.nome_file || file.name
      }));
      toast.success('File caricato con successo');
    } catch (error) {
      console.error('Errore upload file:', error);
      toast.error('Errore nel caricamento del file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleGeneraContratto = async (prenotazione) => {
    try {
      setGeneratingContract(true);
      const cliente = clienti.find(c => c.id === prenotazione.cliente_id);
      const spazio = await base44.entities.SpazioExpo.filter({ id: prenotazione.spazio_id }).then(r => r[0]);

      // Genera il contenuto del contratto
      const contenutoContratto = `
CONTRATTO DI LOCAZIONE SPAZIO ESPOSITIVO

Centro Commerciale: ${centroSelezionato.nome}
Data: ${format(new Date(), 'dd/MM/yyyy', { locale: it })}

LOCATORE:
${centroSelezionato.nome}
${centroSelezionato.indirizzo || ''}
${centroSelezionato.citta || ''} ${centroSelezionato.cap || ''}

CONDUTTORE:
${cliente?.ragione_sociale || ''}
${cliente?.partita_iva ? 'P.IVA: ' + cliente.partita_iva : ''}
${cliente?.indirizzo || ''}
${cliente?.citta || ''} ${cliente?.cap || ''}
Email: ${cliente?.email || ''}
Telefono: ${cliente?.telefono || ''}

OGGETTO DEL CONTRATTO:
Spazio Numero: ${spazio?.numero_spazio || ''}
${spazio?.nome ? 'Nome: ' + spazio.nome : ''}
${spazio?.superficie_mq ? 'Superficie: ' + spazio.superficie_mq + ' m²' : ''}

DURATA:
Dal: ${format(new Date(prenotazione.data_inizio), 'dd/MM/yyyy', { locale: it })}
Al: ${format(new Date(prenotazione.data_fine), 'dd/MM/yyyy', { locale: it })}

CORRISPETTIVO:
Importo Totale: € ${prenotazione.prezzo_totale?.toFixed(2) || '0.00'}
${prenotazione.prezzo_mensile ? 'Canone Mensile: € ' + prenotazione.prezzo_mensile.toFixed(2) : ''}

${prenotazione.note ? 'NOTE:\n' + prenotazione.note : ''}

Il presente contratto viene redatto in duplice copia, una per ciascuna delle parti.

Firma Locatore: ________________    Firma Conduttore: ________________
      `;

      // Carica il file
      const blob = new Blob([contenutoContratto], { type: 'text/plain' });
      const fileName = `Contratto_${cliente?.ragione_sociale}_${spazio?.numero_spazio}_${format(new Date(), 'yyyy-MM-dd')}.txt`;
      const file = new File([blob], fileName, { type: 'text/plain' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Crea il documento nel database
      await base44.entities.Documento.create({
        centro_id: centroSelezionato.id,
        prenotazione_id: prenotazione.id,
        cliente_id: prenotazione.cliente_id,
        tipo_documento: 'contratto',
        nome_file: fileName,
        file_url: file_url
      });

      // Aggiorna la prenotazione
      await base44.entities.Prenotazione.update(prenotazione.id, {
        ...prenotazione,
        contratto_generato: true
      });

      // Scarica il file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('Contratto generato e archiviato');
      loadData();
    } catch (error) {
      console.error('Errore generazione contratto:', error);
      toast.error('Errore nella generazione del contratto');
    } finally {
      setGeneratingContract(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const documentoData = {
        ...formData,
        centro_id: centroSelezionato?.id === 'tutti' ? formData.centro_id : centroSelezionato.id
      };

      await base44.entities.Documento.create(documentoData);
      toast.success('Documento archiviato con successo');

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Errore salvataggio documento:', error);
      toast.error('Errore nel salvataggio del documento');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) return;
    try {
      await base44.entities.Documento.delete(id);
      toast.success('Documento eliminato');
      loadData();
    } catch (error) {
      console.error('Errore eliminazione documento:', error);
      toast.error('Errore nell\'eliminazione del documento');
    }
  };

  const handleEdit = (doc) => {
    setEditingDoc(doc);
    setFormData({
      tipo_documento: doc.tipo_documento,
      nome_file: doc.nome_file,
      file_url: doc.file_url,
      prenotazione_id: doc.prenotazione_id || '',
      cliente_id: doc.cliente_id || '',
      note: doc.note || ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdateDoc = async (e) => {
    e.preventDefault();
    try {
      await base44.entities.Documento.update(editingDoc.id, {
        ...formData,
        centro_id: editingDoc.centro_id
      });
      toast.success('Documento aggiornato con successo');
      setEditDialogOpen(false);
      setEditingDoc(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Errore aggiornamento documento:', error);
      toast.error('Errore nell\'aggiornamento del documento');
    }
  };

  const resetForm = () => {
    setFormData({
      tipo_documento: 'contratto',
      nome_file: '',
      file_url: '',
      prenotazione_id: '',
      cliente_id: '',
      note: ''
    });
  };

  const prenotazioniSenzaContratto = prenotazioni.filter(p => 
    !p.contratto_generato && p.stato !== 'cancellata'
  );

  const getTipoIcon = (tipo) => {
    const icons = {
      contratto: FileText,
      fattura: FileCheck,
      ricevuta: FileCheck,
      altro: FileText
    };
    return icons[tipo] || FileText;
  };

  if (!centroSelezionato || !centroSelezionato.id) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nessun centro commerciale assegnato</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>
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
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Documenti</h1>
          <p className="text-slate-600">{centroSelezionato?.nome}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Archivia Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Archivia Nuovo Documento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tipo_documento">Tipo Documento *</Label>
                <Select value={formData.tipo_documento} onValueChange={(value) => setFormData({ ...formData, tipo_documento: value })} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contratto">Contratto</SelectItem>
                    <SelectItem value="fattura">Fattura</SelectItem>
                    <SelectItem value="ricevuta">Ricevuta</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="nome_file">Nome File *</Label>
                <Input
                  id="nome_file"
                  value={formData.nome_file}
                  onChange={(e) => setFormData({ ...formData, nome_file: e.target.value })}
                  placeholder="es. Contratto_Cliente_2026.pdf"
                  required
                />
              </div>

              <div>
                <Label htmlFor="file">Carica File *</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  required={!formData.file_url}
                />
                {formData.file_url && (
                  <p className="text-sm text-green-600 mt-2">✓ File caricato</p>
                )}
              </div>

              <div>
                <Label htmlFor="prenotazione_id">Prenotazione Collegata</Label>
                <Select value={formData.prenotazione_id} onValueChange={(value) => setFormData({ ...formData, prenotazione_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona prenotazione (opzionale)" />
                  </SelectTrigger>
                  <SelectContent>
                    {prenotazioni.map(p => {
                      const cliente = clienti.find(c => c.id === p.cliente_id);
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {cliente?.ragione_sociale} - {format(new Date(p.data_inizio), 'dd/MM/yyyy', { locale: it })}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
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
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={uploadingFile}>
                  Archivia
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Modifica Documento */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingDoc(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifica Documento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateDoc} className="space-y-4">
              <div>
                <Label htmlFor="tipo_documento_edit">Tipo Documento *</Label>
                <Select value={formData.tipo_documento} onValueChange={(value) => setFormData({ ...formData, tipo_documento: value })} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contratto">Contratto</SelectItem>
                    <SelectItem value="fattura">Fattura</SelectItem>
                    <SelectItem value="ricevuta">Ricevuta</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="nome_file_edit">Nome File *</Label>
                <Input
                  id="nome_file_edit"
                  value={formData.nome_file}
                  onChange={(e) => setFormData({ ...formData, nome_file: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="file_edit">Sostituisci File (opzionale)</Label>
                <Input
                  id="file_edit"
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                />
                {formData.file_url && (
                  <p className="text-sm text-green-600 mt-2">✓ File presente</p>
                )}
              </div>

              <div>
                <Label htmlFor="prenotazione_id_edit">Prenotazione Collegata</Label>
                <Select value={formData.prenotazione_id} onValueChange={(value) => setFormData({ ...formData, prenotazione_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona prenotazione (opzionale)" />
                  </SelectTrigger>
                  <SelectContent>
                    {prenotazioni.map(p => {
                      const cliente = clienti.find(c => c.id === p.cliente_id);
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {cliente?.ragione_sociale} - {format(new Date(p.data_inizio), 'dd/MM/yyyy', { locale: it })}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="note_edit">Note</Label>
                <Textarea
                  id="note_edit"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={uploadingFile}>
                  Salva Modifiche
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contratti Generati */}
      <Card className="bg-white border-slate-200 mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Contratti Generati
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documenti.filter(d => d.tipo_documento === 'contratto').length === 0 ? (
            <p className="text-slate-500 text-center py-4">
              Nessun contratto archiviato
            </p>
          ) : (
            <div className="space-y-3">
              {documenti.filter(d => d.tipo_documento === 'contratto').map(doc => {
                const cliente = clienti.find(c => c.id === doc.cliente_id);
                const prenotazione = prenotazioni.find(p => p.id === doc.prenotazione_id);
                return (
                  <div key={doc.id} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800 mb-1">{doc.nome_file}</p>
                        {cliente && (
                          <p className="text-sm text-slate-600">Cliente: {cliente.ragione_sociale}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(doc)}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(doc.file_url, '_blank')}
                          className="text-green-600 hover:bg-green-50"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {prenotazione && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Periodo</p>
                          <p className="font-medium text-slate-700">
                            {format(new Date(prenotazione.data_inizio), 'dd/MM/yy', { locale: it })} - {format(new Date(prenotazione.data_fine), 'dd/MM/yy', { locale: it })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Prezzo Totale</p>
                          <p className="font-medium text-slate-700">
                            € {prenotazione.prezzo_totale?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Centro</p>
                          <p className="font-medium text-slate-700">{centroSelezionato?.nome}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Data Creazione</p>
                          <p className="font-medium text-slate-700">
                            {format(new Date(doc.created_date), 'dd MMM yyyy', { locale: it })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Genera Contratti */}
      {prenotazioniSenzaContratto.length > 0 && (
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Genera Contratti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-800 mb-4">
              Prenotazioni senza contratto generato:
            </p>
            <div className="space-y-2">
              {prenotazioniSenzaContratto.map(p => {
                const cliente = clienti.find(c => c.id === p.cliente_id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">{cliente?.ragione_sociale}</p>
                      <p className="text-sm text-slate-600">
                        {format(new Date(p.data_inizio), 'dd MMM', { locale: it })} - {format(new Date(p.data_fine), 'dd MMM yyyy', { locale: it })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleGeneraContratto(p)}
                      disabled={generatingContract}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Genera Contratto
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista Documenti */}
      {documenti.length === 0 ? (
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Tutti i Documenti
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-slate-300 mb-4" />
            <p className="text-slate-500 text-center mb-4">
              Nessun documento archiviato
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Tutti i Documenti</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documenti.map(doc => {
            const Icon = getTipoIcon(doc.tipo_documento);
            const cliente = clienti.find(c => c.id === doc.cliente_id);

            return (
              <Card key={doc.id} className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{doc.nome_file}</p>
                        <p className="text-xs text-slate-500 capitalize">
                          {doc.tipo_documento.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {cliente && (
                    <p className="text-sm text-slate-600 mb-3">
                      Cliente: {cliente.ragione_sociale}
                    </p>
                  )}

                  {doc.note && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                      {doc.note}
                    </p>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(doc.file_url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Scarica
                  </Button>

                  <p className="text-xs text-slate-400 mt-3 text-center">
                    {format(new Date(doc.created_date), 'dd MMM yyyy', { locale: it })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
          </div>
          </div>
          )}
          </div>
  );
}