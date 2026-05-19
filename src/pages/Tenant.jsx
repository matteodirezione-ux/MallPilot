import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Building2, Edit, Trash2, Upload, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { compressImage } from '@/lib/compressImage';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function TenantPage({ centroSelezionato, user }) {
  const [openForm, setOpenForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('numero_negozio');
  const [sortDirection, setSortDirection] = useState('asc');
  const queryClient = useQueryClient();
  
  const isAdmin = user?.tipo_account === 'proprieta' || user?.tipo_account === 'direttore';

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants', centroSelezionato?.id],
    queryFn: async () => {
      if (!centroSelezionato?.id) return [];
      return base44.entities.Tenant.filter({ centro_id: centroSelezionato.id });
    },
    enabled: !!centroSelezionato?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (tenantData) => {
      if (editingTenant) {
        return base44.entities.Tenant.update(editingTenant.id, tenantData);
      }
      return base44.entities.Tenant.create(tenantData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setOpenForm(false);
      setEditingTenant(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => base44.entities.Tenant.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });

  const handleEdit = (tenant) => {
    setEditingTenant(tenant);
    setOpenForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Sei sicuro di voler eliminare questo tenant?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedTenants = tenants
    .filter(tenant => {
      const search = searchTerm.toLowerCase();
      return (
        (tenant.insegna && tenant.insegna.toLowerCase().includes(search)) ||
        (tenant.ragione_sociale && tenant.ragione_sociale.toLowerCase().includes(search)) ||
        (tenant.numero_negozio && tenant.numero_negozio.toLowerCase().includes(search))
      );
    })
    .sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const comparison = aVal.localeCompare(bVal, 'it', { numeric: true });
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  if (!centroSelezionato) {
    return (
      <div className="p-8 text-center text-slate-500">
        Seleziona un centro commerciale per visualizzare i tenant
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tenant - Amministrazione</h1>
          <p className="text-slate-500">Gestione anagrafiche e contratti di affitto</p>
        </div>
        <Dialog open={openForm} onOpenChange={(open) => { setOpenForm(open); if (!open) setEditingTenant(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nuovo Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTenant ? 'Modifica Tenant' : 'Nuovo Tenant'}</DialogTitle>
            </DialogHeader>
            <TenantForm
              tenant={editingTenant}
              centroId={centroSelezionato.id}
              onSave={saveMutation.mutate}
              onCancel={() => { setOpenForm(false); setEditingTenant(null); }}
              isAdmin={isAdmin}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cerca per insegna, ragione sociale o n. negozio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-500">Caricamento...</div>
      ) : filteredAndSortedTenants.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            {tenants.length === 0 
              ? 'Nessun tenant presente. Clicca su "Nuovo Tenant" per aggiungere il primo.'
              : 'Nessun risultato trovato per la ricerca.'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-16"></TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                      onClick={() => handleSort('numero_negozio')}
                    >
                      <div className="flex items-center gap-1">
                        N. Negozio
                        {sortField === 'numero_negozio' && (
                          sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                      onClick={() => handleSort('insegna')}
                    >
                      <div className="flex items-center gap-1">
                        Insegna
                        {sortField === 'insegna' && (
                          sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                      onClick={() => handleSort('ragione_sociale')}
                    >
                      <div className="flex items-center gap-1">
                        Ragione Sociale
                        {sortField === 'ragione_sociale' && (
                          sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Telefono</TableHead>
                    <TableHead className="whitespace-nowrap">Reperibile</TableHead>
                    <TableHead className="whitespace-nowrap">PEC</TableHead>
                    <TableHead className="whitespace-nowrap">Email Urgenze</TableHead>
                    {isAdmin && <TableHead className="whitespace-nowrap">Data Scadenza</TableHead>}
                    {isAdmin && <TableHead className="whitespace-nowrap text-right">Canone</TableHead>}
                    <TableHead className="text-right whitespace-nowrap">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTenants.map((tenant) => (
                    <TableRow key={tenant.id} className="hover:bg-slate-50">
                      <TableCell>
                        {tenant.logo_url ? (
                          <img src={tenant.logo_url} alt={tenant.insegna || tenant.ragione_sociale} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{tenant.numero_negozio}</TableCell>
                      <TableCell className="whitespace-nowrap">{tenant.insegna || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={tenant.ragione_sociale}>
                        {tenant.ragione_sociale}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{tenant.telefono || '-'}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={tenant.reperibile}>
                        {tenant.reperibile || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{tenant.pec || '-'}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={tenant.mail_urgenze_pv_chiuso}>
                        {tenant.mail_urgenze_pv_chiuso || '-'}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="whitespace-nowrap">
                          {tenant.data_scadenza_contratto ? new Date(tenant.data_scadenza_contratto).toLocaleDateString('it-IT') : '-'}
                        </TableCell>
                      )}
                      {isAdmin && (
                        <TableCell className="text-right whitespace-nowrap">
                          {tenant.canone ? `€ ${tenant.canone.toLocaleString('it-IT')}` : '-'}
                        </TableCell>
                      )}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(tenant)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(tenant.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TenantForm({ tenant, centroId, onSave, onCancel, isAdmin }) {
  const [formData, setFormData] = useState({
    centro_id: centroId,
    numero_negozio: tenant?.numero_negozio || '',
    ragione_sociale: tenant?.ragione_sociale || '',
    insegna: tenant?.insegna || '',
    note: tenant?.note || '',
    telefono: tenant?.telefono || '',
    indirizzo_punto_vendita: tenant?.indirizzo_punto_vendita || '',
    reperibile: tenant?.reperibile || '',
    capoarea_resp_commerciale: tenant?.capoarea_resp_commerciale || '',
    mail_urgenze_pv_chiuso: tenant?.mail_urgenze_pv_chiuso || '',
    referente_tecnico: tenant?.referente_tecnico || '',
    indirizzo_ufficio_marketing: tenant?.indirizzo_ufficio_marketing || '',
    macchina_condizionamento_esterna: tenant?.macchina_condizionamento_esterna || '',
    macchina_condizionamento_interna: tenant?.macchina_condizionamento_interna || '',
    pec: tenant?.pec || '',
    data_inizio_contratto: tenant?.data_inizio_contratto || '',
    data_scadenza_contratto: tenant?.data_scadenza_contratto || '',
    canone: tenant?.canone || 0,
    canone_variabile: tenant?.canone_variabile || 0,
    note_contratto: tenant?.note_contratto || '',
    logo_url: tenant?.logo_url || '',
  });

  const [uploading, setUploading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
      setFormData({ ...formData, logo_url: file_url });
    } catch (error) {
      console.error('Errore upload logo:', error);
      alert('Errore nel caricamento del logo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Numero Negozio *</Label>
          <Input
            value={formData.numero_negozio}
            onChange={(e) => setFormData({ ...formData, numero_negozio: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Insegna</Label>
          <Input
            value={formData.insegna}
            onChange={(e) => setFormData({ ...formData, insegna: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>Ragione Sociale *</Label>
        <Input
          value={formData.ragione_sociale}
          onChange={(e) => setFormData({ ...formData, ragione_sociale: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>Note</Label>
        <Textarea
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Telefono</Label>
          <Input
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
          />
        </div>
        <div>
          <Label>Reperibile</Label>
          <Input
            value={formData.reperibile}
            onChange={(e) => setFormData({ ...formData, reperibile: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>Indirizzo Punto Vendita</Label>
        <Input
          value={formData.indirizzo_punto_vendita}
          onChange={(e) => setFormData({ ...formData, indirizzo_punto_vendita: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Capoarea / Resp. Commerciale</Label>
          <Input
            value={formData.capoarea_resp_commerciale}
            onChange={(e) => setFormData({ ...formData, capoarea_resp_commerciale: e.target.value })}
          />
        </div>
        <div>
          <Label>Mail Urgenze P.V. Chiuso</Label>
          <Input
            type="email"
            value={formData.mail_urgenze_pv_chiuso}
            onChange={(e) => setFormData({ ...formData, mail_urgenze_pv_chiuso: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Referente Tecnico</Label>
          <Input
            value={formData.referente_tecnico}
            onChange={(e) => setFormData({ ...formData, referente_tecnico: e.target.value })}
          />
        </div>
        <div>
          <Label>Indirizzo Ufficio Marketing</Label>
          <Input
            value={formData.indirizzo_ufficio_marketing}
            onChange={(e) => setFormData({ ...formData, indirizzo_ufficio_marketing: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Macchina Condizionamento Esterna</Label>
          <Input
            value={formData.macchina_condizionamento_esterna}
            onChange={(e) => setFormData({ ...formData, macchina_condizionamento_esterna: e.target.value })}
          />
        </div>
        <div>
          <Label>Macchina Condizionamento Interna</Label>
          <Input
            value={formData.macchina_condizionamento_interna}
            onChange={(e) => setFormData({ ...formData, macchina_condizionamento_interna: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>PEC</Label>
        <Input
          type="email"
          value={formData.pec}
          onChange={(e) => setFormData({ ...formData, pec: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        {formData.logo_url && (
          <img src={formData.logo_url} alt="Logo" className="w-32 h-32 object-cover rounded-lg mb-2" />
        )}
        <div className="flex items-center gap-2">
          <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
          {uploading && <span className="text-sm text-slate-500">Caricamento...</span>}
        </div>
      </div>

      {isAdmin && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Inizio Contratto</Label>
              <Input
                type="date"
                value={formData.data_inizio_contratto}
                onChange={(e) => setFormData({ ...formData, data_inizio_contratto: e.target.value })}
              />
            </div>
            <div>
              <Label>Data Scadenza Contratto</Label>
              <Input
                type="date"
                value={formData.data_scadenza_contratto}
                onChange={(e) => setFormData({ ...formData, data_scadenza_contratto: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Canone Fisso (€)</Label>
              <Input
                type="number"
                value={formData.canone}
                onChange={(e) => setFormData({ ...formData, canone: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Canone Variabile (€)</Label>
              <Input
                type="number"
                value={formData.canone_variabile}
                onChange={(e) => setFormData({ ...formData, canone_variabile: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <Label>Note Contratto</Label>
            <Textarea
              value={formData.note_contratto}
              onChange={(e) => setFormData({ ...formData, note_contratto: e.target.value })}
              rows={2}
            />
          </div>
        </>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>
        <Button type="submit">Salva</Button>
      </div>
    </form>
  );
}