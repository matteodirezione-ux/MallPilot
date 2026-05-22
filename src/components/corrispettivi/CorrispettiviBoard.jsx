import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Edit, ChevronLeft, ChevronRight, Plus, Pencil, FileDown, FileSpreadsheet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import FormCorrispettivi from '@/components/corrispettivi/FormCorrispettivi';
import CorrispettiviDetail from '@/components/corrispettivi/CorrispettiviDetail';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function CorrispettiviBoard({ centroSelezionato, user }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [showForm, setShowForm] = useState(false);
  const [tenantDaInserire, setTenantDaInserire] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);

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
      
      const dateStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const dateEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
      
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
  const monthName = selectedMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;

  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  const handleInserisci = (tenant) => {
    setTenantDaInserire(tenant);
    setShowForm(true);
  };

  const handleTenantClick = async (tenant) => {
    const corrispettivi = await base44.entities.Corrispettivo.filter({ 
      tenant_id: tenant.id 
    }, '-mese');
    setSelectedTenant({ ...tenant, corrispettivi });
  };

  const handleBack = () => {
    setSelectedTenant(null);
  };

  const [showFormBoard, setShowFormBoard] = useState(false);
  const [corrispettivoDaModificareBoard, setCorrispettivoDaModificareBoard] = useState(null);

  const handleModifyFromBoard = async (tenant, corrispettivo) => {
    setCorrispettivoDaModificareBoard(corrispettivo);
    setShowFormBoard(true);
  };

  // Calcola i totali per il mese selezionato
  const totaliMese = {
    ivati: corrispettiviMese.reduce((sum, c) => sum + (c.corrispettivi_ivati || 0), 0),
    netti: corrispettiviMese.reduce((sum, c) => sum + (c.corrispettivi_netti || 0), 0),
    scontrini: corrispettiviMese.reduce((sum, c) => sum + (c.numero_scontrini || 0), 0)
  };

  // Export Excel
  const handleExportExcel = () => {
    const dati = allTenants.map(tenant => {
      const corris = corrispettiviMap[tenant.id];
      return {
        Tenant: tenant.insegna || tenant.ragione_sociale,
        'Negozio': tenant.numero_negozio,
        'Corrispettivi Ivati': corris ? corris.corrispettivi_ivati : 0,
        'Corrispettivi Netti': corris ? corris.corrispettivi_netti : 0,
        'Numero Scontrini': corris ? corris.numero_scontrini : 0,
        'Data Inserimento': corris ? format(new Date(corris.data_inserimento), 'dd/MM/yyyy HH:mm') : '-'
      };
    });

    // Aggiungi riga totali
    dati.push({
      Tenant: 'TOTALI',
      'Negozio': '',
      'Corrispettivi Ivati': totaliMese.ivati,
      'Corrispettivi Netti': totaliMese.netti,
      'Numero Scontrini': totaliMese.scontrini,
      'Data Inserimento': ''
    });

    const ws = XLSX.utils.json_to_sheet(dati);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Corrispettivi');
    
    const fileName = `Corrispettivi_${monthKey}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Titolo
    doc.setFontSize(16);
    doc.text(`Corrispettivi - ${monthName}`, 14, 20);
    
    // Tabella
    const tableData = allTenants.map(tenant => {
      const corris = corrispettiviMap[tenant.id];
      return [
        tenant.insegna || tenant.ragione_sociale,
        tenant.numero_negozio,
        corris ? fmtEur(corris.corrispettivi_ivati) : '-',
        corris ? fmtEur(corris.corrispettivi_netti) : '-',
        corris ? corris.numero_scontrini.toLocaleString('it-IT') : '-',
        corris ? format(new Date(corris.data_inserimento), 'dd/MM/yyyy HH:mm') : '-'
      ];
    });

    // Aggiungi riga totali
    tableData.push([
      'TOTALI',
      '',
      fmtEur(totaliMese.ivati),
      fmtEur(totaliMese.netti),
      totaliMese.scontrini.toLocaleString('it-IT'),
      ''
    ]);

    doc.autoTable({
      head: [['Tenant', 'Negozio', 'Corrispettivi Ivati', 'Corrispettivi Netti', 'Scontrini', 'Data Inserimento']],
      body: tableData,
      startY: 30,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    const fileName = `Corrispettivi_${monthKey}.pdf`;
    doc.save(fileName);
  };

  if (selectedTenant) {
    return (
      <CorrispettiviDetail 
        tenant={selectedTenant} 
        corrispettivi={selectedTenant.corrispettivi} 
        onBack={handleBack}
        user={user}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold capitalize min-w-[200px] text-center">{monthName}</span>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportExcel} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="gap-2">
            <FileDown className="w-4 h-4" />
            PDF
          </Button>
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
                  <tr 
                    key={tenant.id} 
                    className="border-b hover:bg-slate-50"
                  >
                    <td 
                      className="p-3 cursor-pointer"
                      onClick={() => handleTenantClick(tenant)}
                    >
                      <div className="font-medium">{tenant.insegna || tenant.ragione_sociale}</div>
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
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                          {(user?.tipo_account === 'proprieta' || user?.tipo_account === 'direttore') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleModifyFromBoard(tenant, corris);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <XCircle className="w-5 h-5 text-red-600" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInserisci(tenant);
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {/* Riga Totali */}
              <tr className="border-b-2 border-slate-300 bg-slate-50 font-bold">
                <td className="p-3">TOTALI</td>
                <td className="p-3 text-right font-mono">{fmtEur(totaliMese.ivati)}</td>
                <td className="p-3 text-right font-mono">{fmtEur(totaliMese.netti)}</td>
                <td className="p-3 text-right font-mono">{totaliMese.scontrini.toLocaleString('it-IT')}</td>
                <td className="p-3"></td>
                <td className="p-3"></td>
              </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <FormCorrispettivi
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setTenantDaInserire(null);
        }}
        tenant={tenantDaInserire}
        user={user}
        meseIniziale={monthKey}
      />

      <FormCorrispettivi
        open={showFormBoard}
        onClose={() => {
          setShowFormBoard(false);
          setCorrispettivoDaModificareBoard(null);
        }}
        tenant={corrispettivoDaModificareBoard ? { id: corrispettivoDaModificareBoard.tenant_id } : null}
        user={user}
        corrispettivoDaModificare={corrispettivoDaModificareBoard}
      />
    </div>
  );
}