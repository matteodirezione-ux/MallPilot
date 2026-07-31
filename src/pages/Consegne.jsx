import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Plus, BookOpen, Trash2, X, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function Consegne({ centroSelezionato, user }) {
  const [consegne, setConsegne] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ data: format(new Date(), 'yyyy-MM-dd'), note: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editNote, setEditNote] = useState('');

  useEffect(() => {
    if (centroSelezionato?.id && centroSelezionato.id !== 'tutti') load();
  }, [centroSelezionato]);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.ConsegnaVigilanza.filter(
      { centro_id: centroSelezionato.id },
      '-data',
      100
    );
    setConsegne(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.note?.trim()) return;
    setSaving(true);
    await base44.entities.ConsegnaVigilanza.create({
      centro_id: centroSelezionato.id,
      data: formData.data,
      note: formData.note.trim(),
      autore_email: user?.email,
      autore_nome: user?.full_name,
    });
    setFormData({ data: format(new Date(), 'yyyy-MM-dd'), note: '' });
    setShowForm(false);
    await load();
    setSaving(false);
  };

  const handleEdit = async (id) => {
    if (!editNote?.trim()) return;
    setSaving(true);
    await base44.entities.ConsegnaVigilanza.update(id, { note: editNote.trim() });
    setConsegne(prev => prev.map(c => c.id === id ? { ...c, note: editNote.trim() } : c));
    setEditingId(null);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questa consegna?')) return;
    await base44.entities.ConsegnaVigilanza.delete(id);
    setConsegne(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Passaggio Consegne</h1>
            <p className="text-xs text-slate-500">{centroSelezionato?.nome}</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuova consegna
        </Button>
      </div>

      {/* Form nuova consegna */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
          <h2 className="font-semibold text-slate-700 mb-3">Nuova consegna</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Data</label>
              <input
                type="date"
                value={formData.data}
                onChange={e => setFormData(prev => ({ ...prev, data: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Note</label>
              <Textarea
                value={formData.note}
                onChange={e => setFormData(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Scrivi il passaggio di consegne..."
                rows={5}
                className="resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)} className="gap-1.5">
                <X className="w-4 h-4" /> Annulla
              </Button>
              <Button onClick={handleSave} disabled={saving || !formData.note?.trim()} className="gap-1.5">
                <Check className="w-4 h-4" /> {saving ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lista consegne */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm animate-pulse">
          Caricamento...
        </div>
      ) : consegne.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <BookOpen className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Nessuna consegna registrata</p>
          <p className="text-xs mt-1">Aggiungi la prima consegna con il pulsante in alto</p>
        </div>
      ) : (
        <div className="space-y-3">
          {consegne.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-indigo-700 capitalize">
                      {format(new Date(c.data), 'EEEE d MMMM yyyy', { locale: it })}
                    </span>
                  </div>
                  {editingId === c.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editNote}
                        onChange={e => setEditNote(e.target.value)}
                        rows={4}
                        className="resize-none text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEdit(c.id)} disabled={saving} className="gap-1">
                          <Check className="w-3.5 h-3.5" /> Salva
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="gap-1">
                          <X className="w-3.5 h-3.5" /> Annulla
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{c.note}</p>
                  )}
                  {c.autore_nome && (
                    <p className="text-xs text-slate-400 mt-2">— {c.autore_nome}</p>
                  )}
                </div>
                {editingId !== c.id && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditingId(c.id); setEditNote(c.note); }}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}