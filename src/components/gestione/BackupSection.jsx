import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import * as XLSX from 'xlsx-js-style';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const BUILT_IN_FIELDS = ['id', 'created_date', 'updated_date', 'created_by_id'];

export default function BackupSection() {
  const [loading, setLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [stats, setStats] = useState(null);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('backupDatabase', {});
      const result = res.data;
      if (result?.error) throw new Error(result.error);

      const entities = result?.entities || {};
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

        // Raccogli tutte le chiuni presenti nei record (incluse built-in)
        const allKeys = new Set();
        records.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
        const headers = [...allKeys];

        // Costruisci righe: serializza array/oggetti in JSON
        const rows = records.map(r => {
          const row = {};
          headers.forEach(h => {
            const val = r[h];
            if (val === null || val === undefined) {
              row[h] = '';
            } else if (Array.isArray(val) || typeof val === 'object') {
              row[h] = JSON.stringify(val);
            } else {
              row[h] = val;
            }
          });
          return row;
        });

        // Crea worksheet con intestazioni
        const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

        // Stile intestazioni (riga 1)
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

        // Larghezza colonne
        ws['!cols'] = headers.map(h => {
          const maxLen = Math.max(
            h.length,
            ...rows.map(r => String(r[h] ?? '').length)
          );
          return { wch: Math.min(Math.max(maxLen + 2, 12), 50) };
        });

        // Freeze pane prima riga
        ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' };

        // Nome sheet (max 31 char)
        const sheetName = (ENTITY_LABELS[entityName] || entityName).slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        summary.push({ entity: entityName, count: records.length });
      });

      // Sheet di riepilogo come primo foglio
      const summaryRows = summary.map(s => ({
        Entità: ENTITY_LABELS[s.entity] || s.entity,
        Record: s.count,
        Stato: s.error ? 'Errore' : 'OK',
      }));
      const summaryWs = XLSX.utils.json_to_sheet(summaryRows, { header: ['Entità', 'Record', 'Stato'] });
      summaryWs['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 12 }];
      // Stile header riepilogo
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

      const fileName = `backup_completo_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      const totalRecords = summary.reduce((s, x) => s + x.count, 0);
      setStats({ totalRecords, entities: summary.filter(s => !s.error).length, errors: summary.filter(s => s.error).length });
      setLastBackup(new Date());
      toast.success(`Backup completato: ${totalRecords} record in ${summary.filter(s => !s.error).length} entità`);
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
          Backup Dati Completo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Esporta tutti i dati dell'applicazione</p>
            <p className="text-blue-700">
              Il file Excel conterrà un foglio per ogni sezione (Centri, Direttori, Tenant, Prenotazioni, Task, ecc.)
              con tutti i record e tutti i campi. Conserva questo file in luogo sicuro: in caso di problemi
              potrai reinserirlo per ripristinare la situazione.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            onClick={handleBackup}
            disabled={loading}
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