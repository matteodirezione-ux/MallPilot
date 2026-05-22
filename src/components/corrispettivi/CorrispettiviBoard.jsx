import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

export default function CorrispettiviBoard({ centroSelezionato, user }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // Carica tutti i tenant del centro
  const { data: allTenants = [] } = useQuery({
    queryKey: ['tenants', centroSelezionato?.id],
    queryFn: async () => {
      if (!centroSelezionato?.id) return [];
      const tenants = await base44.entities.Tenant.filter({
        centro_id: centroSelezionato.id
      });
      return tenants.sort((a, b) => a.ragione_sociale.localeCompare(b.ragione_sociale));
    },
    enabled: !!centroSelezionato?.id,
  });

  // Carica i corrispettivi del mese selezionato
  const { data: corrispettiviMese = [] } = useQuery({
    queryKey: ['corrispettivi-mese', centroSelezionato?.id, selectedMonth],
    queryFn: async () => {
      if (!centroSelezionato?.id || !selectedMonth) return [];
      
      const [year, month] = selectedMonth.split('-');
      const dateStart = new Date(parseInt(year), parseInt(month) - 1, 1);
      const dateEnd = new Date(parseInt(year), parseInt(month), 0);
      
      const allCorrispettivi = await base44.entities.Corrispettivo.list();
      
      return allCorrispettivi.filter(c => {
        const corrisDate = parseISO(c.mese);
        return c.centro_id === centroSelezionato.id &&
               corrisDate >= dateStart && 
               corrisDate <= dateEnd;
      });
    },
    enabled: !!centroSelezionato?.id && !!selectedMonth,
  });

  // Mappa di tenant_id -> corrispettivo
  const corrispettiviMap = corrispettiviMese.reduce((acc, c) => {
    acc[c.tenant_id] = c;
    return acc;
  }, {});

  const fmtEur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n || 0);
  const [year, month] = selectedMonth.split('-');
  const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div>
          <label className="block text-sm font-medium mb-2">Seleziona Mese</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="text-sm text-slate-600 mt-auto">
          Visualizzando: <span className="font-semibold capitalize">{monthName}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stato Inserimenti - {monthName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 font-semibold text-sm">Tenant</th>
                  <th className="text-right p-3 font-semibold text-sm">Corrispettivi Ivati</th>
                  <th className="text-right p-3 font-semibold text-sm">Corrispettivi Netti</th>
                  <th className="text-right p-3 font-semibold text-sm">Scontrini</th>
                  <th className="text-left p-3 font-semibold text-sm">Data Inserimento</th>
                  <th className="text-center p-3 font-semibold text-sm">Stato</th>
                </tr>
              </thead>
              <tbody>
                {allTenants.map(tenant => {
                  const corris = corrispettiviMap[tenant.id];
                  return (
                    <tr key={tenant.id} className="border-b hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-medium">{tenant.ragione_sociale}</div>
                        <div className="text-xs text-slate-500">Negozio {tenant.numero_negozio}</div>
                      </td>
                      <td className="p-3 text-right font-mono">
                        {corris ? fmtEur(corris.corrispettivi_ivati) : '-'}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {corris ? fmtEur(corris.corrispettivi_netti) : '-'}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {corris ? corris.numero_scontrini.toLocaleString('it-IT') : '-'}
                      </td>
                      <td className="p-3 text-sm text-slate-600">
                        {corris ? format(new Date(corris.data_inserimento), 'dd/MM/yyyy HH:mm') : '-'}
                      </td>
                      <td className="p-3 text-center">
                        {corris ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}