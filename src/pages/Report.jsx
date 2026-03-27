import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Plus, Trash2, Pencil, FileText, Camera, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const today = () => format(new Date(), 'yyyy-MM-dd');

export default function Report({ centroSelezionato, user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [reportSelezionato, setReportSelezionato] = useState(null);
  const [espansi, setEspansi] = useState({});

  const [form, setForm] = useState({ data: today(), operatore: '', contenuto: '', foto_urls: [] });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    if (centroSelezionato?.id) loadReports();
  }, [centroSelezionato]);

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
    setForm({ data: r.data, operatore: r.operatore, contenuto: r.contenuto || '', foto_urls: r.foto_urls || [] });
    setFormOpen(true);
  };

  const handleFoto = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
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

  const toggleEspanso = (id) => setEspansi(prev => ({ ...prev, [id]: !prev[id] }));

  // Raggruppa per data
  const grouped = reports.reduce((acc, r) => {
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Report</h1>
          <p className="text-slate-500 text-sm">{centroSelezionato?.nome}</p>
        </div>
        <Button onClick={openNuovo} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuovo Report
        </Button>
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
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                {format(new Date(data + 'T00:00:00'), 'EEEE d MMMM yyyy', { locale: it })}
              </h3>
              <div className="space-y-2">
                {grouped[data].map(r => {
                  const espanso = espansi[r.id];
                  return (
                    <div key={r.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => toggleEspanso(r.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                            {r.operatore?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{r.operatore}</p>
                            {!espanso && r.contenuto && (
                              <p className="text-xs text-slate-400 line-clamp-1 max-w-xs">{r.contenuto}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
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
                                <img key={i} src={url} alt="" className="w-20 h-20 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(url, '_blank')} />
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

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{reportSelezionato ? 'Modifica Report' : 'Nuovo Report'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Data</label>
              <Input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Operatore (es. Rossi)</label>
              <Input placeholder="Cognome operatore" value={form.operatore} onChange={e => setForm(p => ({ ...p, operatore: e.target.value }))} />
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
                    <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
                    <button onClick={() => rimuoviFoto(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                <Camera className="w-4 h-4" />
                {uploading ? 'Caricamento...' : 'Aggiungi foto'}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFoto} />
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