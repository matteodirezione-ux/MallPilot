import React, { useState } from 'react';
import { convertiFile } from '@/lib/convertiCorrispettivi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ConversioneFile({ centroSelezionato, user }) {
  const [csvFile, setCsvFile] = useState(null);
  const [rawCsvFile, setRawCsvFile] = useState(null);
  const [matriceFile, setMatriceFile] = useState(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const hasSource = csvFile || rawCsvFile;

  const handleConvert = async () => {
    if (!hasSource) return;
    setConverting(true);
    setError(null);
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
    try {
      const res = await convertiFile(csvFile, matriceFile, rawCsvFile);
      const url = URL.createObjectURL(res.blob);
      setResult({ ...res, url });
    } catch (e) {
      setError(e.message || 'Errore durante la conversione');
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.filename;
    a.click();
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
          <ArrowRightLeft className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Conversione File</h1>
          <p className="text-sm text-slate-500">Converti il file del gestionale nel formato matrice</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. File dal gestionale</CardTitle>
          <CardDescription>
            Carica il file CSV o Excel scaricato dal gestionale con i corrispettivi del mese
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => setCsvFile(e.target.files[0])}
            />
            {csvFile ? (
              <div className="flex items-center gap-2 text-blue-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">{csvFile.name}</span>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-600">Clicca per caricare il file</span>
                <span className="text-xs text-slate-400 mt-1">CSV o Excel</span>
              </>
            )}
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1b. File grezzo CSV (virgola)</CardTitle>
          <CardDescription>
            Carica il file CSV grezzo exportato da Mallcomm (delimitato da virgola). Verrà convertito automaticamente con lo stesso metodo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => setRawCsvFile(e.target.files[0])}
            />
            {rawCsvFile ? (
              <div className="flex items-center gap-2 text-blue-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">{rawCsvFile.name}</span>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-600">Clicca per caricare il file grezzo</span>
                <span className="text-xs text-slate-400 mt-1">CSV (virgola)</span>
              </>
            )}
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. Matrice template (opzionale)</CardTitle>
          <CardDescription>
            Carica la matrice per mantenere l'ordine dei negozi. Senza, verrà usato l'ordine del file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setMatriceFile(e.target.files[0])}
            />
            {matriceFile ? (
              <div className="flex items-center gap-2 text-blue-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">{matriceFile.name}</span>
              </div>
            ) : (
              <>
                <FileSpreadsheet className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-600">Clicca per caricare la matrice</span>
                <span className="text-xs text-slate-400 mt-1">Excel (.xlsx)</span>
              </>
            )}
          </label>
        </CardContent>
      </Card>

      <Button onClick={handleConvert} disabled={!hasSource || converting} className="w-full gap-2">
        {converting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Conversione...
          </>
        ) : (
          <>
            <ArrowRightLeft className="w-4 h-4" />
            Converti file
          </>
        )}
      </Button>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {result?.anomalies?.length > 0 && (
        <div className="border border-amber-300 bg-amber-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>Possibile errore di inserimento ({result.anomalies.length})</span>
          </div>
          <p className="text-xs text-amber-700">
            Il fatturato senza IVA risulta più alto di quello con IVA. Verificare con l'operatore:
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {result.anomalies.map((a, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm border border-amber-200">
                <span className="font-medium text-slate-700">{a.store}</span>
                <span className="text-xs text-slate-500">
                  Senza IVA: <b className="text-red-600">€{a.ht.toLocaleString('it-IT')}</b> · Con IVA: €{a.ttc.toLocaleString('it-IT')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Conversione completata</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-slate-500 text-xs">Negozi totali</p>
                <p className="text-lg font-bold text-slate-800">{result.stats.total}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-slate-500 text-xs">Anno</p>
                <p className="text-lg font-bold text-slate-800">{result.stats.year}</p>
              </div>
              {result.stats.matrixCount > 0 && (
                <>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <p className="text-slate-500 text-xs">Corrispondenze matrice</p>
                    <p className="text-lg font-bold text-slate-800">{result.stats.matched}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <p className="text-slate-500 text-xs">Senza corrispondenza</p>
                    <p className="text-lg font-bold text-slate-800">{result.stats.unmatched}</p>
                  </div>
                </>
              )}
            </div>
            <Button onClick={handleDownload} className="w-full gap-2">
              <Download className="w-4 h-4" />
              Scarica file convertito
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}