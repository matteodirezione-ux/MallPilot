import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function CorrispettiviDetail({ tenant, corrispettivi, onBack, user }) {
  const fmtEur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n || 0);

  // Raggruppa per anno
  const corrispettiviPerAnno = corrispettivi?.reduce((acc, c) => {
    const anno = new Date(c.mese).getFullYear();
    if (!acc[anno]) acc[anno] = [];
    acc[anno].push(c);
    return acc;
  }, {}) || {};

  const anni = Object.keys(corrispettiviPerAnno).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {tenant.insegna || tenant.ragione_sociale}
          </h2>
          <p className="text-slate-500 text-sm">Negozio {tenant.numero_negozio}</p>
        </div>
      </div>

      {anni.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            Nessun corrispettivo inserito per questo tenant.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {anni.map(anno => (
            <Card key={anno}>
              <CardHeader>
                <CardTitle className="text-lg">{anno}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left p-3 font-semibold text-sm">Mese</th>
                        <th className="text-right p-3 font-semibold text-sm">Corrispettivi Ivati</th>
                        <th className="text-right p-3 font-semibold text-sm">Corrispettivi Netti</th>
                        <th className="text-right p-3 font-semibold text-sm">Scontrini</th>
                        <th className="text-left p-3 font-semibold text-sm">Data Inserimento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {corrispettiviPerAnno[anno]
                        .sort((a, b) => new Date(b.mese) - new Date(a.mese))
                        .map(c => (
                        <tr key={c.id} className="border-b hover:bg-slate-50">
                          <td className="p-3 font-medium">
                            {format(new Date(c.mese), 'MMMM yyyy', { locale: it })}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {fmtEur(c.corrispettivi_ivati)}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {fmtEur(c.corrispettivi_netti)}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {c.numero_scontrini.toLocaleString('it-IT')}
                          </td>
                          <td className="p-3 text-sm text-slate-500">
                            {format(new Date(c.data_inserimento), 'dd/MM/yyyy HH:mm')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}