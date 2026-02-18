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
  const [spazi, setSpazi] = useState([]);
  const [centri, setCentri] = useState([]);
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
      const [documentiData, prenotazioniData, clientiData, spaziData, centriData] = await Promise.all([
        isTutti
          ? base44.entities.Documento.list()
          : base44.entities.Documento.filter({ centro_id: centroSelezionato.id }),
        isTutti
          ? base44.entities.Prenotazione.list()
          : base44.entities.Prenotazione.filter({ centro_id: centroSelezionato.id }),
        base44.entities.Cliente.list(),
        isTutti
          ? base44.entities.SpazioExpo.list()
          : base44.entities.SpazioExpo.filter({ centro_id: centroSelezionato.id }),
        base44.entities.CentroCommerciale.list()
      ]);
      setDocumenti(documentiData || []);
      setPrenotazioni(prenotazioniData || []);
      setClienti(clientiData || []);
      setSpazi(spaziData || []);
      setCentri(centriData || []);
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

      // Sceglie il modello in base alla durata: oltre 30 giorni → contratto di locazione
      const dataInizio = new Date(prenotazione.data_inizio);
      const dataFine = new Date(prenotazione.data_fine);
      const durataGiorni = Math.round((dataFine - dataInizio) / (1000 * 60 * 60 * 24));
      const functionName = durataGiorni > 30 ? 'generaContrattoOltre30gg' : 'generaContratto30gg';

      const response = await base44.functions.invoke(functionName, {
        prenotazione_id: prenotazione.id
      });

      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const fileName = `Contratto_${cliente?.ragione_sociale?.replace(/\s+/g, '_')}_${prenotazione.data_inizio}.pdf`;

      // Carica il PDF su storage
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Crea il documento nel database
      await base44.entities.Documento.create({
        centro_id: prenotazione.centro_id,
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

      // Scarica il PDF
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('Contratto PDF generato e archiviato');
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

      {/* Documenti Archiviati */}
      <Card className="bg-white border-slate-200 mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documenti Archiviati
          </CardTitle>
        </CardHeader>
...
      </Card>


          </div>
  );
}