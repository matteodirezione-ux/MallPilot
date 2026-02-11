import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ImpostaSuperAdmin() {
  const [loading, setLoading] = useState(false);

  const handleImpostaSuperAdmin = async () => {
    if (!confirm('Sei sicuro di voler diventare Super Admin? Questa operazione funziona solo se non esistono già Super Admin nel sistema.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await base44.functions.invoke('impostaPrimoSuperAdmin');
      
      if (response.data?.error) {
        toast.error(response.data.error);
      } else {
        toast.success(response.data.message);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Errore:', error);
      toast.error('Errore durante l\'impostazione del Super Admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Shield className="w-6 h-6 text-blue-600" />
            Imposta Super Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Primo accesso al sistema</p>
              <p>Clicca il pulsante per impostare il tuo account come Super Admin e gestire le aziende clienti.</p>
              <p className="mt-2 text-xs">Questa operazione funziona solo se non esistono già Super Admin.</p>
            </div>
          </div>

          <Button
            onClick={handleImpostaSuperAdmin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Impostazione in corso...' : 'Diventa Super Admin'}
          </Button>

          <p className="text-xs text-slate-500 text-center">
            Dopo l'impostazione, la pagina si ricaricherà automaticamente
          </p>
        </CardContent>
      </Card>
    </div>
  );
}