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

export default function Corrispettivi({ centroSelezionato, user }) {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  // Recupera il tenant collegato all'utente
  const { data: tenantData } = useQuery({
    queryKey: ['user-tenant', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      // Se l'utente ha tenant_id salvato, usa quello
      if (user.tenant_id) {
        try {
          const tenant = await base44.entities.Tenant.get(user.tenant_id);
          return tenant;
        } catch {
          // Se non esiste più, cerca per email
        }
      }
      // Cerca per email del referente
      const tenants = await base44.entities.Tenant.filter({ 
        email_referente: user.email 
      });
      return tenants.length > 0 ? tenants[0] : null;
    },
    enabled: !!user?.email,
  });

  // Carica i corrispettivi dell'utente
  const { data: corrispettivi, isLoading } = useQuery({
    queryKey: ['corrispettivi', user?.email, tenantData?.id],
    queryFn: async () => {
      if (!tenantData?.id) return [];
      return await base44.entities.Corrispettivo.filter({ 
        tenant_id: tenantData.id 
      }, '-mese');
    },
    enabled: !!tenantData?.id,
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

  if (!tenantData) {
    return (
      <div className="p-8 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Nessun tenant collegato</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              Il tuo account non è collegato a nessun negozio. Contatta la proprietà per essere abilitato.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Corrispettivi
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {tenantData.ragione_sociale} - Negozio {tenantData.numero_negozio}
          </p>
        </div>
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
        tenant={tenantData}
        user={user}
      />
    </div>
  );
}