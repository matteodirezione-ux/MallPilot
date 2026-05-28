import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Phone, Mail, MapPin, User, Wrench, Wind, FileText, Calendar, Euro } from 'lucide-react';

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  const hasContent = React.Children.toArray(children).some(c => c !== null && c !== false && c !== undefined);
  if (!hasContent) return null;
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 border-b pb-1">{title}</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>
    </div>
  );
}

export default function DettaglioTenantDialog({ tenant, open, onClose, canViewContractDetails }) {
  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.insegna} className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-blue-600" />
              </div>
            )}
            <div>
              <DialogTitle className="text-xl">{tenant.insegna || tenant.ragione_sociale}</DialogTitle>
              {tenant.insegna && <p className="text-sm text-slate-500">{tenant.ragione_sociale}</p>}
              <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Negozio {tenant.numero_negozio}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <Section title="Contatti">
            <InfoRow label="Telefono" value={tenant.telefono} />
            <InfoRow label="Reperibile" value={tenant.reperibile} />
            <InfoRow label="PEC" value={tenant.pec} />
            <InfoRow label="Mail Urgenze P.V. Chiuso" value={tenant.mail_urgenze_pv_chiuso} />
            <InfoRow label="Mail App" value={tenant.mail_app} />
            <InfoRow label="Capoarea / Resp. Commerciale" value={tenant.capoarea_resp_commerciale} />
            <InfoRow label="Referente Tecnico" value={tenant.referente_tecnico} />
          </Section>

          <Section title="Sede">
            <InfoRow label="Indirizzo Punto Vendita" value={tenant.indirizzo_punto_vendita} />
            <InfoRow label="Indirizzo Ufficio Marketing" value={tenant.indirizzo_ufficio_marketing} />
          </Section>

          <Section title="Impianti">
            <InfoRow label="Condizionamento Esterno" value={tenant.macchina_condizionamento_esterna} />
            <InfoRow label="Condizionamento Interno" value={tenant.macchina_condizionamento_interna} />
          </Section>

          {tenant.note && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 border-b pb-1">Note</h3>
              <p className="text-sm text-slate-600">{tenant.note}</p>
            </div>
          )}

          {canViewContractDetails && (
            <Section title="Contratto">
              <InfoRow label="Data Inizio" value={tenant.data_inizio_contratto ? new Date(tenant.data_inizio_contratto).toLocaleDateString('it-IT') : null} />
              <InfoRow label="Data Scadenza" value={tenant.data_scadenza_contratto ? new Date(tenant.data_scadenza_contratto).toLocaleDateString('it-IT') : null} />
              <InfoRow label="Canone Fisso" value={tenant.canone ? `€ ${tenant.canone.toLocaleString('it-IT')}` : null} />
              <InfoRow label="Canone Variabile" value={tenant.canone_variabile ? `€ ${tenant.canone_variabile.toLocaleString('it-IT')}` : null} />
              {tenant.note_contratto && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-400">Note Contratto</p>
                  <p className="text-sm text-slate-600">{tenant.note_contratto}</p>
                </div>
              )}
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}