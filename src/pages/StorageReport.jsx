import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HardDrive, BarChart3, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StorageReport({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadReport();
    }
  }, [user]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('analyzeStorageUsage', {});
      setData(response.data);
    } catch (error) {
      toast.error('Errore nel caricamento del report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-8">
        <Card><CardContent className="py-12 text-center text-slate-500">
          Accesso solo amministratori
        </CardContent></Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <Card><CardContent className="py-12 text-center text-slate-500">
          Errore nel caricamento dei dati
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <HardDrive className="w-8 h-8 text-blue-600" />
            Report Spazio di Archiviazione
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Analizzato il {new Date(data.timestamp).toLocaleString('it-IT')}
          </p>
        </div>
        <Button onClick={loadReport} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Images */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {data.totalImages.toLocaleString('it-IT')}
              </div>
              <p className="text-slate-600 font-medium">Immagini Totali</p>
            </div>
          </CardContent>
        </Card>

        {/* Current Usage */}
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {data.estimatedUsage.gb} GB
              </div>
              <p className="text-sm text-slate-600 mb-2">
                ({data.estimatedUsage.mb.toLocaleString('it-IT', { maximumFractionDigits: 0 })} MB)
              </p>
              <p className="text-slate-600 font-medium">Ingombro Attuale</p>
              <p className="text-xs text-slate-500 mt-1">Media ~2.5MB/immagine</p>
            </div>
          </CardContent>
        </Card>

        {/* Potential Savings */}
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {data.potentialSavings.mb} MB
              </div>
              <p className="text-sm text-slate-600 mb-2">
                ({data.potentialSavings.percentage}%)
              </p>
              <p className="text-slate-600 font-medium">Risparmio con Compressione</p>
              <p className="text-xs text-slate-500 mt-1">Destinati a ~1MB/immagine</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compressed Estimate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Proiezione Post-Compressione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Ingombro Stimato</p>
              <p className="text-2xl font-bold text-slate-800">
                {data.compressedEstimate.gb} GB
              </p>
              <p className="text-xs text-slate-500 mt-1">
                ({data.compressedEstimate.mb.toLocaleString('it-IT', { maximumFractionDigits: 0 })} MB)
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Riduzione</p>
              <p className="text-2xl font-bold text-green-600">
                {data.potentialSavings.percentage}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                da {data.estimatedUsage.gb} GB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown by Entity */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuzione per Entità</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(data.breakdown)
              .filter(([_, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([entity, count]) => (
                <div key={entity} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-700">{entity}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(count / data.totalImages) * 100}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-800 min-w-[60px] text-right">
                      {count} ({((count / data.totalImages) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            {Object.values(data.breakdown).every(count => count === 0) && (
              <p className="text-slate-500 text-center py-4">Nessuna immagine trovata</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}