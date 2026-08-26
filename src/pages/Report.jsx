import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import SectionInfoButton from '@/components/onboarding/SectionInfoButton';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { compressImages } from '@/lib/compressImage';
import { Plus, Trash2, Pencil, FileText, Camera, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, AlertTriangle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ImageLightbox from '@/components/ui/ImageLightbox';
import SafeImage from '@/components/ui/SafeImage';

const today = () => format(new Date(), 'yyyy-MM-dd');

export default function Report({ centroSelezionato, user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [reportSelezionato, setReportSelezionato] = useState(null);
  const [espansi, setEspansi] = useState({});
  const [meseFiltrato, setMeseFiltrato] = useState(new Date());
  const [searchText, setSearchText] = useState('');

  const [form, setForm] = useState({ data: today(), operatore: '', contenuto: '', furto: false, foto_urls: [] });
  const [lightbox, setLightbox] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();
  const cameraInputRef = useRef();

  const lastCentroId = useRef(null);
  useEffect(() => {
    if (centroSelezionato?.id && centroSelezionato.id !== lastCentroId.current) {
      lastCentroId.current = centroSelezionato.id;
      loadReports();
    }
  }, [centroSelezionato?.id]);

  const loadReports = async () => {
    setLoading(true);
    const lista = centroSelezionato.id === 'tutti'
      ? await base44.entities.Report.list('-data')
      : await base44.entities.Report.filter({ centro_id: centroSelezionato.id }, '-data');
    setReports(lista);
    setLoading(false);
  };

  const openNuovo = () => {
    setReportSelezionato(null);
    setForm({ data: today(), operatore: '', contenuto: '', foto_urls: [] });
    setFormOpen(true);
  };

  const openModifica = (r) => {
    setReportSelezionato(r);
    setForm({ data: r.data, operatore: r.operatore, contenuto: r.contenuto || '', furto: r.furto || false, foto_urls: r.foto_urls || [] });
    setFormOpen(true);
  };

  const handleFoto = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const compressed = await compressImages(files);
    const urls = await Promise.all(compressed.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    setForm(prev => ({ ...prev, foto_urls: [...prev.foto_urls, ...urls] }));
    setUploading(false);
  };

  const rimuoviFoto = (i) => {
    setForm(prev => ({ ...prev, foto_urls: prev.foto_urls.filter((_, idx) => idx !== i) }));
  };

  const handleSave = async () => {
    if (!form.operatore.trim() || !form.data) return;
    const data = {
      ...form,
      centro_id: centroSelezionato.id === 'tutti' ? '' : centroSelezionato.id,
      creato_da_email: user?.email
    };
    if (reportSelezionato) {
      await base44.entities.Report.update(reportSelezionato.id, data);
    } else {
      await base44.entities.Report.create(data);
    }
    setFormOpen(false);
    loadReports();
  };

  const handleDelete = async (r) => {
    if (!confirm('Eliminare questo report?')) return;
    await base44.entities.Report.delete(r.id);
    loadReports();
  };

  const isDirettore = user?.tipo_account === 'direttore';

  const isLetto = (r) => {
    if (!isDirettore) return true;
    return (r.letto_da || []).length > 0;
  };

  const toggleEspanso = async (id) => {
    const isOpen = !espansi[id];
    setEspansi(prev => ({ ...prev, [id]: isOpen }));
    // Se il direttore apre il report per la prima volta, segnalo come letto
    if (isDirettore && isOpen) {
      const r = reports.find(rep => rep.id === id);
      if (r && !isLetto(r)) {
        const nuoviLetti = [...(r.letto_da || []), user.email];
        await base44.entities.Report.update(id, { letto_da: nuoviLetti });
        setReports(prev => prev.map(rep => rep.id === id ? { ...rep, letto_da: nuoviLetti } : rep));
      }
    }
  };

  // Filtra report per mese e ricerca
  const reportsMese = reports.filter(r => {
    const dataReport = new Date(r.data);
    const meseMatch = dataReport.getFullYear() === meseFiltrato.getFullYear() && 
           dataReport.getMonth() === meseFiltrato.getMonth();
    
    if (!searchText.trim()) return meseMatch;
    
    const search = searchText.toLowerCase();
    return meseMatch && (
      r.operatore?.toLowerCase().includes(search) ||
      r.contenuto?.toLowerCase().includes(search)
    );
  });

  // Raggruppa per data
  const grouped = reportsMese.reduce((acc, r) => {
    const key = r.data;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});
  const dateOrdinate = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (!centroSelezionato?.id) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500">Nessun centro selezionato</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">Report <SectionInfoButton section="Report" /></h1>
          <p className="text-slate-500 text-sm">Gestione report giornalieri</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto flex-col md:flex-row">
           <div className="relative w-full md:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <Input
               placeholder="Cerca nei report..."
               value={searchText || ''}
               onChange={(e) => setSearchText(e.target.value)}
               className="pl-9 h-9 w-full"
             />
           </div>
           <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2">
             <button onClick={() => setMeseFiltrato(d => new Date(d.getFullYear(), d.getMonth() - 1))} className="p-1.5 hover:bg-slate-100 rounded transition-colors">
               <ChevronLeft className="w-4 h-4 text-slate-600" />
             </button>
             <span className="text-sm font-medium text-slate-700 min-w-max">
               {format(meseFiltrato, 'MMMM yyyy', { locale: it })}
             </span>
             <button onClick={() => setMeseFiltrato(d => new Date(d.getFullYear(), d.getMonth() + 1))} className="p-1.5 hover:bg-slate-100 rounded transition-colors">
               <ChevronRight className="w-4 h-4 text-slate-600" />
             </button>
           </div>
           <Button onClick={openNuovo} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
             <Plus className="w-4 h-4" /> Nuovo Report
           </Button>
         </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : dateOrdinate.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nessun report trovato</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dateOrdinate.map(data => (
            <div key={data}>
              <div className="space-y-2">
                {grouped[data].map(r => {
                  const espanso = espansi[r.id];
                  const nonLetto = !isLetto(r);
                   return (
                    <div key={r.id} className={`rounded-xl border overflow-hidden transition-all duration-200
                      shadow-[0_4px_20px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)]
                                             hover:shadow-[0_12px_36px_rgba(0,0,0,0.18),0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5
                      ${nonLetto ? 'bg-blue-50 border-blue-50' : 'bg-white/80 backdrop-blur-sm border-white'}`}>
                      <div
                        className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${nonLetto ? 'hover:bg-blue-50' : 'hover:bg-slate-50'}`}
                        onClick={() => toggleEspanso(r.id)}
                      >
                        <div className="flex items-center gap-2 flex-col md:flex-row w-full md:w-auto">
                          <p className={`text-sm font-bold ${nonLetto ? 'text-blue-700' : 'text-slate-800'}`}>
                            {format(new Date(r.data + 'T00:00:00'), 'EEEE d MMMM yyyy', { locale: it })}
                          </p>
                          <span className={`text-sm ${nonLetto ? 'text-blue-500' : 'text-slate-500'}`}>· {r.operatore}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {r.furto && (
                            <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> Furto
                            </span>
                          )}
                          {nonLetto && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                          )}
                          {r.foto_urls?.length > 0 && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Camera className="w-3 h-3" />{r.foto_urls.length}
                            </span>
                          )}
                          <button onClick={e => { e.stopPropagation(); openModifica(r); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(r); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {espanso ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>
                      {espanso && (
                        <div className="px-4 pb-4 border-t border-slate-100">
                          {r.contenuto ? (
                            <p className="text-sm text-slate-700 whitespace-pre-wrap mt-3">{r.contenuto}</p>
                          ) : (
                            <p className="text-sm text-slate-400 italic mt-3">Nessun contenuto</p>
                          )}
                          {r.foto_urls?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {r.foto_urls.map((url, i) => (
                                <SafeImage key={i} src={url} alt="" className="w-20 h-20 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-90"
                                  onClick={() => setLightbox({ urls: r.foto_urls, index: i })} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <ImageLightbox urls={lightbox.urls} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{reportSelezionato ? 'Modifica Report' : 'Nuovo Report'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Data</label>
              <Input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} className="w-fit" tabIndex={-1} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Operatore</label>
              <Input placeholder="Es. Mario Rossi" value={form.operatore} onChange={e => setForm(p => ({ ...p, operatore: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <input
                type="checkbox"
                id="furto-check"
                checked={form.furto}
                onChange={e => setForm(p => ({ ...p, furto: e.target.checked }))}
                className="w-4 h-4 accent-red-600 cursor-pointer"
              />
              <label htmlFor="furto-check" className="text-sm font-medium text-red-700 cursor-pointer flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Furto verificato durante il turno
              </label>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Contenuto del report</label>
              <Textarea
                placeholder="Descrivi l'attività svolta, eventuali anomalie, note..."
                value={form.contenuto}
                onChange={e => setForm(p => ({ ...p, contenuto: e.target.value }))}
                className="min-h-[120px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Foto</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.foto_urls.map((url, i) => (
                  <div key={i} className="relative">
                    <SafeImage src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
                    <button onClick={() => rimuoviFoto(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2 flex-1">
                  <Camera className="w-4 h-4" />
                  {uploading ? 'Caricamento...' : 'Galleria'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()} className="gap-2">
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFoto} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Annulla</Button>
              <Button onClick={handleSave} disabled={!form.operatore.trim() || !form.data}>Salva</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}