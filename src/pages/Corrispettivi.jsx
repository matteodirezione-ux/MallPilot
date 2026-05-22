import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, TrendingUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import FormCorrispettivi from '@/components/corrispettivi/FormCorrispettivi';
import CorrispettiviBoard from '@/components/corrispettivi/CorrispettiviBoard';

export default function Corrispettivi({ centroSelezionato, user }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const queryClient = useQueryClient();

  // Leggi il parametro tenant_id dall'URL
  const tenantIdFromUrl = new URLSearchParams(window.location.search).get('tenant_id');

  // Carica tutti i tenant (per proprietà/direttore)
  const { data: allTenants } = useQuery({
    queryKey: ['tenants', centroSelezionato?.id],
    queryFn: async () => {
      if (!centroSelezionato?.id) return [];
      const tenants = await base44.entities.Tenant.filter({ 
        centro_id: centroSelezionato.id 
      });
      return tenants.sort((a, b) => a.ragione_sociale.localeCompare(b.ragione_sociale));
    },
    enabled: user?.tipo_account === 'proprieta' || user?.tipo_account === 'direttore',
  });

  // Recupera il tenant collegato all'utente (solo per tenant)
  const { data: userTenant } = useQuery({
    queryKey: ['user-tenant', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const tenants = await base44.entities.Tenant.filter({ 
        mail_app: user.email 
      });
      return tenants.length > 0 ? tenants[0] : null;
    },
    enabled: user?.tipo_account === 'tenant',
  });

  // Carica il tenant specifico dall'URL se presente
  const { data: tenantFromUrl } = useQuery({
    queryKey: ['tenant-from-url', tenantIdFromUrl],
    queryFn: async () => {
      if (!tenantIdFromUrl) return null;
      try {
        return await base44.entities.Tenant.get(tenantIdFromUrl);
      } catch {
        return null;
      }
    },
    enabled: !!tenantIdFromUrl,
  });

  // Imposta il tenant selezionato
  useEffect(() => {
    if (tenantFromUrl) {
      // Priorità al tenant dall'URL
      setSelectedTenant(tenantFromUrl);
    } else if (user?.tipo_account === 'tenant' && userTenant) {
      setSelectedTenant(userTenant);
    } else if (allTenants?.length > 0 && !selectedTenant) {
      setSelectedTenant(allTenants[0]);
    }
  }, [tenantFromUrl, userTenant, allTenants, user?.tipo_account]);

  // Carica i corrispettivi del tenant selezionato
  const { data: corrispettivi, isLoading } = useQuery({
    queryKey: ['corrispettivi', selectedTenant?.id],
    queryFn: async () => {
      if (!selectedTenant?.id) return [];
      return await base44.entities.Corrispettivo.filter({ 
        tenant_id: selectedTenant.id 
      }, '-mese');
    },
    enabled: !!selectedTenant?.id,
  });

  // Raggruppa per anno
  const corrispettiviPerAnno = corrispettivi?.reduce((acc, c) => {
    const anno = new Date(c.mese).getFullYear();
    if (!acc[anno]) acc[anno] = [];
    acc[anno].push(c);
    return acc;
  }, {}) || {};

  const anni = Object.keys(corrispettiviPerAnno).sort((a, b) => b - a);

  const fmtEur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n || 0);

  // Vista board per proprietà/direttore
  if (user?.tipo_account === 'proprieta' || user?.tipo_account === 'direttore') {
    return (
      <div className="p-3 sm:p-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6">
          <TrendingUp className="w-6 h-6" />
          Corrispettivi
        </h1>
        <CorrispettiviBoard centroSelezionato={centroSelezionato} user={user} />
      </div>
    );
  }

  if (!selectedTenant) {
    return (
      <div className="p-8 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Nessun tenant disponibile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              Non ci sono tenant disponibili per questo centro commerciale.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Corrispettivi
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {selectedTenant.ragione_sociale} - Negozio {selectedTenant.numero_negozio}
          </p>
        </div>
        {(user?.tipo_account === 'proprieta' || user?.tipo_account === 'direttore') && (
          <select
            value={selectedTenant.id}
            onChange={(e) => setSelectedTenant(allTenants.find(t => t.id === e.target.value))}
            className="px-3 py-2 border rounded-lg bg-white text-sm"
          >
            {allTenants.map(t => (
              <option key={t.id} value={t.id}>{t.ragione_sociale} - {t.numero_negozio}</option>
            ))}
          </select>
        )}
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1" /> Nuovo Inserimento
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Caricamento...</div>
      ) : anni.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            Nessun corrispettivo inserito. Clicca su "Nuovo Inserimento" per aggiungere i dati.
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

      <FormCorrispettivi
        open={showForm}
        onClose={() => setShowForm(false)}
        tenant={selectedTenant}
        user={user}
      />
    </div>
  );
}