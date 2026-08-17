import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import * as XLSX from 'xlsx-js-style';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Database, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ENTITY_LABELS = {
  CentroCommerciale: 'Centri Commerciali',
  SpazioExpo: 'Spazi Expo',
  Cliente: 'Clienti',
  Prenotazione: 'Prenotazioni',
  Documento: 'Documenti',
  Task: 'Task',
  Manutenzione: 'Manutenzioni',
  Ticket: 'Ticket',
  Report: 'Report',
  Capex: 'Capex',
  Pulizia: 'Pulizie',
  PuliziaPeriodica: 'Pulizie Periodiche',
  Notifica: 'Notifiche',
  Assegnazione: 'Assegnazioni',
  Budget: 'Budget',
  Direttore: 'Direttori',
  Vigilanza: 'Vigilanza',
  Manutentore: 'Manutentori',
  Tenant: 'Tenant',
  Corrispettivo: 'Corrispettivi',
  LetturaContatore: 'Lettura Contatori',
  LetturaContatoreGiornaliero: 'Lettura Contatori Giornalieri',
  Fornitore: 'Fornitori',
  Marketing: 'Marketing',
  MeteoGiornaliero: 'Meteo Giornaliero',
  ConsegnaVigilanza: 'Consegne Vigilanza',
};

export default function BackupSection({ user, centri }) {
  const [loading, setLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [stats, setStats] = useState(null);

  const isProprieta = user?.tipo_account === 'proprieta';
  const isDirettore = user?.tipo_account === 'direttore';

  // Per il direttore: centri assegnati selezionabili (default tutti)
  const [selectedCentri, setSelectedCentri] = useState(
    () => isDirettore ? (centri || []).map(c => c.id) : []
  );

  const centriDisponibili = useMemo(() => centri || [], [centri]);

  const toggleCentro = (id) => {
    setSelectedCentri(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const buildExcel = (entities) => {
    const wb = XLSX.utils.book_new();
    const summary = [];

    Object.keys(entities).forEach((entityName) => {
      const records = entities[entityName];
      if (!Array.isArray(records)) {
        summary.push({ entity: entityName, count: 0, error: true });
        return;
      }
      if (records.length === 0) {
        summary.push({ entity: entityName, count: 0 });
        return;
      }

      const allKeys = new Set();
      records.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
      const headers = [...allKeys];

      const rows = records.map(r => {
        const row = {};
        headers.forEach(h => {
          const val = r[h];
          if (val === null || val === undefined) row[h] = '';
          else if (Array.isArray(val) || typeof val === 'object') row[h] = JSON.stringify(val);
          else row[h] = val;
        });
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
      headers.forEach((_, i) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
        if (ws[cellRef]) {
          ws[cellRef].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '1E3A5F' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '1E3A5F' } },
              bottom: { style: 'thin', color: { rgb: '1E3A5F' } },
              left: { style: 'thin', color: { rgb: '1E3A5F' } },
              right: { style: 'thin', color: { rgb: '1E3A5F' } },
            },
          };
        }
      });
      ws['!cols'] = headers.map(h => {
        const maxLen = Math.max(h.length, ...rows.map(r => String(r[h] ?? '').length));
        return { wch: Math.min(Math.max(maxLen + 2, 12), 50) };
      });
      ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' };

      const sheetName = (ENTITY_LABELS[entityName] || entityName).slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      summary.push({ entity: entityName, count: records.length });
    });

    // Sheet riepilogo
    const summaryRows = summary.map(s => ({
      Entità: ENTITY_LABELS[s.entity] || s.entity,
      Record: s.count,
      Stato: s.error ? 'Errore' : 'OK',
    }));
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows, { header: ['Entità', 'Record', 'Stato'] });
    summaryWs['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 12 }];
    ['A1', 'B1', 'C1'].forEach(ref => {
      if (summaryWs[ref]) {
        summaryWs[ref].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '10B981' } },
          alignment: { horizontal: 'center' },
        };
      }
    });
    XLSX.utils.book_append_sheet(wb, summaryWs, 'RIEPILOGO', 0);

    return { wb, summary };
  };

  const handleBackup = async () => {
    if (isDirettore && selectedCentri.length === 0) {
      toast.error('Seleziona almeno un centro');
      return;
    }
    setLoading(true);
    try {
      let result;
      if (isProprieta) {
        const res = await base44.functions.invoke('backupDatabase', {});
        result = res.data;
      } else {
        const res = await base44.functions.invoke('backupDatabaseDirettore', { centri_ids: selectedCentri });
        result = res.data;
      }

      if (result?.error) throw new Error(result.error);
      const entities = result?.entities || {};

      const { wb, summary } = buildExcel(entities);

      const suffix = isDirettore
        ? `centri_${selectedCentri.length}`
        : 'completo';
      const fileName = `backup_${suffix}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      const totalRecords = summary.reduce((s, x) => s + x.count, 0);
      const okEntities = summary.filter(s => !s.error).length;
      setStats({ totalRecords, entities: okEntities });
      setLastBackup(new Date());
      toast.success(`Backup completato: ${totalRecords} record in ${okEntities} entità`);
    } catch (error) {
      console.error('Errore backup:', error);
      toast.error('Errore durante il backup: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          Backup Dati {isDirettore ? 'per Centro' : 'Completo'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">
              {isProprieta
                ? 'Esporta tutti i dati dell\'applicazione'
                : 'Esporta i dati dei centri a te assegnati'}
            </p>
            <p className="text-blue-700">
              Il file Excel conterrà un foglio per ogni sezione con tutti i record e tutti i campi.
              Conserva questo file in luogo sicuro: in caso di problemi potrai reinserirlo per ripristinare la situazione.
            </p>
          </div>
        </div>

        {/* Selettore centri per direttore */}
        {isDirettore && (
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              Centri da includere nel backup ({selectedCentri.length} selezionati su {centriDisponibili.length}):
            </p>
            {centriDisponibili.length === 0 ? (
              <p className="text-sm text-slate-500">Nessun centro assegnato.</p>
            ) : (
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-slate-50">
                {centriDisponibili.map(centro => (
                  <div key={centro.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`bk-${centro.id}`}
                      checked={selectedCentri.includes(centro.id)}
                      onCheckedChange={() => toggleCentro(centro.id)}
                    />
                    <label htmlFor={`bk-${centro.id}`} className="text-sm flex-1 cursor-pointer">
                      {centro.nome}
                    </label>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedCentri(centriDisponibili.map(c => c.id))}>
                Seleziona tutti
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedCentri([])}>
                Deseleziona tutti
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            onClick={handleBackup}
            disabled={loading || (isDirettore && selectedCentri.length === 0)}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Backup in corso...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Scarica Excel Backup
              </>
            )}
          </Button>

          {lastBackup && !loading && (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Ultimo backup: {format(lastBackup, 'dd/MM/yyyy HH:mm')}
                {stats && ` — ${stats.totalRecords} record, ${stats.entities} entità`}
              </span>
            </div>
          )}
        </div>

        {loading && (
          <p className="text-xs text-slate-500">
            Raccolta di tutti i dati in corso. L'operazione può richiedere qualche secondo per dataset grandi.
          </p>
        )}
      </CardContent>
    </Card>
  );
}