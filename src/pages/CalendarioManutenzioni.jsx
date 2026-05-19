import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { compressImages } from '@/lib/compressImage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import DatePicker from '@/components/ui/DatePicker';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Wrench, Calendar, ListTodo, Search, Camera, X } from 'lucide-react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import CalendarioManutenzioniMensile from '../components/calendario/CalendarioManutenzioniMensile';
import ListaManutenzioni from '../components/calendario/ListaManutenzioni';

export default function CalendarioManutenzioni({ centroSelezionato, user }) {
  const [manutenzioni, setManutenzioni] = useState([]);
  const [centri, setCentri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [vistaApertiChiusi, setVistaApertiChiusi] = useState('aperti');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manutenzioneSelezionata, setManutenzioneSelezionata] = useState(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [annoSelezionato, setAnnoSelezionato] = useState(new Date().getFullYear());
  const fileInputRef = useRef();
  const cameraInputRef = useRef();

  const [formData, setFormData] = useState({
    titolo: '', descrizione: '', data_scadenza: format(new Date(), 'yyyy-MM-dd'),
    centro_id: '', stato: 'da_fare', foto_urls: [],
    ricorrente: false, ricorrenza_tipo: 'settimanale', ricorrenza_ogni: 1, ricorrenza_unita: 'settimane', ricorrenza_fine: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId && manutenzioni.length > 0) {
      const m = manutenzioni.find(m => m.id === editId);
      if (m) { handleManutenzioneClick(m); window.history.replaceState({}, '', window.location.pathname); }
    }
  }, [manutenzioni]);

  useEffect(() => {
    if (user?.tipo_account && user?.email && centroSelezionato?.id) loadData();
  }, [user?.tipo_account, user?.email, centroSelezionato?.id]);

  useEffect(() => {
    if (!user?.tipo_account) return;
    const unsubscribe = base44.entities.Manutenzione.subscribe((event) => {
      if (event.type === 'create') { setManutenzioni(prev => { if (prev.find(m => m.id === event.id)) return prev; return [...prev, event.data].sort((a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza)); }); }
      else if (event.type === 'update') { setManutenzioni(prev => prev.map(m => m.id === event.id ? { ...m, ...event.data } : m)); }
      else if (event.type === 'delete') { setManutenzioni(prev => prev.filter(m => m.id !== event.id)); }
    });
    return () => unsubscribe();
  }, [user?.tipo_account]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allCentri = await base44.entities.CentroCommerciale.list();
      let centriVisibili = allCentri;
      if (user?.tipo_account === 'direttore' || user?.tipo_account === 'vigilanza') {
        const assegnazioni = await base44.entities.Assegnazione.filter({ user_email: user.email });
        const centriIds = new Set(assegnazioni.map(a => a.centro_id));
        centriVisibili = allCentri.filter(c => centriIds.has(c.id));
      }
      setCentri(centriVisibili);
      let allManutenzioni = await base44.entities.Manutenzione.list();
      if (centroSelezionato?.id && centroSelezionato.id !== 'tutti') {
        allManutenzioni = allManutenzioni.filter(m => m.centro_id === centroSelezionato.id || !m.centro_id);
      }
      setManutenzioni(allManutenzioni.sort((a, b) => new Date(a.data_scadenza) - new Date(b.data_scadenza)));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleNewManutenzione = (giorno) => {
    setManutenzioneSelezionata(null);
    setFormData({ titolo: '', descrizione: '', data_scadenza: format(giorno, 'yyyy-MM-dd'), centro_id: centroSelezionato?.id !== 'tutti' ? centroSelezionato?.id : '', stato: 'da_fare', foto_urls: [], ricorrente: false, ricorrenza_tipo: 'settimanale', ricorrenza_ogni: 1, ricorrenza_unita: 'settimane', ricorrenza_fine: '' });
    setDialogOpen(true);
  };

  const handleFoto = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingFoto(true);
    const compressed = await compressImages(files);
    const urls = await Promise.all(compressed.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    setFormData(prev => ({ ...prev, foto_urls: [...(prev.foto_urls || []), ...urls] }));
    setUploadingFoto(false);
    e.target.value = '';
  };

  const handleManutenzioneClick = (manutenzione) => {
    setManutenzioneSelezionata(manutenzione);
    setFormData({ titolo: manutenzione.titolo, descrizione: manutenzione.descrizione, data_scadenza: manutenzione.data_scadenza, centro_id: manutenzione.centro_id, stato: manutenzione.stato, foto_urls: manutenzione.foto_urls || [], ricorrente: manutenzione.ricorrente || false, ricorrenza_tipo: manutenzione.ricorrenza_tipo || 'settimanale', ricorrenza_ogni: manutenzione.ricorrenza_ogni || 1, ricorrenza_unita: manutenzione.ricorrenza_unita || 'settimane', ricorrenza_fine: manutenzione.ricorrenza_fine || '' });
    setDialogOpen(true);
  };

  const handleToggleStatus = async (manutenzione) => {
    const nuovoStato = manutenzione.stato === 'completato' ? 'da_fare' : 'completato';
    setManutenzioni(prev => prev.map(m => m.id === manutenzione.id ? { ...m, stato: nuovoStato } : m));
    await base44.entities.Manutenzione.update(manutenzione.id, { stato: nuovoStato });
  };

  const generateRecurrence = (startDateStr, config) => {
    const [y, m, d] = startDateStr.split('-').map(Number);
    let currentDate = new Date(y, m - 1, d);
    const [ey, em, ed] = config.ricorrenza_fine.split('-').map(Number);
    const endDate = new Date(ey, em - 1, ed);
    const dates = [];
    const n = config.ricorrenza_ogni || 1;
    const advance = (date) => {
      if (config.ricorrenza_tipo === 'giornaliero') return addDays(date, n);
      if (config.ricorrenza_tipo === 'settimanale') return addWeeks(date, n);
      if (config.ricorrenza_tipo === 'mensile') return addMonths(date, n);
      if (config.ricorrenza_tipo === 'annuale') return addMonths(date, 12 * n);
      if (config.ricorrenza_tipo === 'personalizzato') {
        if (config.ricorrenza_unita === 'giorni') return addDays(date, n);
        if (config.ricorrenza_unita === 'settimane') return addWeeks(date, n);
        if (config.ricorrenza_unita === 'mesi') return addMonths(date, n);
      }
      return addWeeks(date, n);
    };
    currentDate = advance(currentDate);
    while (currentDate <= endDate) { dates.push(format(currentDate, 'yyyy-MM-dd')); currentDate = advance(currentDate); }
    return dates;
  };

  const handleSave = async () => {
    if (!formData.titolo.trim()) { alert('Titolo obbligatorio'); return; }
    if (formData.ricorrente && !formData.ricorrenza_fine) { alert('Specificare una data di fine per la ricorrenza'); return; }
    try {
      if (manutenzioneSelezionata?.id) {
        if (manutenzioneSelezionata.ricorrente) {
          await base44.entities.Manutenzione.update(manutenzioneSelezionata.id, formData);
          const allManutenzioni = await base44.entities.Manutenzione.list();
          const collegate = allManutenzioni.filter(m => m.manutenzione_padre_id === manutenzioneSelezionata.id);
          for (const m of collegate) await base44.entities.Manutenzione.update(m.id, { titolo: formData.titolo, descrizione: formData.descrizione, stato: formData.stato });
        } else {
          await base44.entities.Manutenzione.update(manutenzioneSelezionata.id, formData);
        }
      } else {
        const manutenzioneData = { ...formData, assegnato_da_email: user.email, assegnato_da_nome: user.full_name };
        if (formData.ricorrente) {
          const main = await base44.entities.Manutenzione.create(manutenzioneData);
          const futureDates = generateRecurrence(formData.data_scadenza, formData);
          if (futureDates.length > 0) {
            await base44.entities.Manutenzione.bulkCreate(futureDates.map(dateStr => ({ ...manutenzioneData, data_scadenza: dateStr, manutenzione_padre_id: main.id, ricorrente: false })));
          }
        } else {
          await base44.entities.Manutenzione.create(manutenzioneData);
        }
      }
      setDialogOpen(false);
      setManutenzioneSelezionata(null);
    } catch (err) { console.error(err); alert('Errore nel salvataggio'); }
  };

  const handleDelete = async (manutenzioneArg) => {
    const target = manutenzioneArg || manutenzioneSelezionata;
    if (!target) return;
    if (window.confirm('Eliminare questa manutenzione?')) {
      if (target.ricorrente) {
        const all = await base44.entities.Manutenzione.list();
        const figlie = all.filter(m => m.manutenzione_padre_id === target.id);
        for (const m of figlie) await base44.entities.Manutenzione.delete(m.id);
      }
      await base44.entities.Manutenzione.delete(target.id);
      setDialogOpen(false);
      setManutenzioneSelezionata(null);
    }
  };

  const manutenioniFiltrate = manutenzioni.filter(m => !searchText || m.titolo?.toLowerCase().includes(searchText.toLowerCase()) || m.descrizione?.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Wrench className="w-6 h-6" /> Controlli</h1>
          <p className="text-slate-500 text-sm">{centroSelezionato?.nome}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-white">
            <button onClick={() => setAnnoSelezionato(a => a - 1)} className="p-1 hover:bg-slate-100 rounded text-sm">◀</button>
            <span className="font-semibold px-2 text-sm">{annoSelezionato}</span>
            <button onClick={() => setAnnoSelezionato(a => a + 1)} className="p-1 hover:bg-slate-100 rounded text-sm">▶</button>
          </div>
          <Button onClick={() => handleNewManutenzione(new Date())} className="bg-blue-600 hover:bg-blue-700 gap-2"><Plus className="w-4 h-4" /> Nuovo</Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Cerca..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-10 h-9" />
        </div>
        <div className="flex gap-2">
          {['aperti','chiusi'].map(v => (
            <button key={v} onClick={() => setVistaApertiChiusi(v)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${vistaApertiChiusi === v ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {v === 'aperti' ? 'Aperti' : 'Completati'}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista"><ListTodo className="w-4 h-4 mr-1" /> Lista</TabsTrigger>
          <TabsTrigger value="calendario"><Calendar className="w-4 h-4 mr-1" /> Calendario</TabsTrigger>
        </TabsList>
        <TabsContent value="lista" className="mt-4">
          {loading ? <div className="text-center py-8 text-slate-400">Caricamento...</div> : (
            <ListaManutenzioni manutenzioni={manutenioniFiltrate} onEdit={handleManutenzioneClick} onDelete={handleDelete} onToggleStatus={handleToggleStatus} annoSelezionato={annoSelezionato} vistaApertiChiusi={vistaApertiChiusi} />
          )}
        </TabsContent>
        <TabsContent value="calendario" className="mt-4">
          <CalendarioManutenzioniMensile tasks={manutenzioni} onTaskClick={handleManutenzioneClick} onToggleStatus={handleToggleStatus} onNewTask={handleNewManutenzione} annoSelezionato={annoSelezionato} />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setDialogOpen(false); setManutenzioneSelezionata(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{manutenzioneSelezionata ? 'Modifica Controllo' : 'Nuovo Controllo'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Titolo *</label><Input value={formData.titolo} onChange={e => setFormData(p => ({ ...p, titolo: e.target.value }))} className="mt-1" /></div>
            <div><label className="text-sm font-medium">Data scadenza</label><div className="mt-1"><DatePicker value={formData.data_scadenza} onChange={v => setFormData(p => ({ ...p, data_scadenza: v }))} /></div></div>
            <div>
              <label className="text-sm font-medium">Stato</label>
              <Select value={formData.stato} onValueChange={v => setFormData(p => ({ ...p, stato: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="da_fare">Da Fare</SelectItem>
                  <SelectItem value="in_corso">In Corso</SelectItem>
                  <SelectItem value="completato">Completato</SelectItem>
                  <SelectItem value="annullato">Annullato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {centri.length > 1 && (
              <div>
                <label className="text-sm font-medium">Centro</label>
                <select value={formData.centro_id} onChange={e => setFormData(p => ({ ...p, centro_id: e.target.value }))} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleziona centro</option>
                  {centri.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            )}
            <div><label className="text-sm font-medium">Descrizione</label><Textarea value={formData.descrizione} onChange={e => setFormData(p => ({ ...p, descrizione: e.target.value }))} rows={2} className="mt-1" /></div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={formData.ricorrente} onChange={e => setFormData(p => ({ ...p, ricorrente: e.target.checked }))} className="rounded" /> Ricorrente
              </label>
              {formData.ricorrente && (
                <div className="mt-3 space-y-2 pl-4 border-l-2 border-slate-200">
                  <Select value={formData.ricorrenza_tipo} onValueChange={v => setFormData(p => ({ ...p, ricorrenza_tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['giornaliero','settimanale','mensile','annuale','personalizzato'].map(v => <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {formData.ricorrenza_tipo === 'personalizzato' && (
                    <div className="flex gap-2">
                      <Input type="number" value={formData.ricorrenza_ogni} onChange={e => setFormData(p => ({ ...p, ricorrenza_ogni: parseInt(e.target.value) }))} className="w-20 h-8" min={1} />
                      <Select value={formData.ricorrenza_unita} onValueChange={v => setFormData(p => ({ ...p, ricorrenza_unita: v }))}>
                        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="giorni">Giorni</SelectItem>
                          <SelectItem value="settimane">Settimane</SelectItem>
                          <SelectItem value="mesi">Mesi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div><label className="text-xs text-slate-500">Fine ricorrenza</label><div className="mt-1"><DatePicker value={formData.ricorrenza_fine} onChange={v => setFormData(p => ({ ...p, ricorrenza_fine: v }))} placeholder="Seleziona data fine" /></div></div>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Foto</label>
              <div className="flex gap-2 mt-1">
                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50 text-sm text-slate-600">
                  {uploadingFoto ? 'Caricamento...' : 'Carica foto'}
                  <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFoto} />
                </label>
                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50 text-sm text-slate-600">
                  <Camera className="w-4 h-4" /> Fotocamera
                  <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleFoto} />
                </label>
              </div>
              {(formData.foto_urls || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.foto_urls.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt="" className="w-16 h-16 rounded object-cover" />
                      <button type="button" onClick={() => setFormData(p => ({ ...p, foto_urls: p.foto_urls.filter((_, idx) => idx !== i) }))} className="absolute -top-1 -right-1 bg-white rounded-full shadow p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              {manutenzioneSelezionata && <Button variant="outline" onClick={() => handleDelete()} className="border-red-200 text-red-600 hover:bg-red-50">Elimina</Button>}
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Annulla</Button>
              <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700">Salva</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}