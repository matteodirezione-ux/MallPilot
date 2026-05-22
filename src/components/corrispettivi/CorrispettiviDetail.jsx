import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, ChevronLeft, ChevronRight, Pencil, FileDown, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import FormCorrispettivi from '@/components/corrispettivi/FormCorrispettivi';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function CorrispettiviDetail({ tenant, corrispettivi, onBack, user }) {
  const fmtEur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n || 0);
  const [showForm, setShowForm] = useState(false);
  const [corrispettivoDaModificare, setCorrispettivoDaModificare] = useState(null);

  // Raggruppa per anno
  const corrispettiviPerAnno = corrispettivi?.reduce((acc, c) => {
    const anno = new Date(c.mese).getFullYear();
    if (!acc[anno]) acc[anno] = [];
    acc[anno].push(c);
    return acc;
  }, {}) || {};

  const anni = Object.keys(corrispettiviPerAnno).sort((a, b) => b - a);
  const annoCorrente = new Date().getFullYear();
  const [annoSelezionato, setAnnoSelezionato] = useState(anni.length > 0 ? anni[0] : annoCorrente.toString());
  
  // Genera tutti i 12 mesi per l'anno selezionato
  const tuttiIMesi = React.useMemo(() => {
    const mesi = [];
    for (let i = 0; i < 12; i++) {
      const mese = new Date(annoSelezionato, i, 1);
      mesi.push({
        key: format(mese, 'yyyy-MM'),
        label: format(mese, 'MMMM yyyy', { locale: it })
      });
    }
    return mesi;
  }, [annoSelezionato]);

  const canModify = user?.tipo_account === 'proprieta' || user?.tipo_account === 'direttore';

  const handleModify = (corrispettivo) => {
    setCorrispettivoDaModificare(corrispettivo);
    setShowForm(true);
  };

  // Calcola i totali per l'anno selezionato
  const totaliAnno = useMemo(() => {
    const dati = corrispettiviPerAnno[annoSelezionato] || [];
    return {
      ivati: dati.reduce((sum, c) => sum + (c.corrispettivi_ivati || 0), 0),
      netti: dati.reduce((sum, c) => sum + (c.corrispettivi_netti || 0), 0),
      scontrini: dati.reduce((sum, c) => sum + (c.numero_scontrini || 0), 0)
    };
  }, [corrispettiviPerAnno, annoSelezionato]);

  // Export Excel
  const handleExportExcel = () => {
    const dati = tuttiIMesi.map(mese => {
      const corrispettivo = corrispettiviPerAnno[annoSelezionato]?.find(
        c => format(new Date(c.mese), 'yyyy-MM') === mese.key
      );
      return {
        Mese: mese.label,
        'Corrispettivi Ivati': corrispettivo ? corrispettivo.corrispettivi_ivati : 0,
        'Corrispettivi Netti': corrispettivo ? corrispettivo.corrispettivi_netti : 0,
        'Numero Scontrini': corrispettivo ? corrispettivo.numero_scontrini : 0,
        'Data Inserimento': corrispettivo ? format(new Date(corrispettivo.data_inserimento), 'dd/MM/yyyy HH:mm') : '-'
      };
    });

    // Aggiungi riga totali
    dati.push({
      Mese: 'TOTALI',
      'Corrispettivi Ivati': totaliAnno.ivati,
      'Corrispettivi Netti': totaliAnno.netti,
      'Numero Scontrini': totaliAnno.scontrini,
      'Data Inserimento': ''
    });

    const ws = XLSX.utils.json_to_sheet(dati);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Corrispettivi');
    
    const fileName = `Corrispettivi_${tenant.insegna || tenant.ragione_sociale}_${annoSelezionato}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Titolo
    doc.setFontSize(16);
    doc.text(`Corrispettivi ${annoSelezionato}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`${tenant.insegna || tenant.ragione_sociale} - Negozio ${tenant.numero_negozio}`, 14, 28);
    
    // Tabella
    const tableData = tuttiIMesi.map(mese => {
      const corrispettivo = corrispettiviPerAnno[annoSelezionato]?.find(
        c => format(new Date(c.mese), 'yyyy-MM') === mese.key
      );
      return [
        mese.label,
        corrispettivo ? fmtEur(corrispettivo.corrispettivi_ivati) : '-',
        corrispettivo ? fmtEur(corrispettivo.corrispettivi_netti) : '-',
        corrispettivo ? corrispettivo.numero_scontrini.toLocaleString('it-IT') : '-',
        corrispettivo ? format(new Date(corrispettivo.data_inserimento), 'dd/MM/yyyy HH:mm') : '-'
      ];
    });

    // Aggiungi riga totali
    tableData.push([
      'TOTALI',
      fmtEur(totaliAnno.ivati),
      fmtEur(totaliAnno.netti),
      totaliAnno.scontrini.toLocaleString('it-IT'),
      ''
    ]);

    doc.autoTable({
      head: [['Mese', 'Corrispettivi Ivati', 'Corrispettivi Netti', 'Scontrini', 'Data Inserimento']],
      body: tableData,
      startY: 35,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    const fileName = `Corrispettivi_${tenant.insegna || tenant.ragione_sociale}_${annoSelezionato}.pdf`;
    doc.save(fileName);
  };

  const handlePrevYear = () => {
    const currentIndex = anni.indexOf(annoSelezionato);
    if (currentIndex < anni.length - 1) {
      setAnnoSelezionato(anni[currentIndex + 1]);
    }
  };

  const handleNextYear = () => {
    const currentIndex = anni.indexOf(annoSelezionato);
    if (currentIndex > 0) {
      setAnnoSelezionato(anni[currentIndex - 1]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between w-full">
          <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2">
            {anni.length > 1 && (
              <>
                <Button variant="outline" size="icon" onClick={handlePrevYear} disabled={anni.indexOf(annoSelezionato) >= anni.length - 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-semibold min-w-[80px] text-center">{annoSelezionato}</span>
                <Button variant="outline" size="icon" onClick={handleNextYear} disabled={anni.indexOf(annoSelezionato) <= 0}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
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
        {anni.length > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevYear} disabled={anni.indexOf(annoSelezionato) >= anni.length - 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold min-w-[80px] text-center">{annoSelezionato}</span>
            <Button variant="outline" size="icon" onClick={handleNextYear} disabled={anni.indexOf(annoSelezionato) <= 0}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {anni.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            Nessun corrispettivo inserito per questo tenant.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{annoSelezionato}</CardTitle>
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
                    {canModify && <th className="text-center p-3 font-semibold text-sm">Azioni</th>}
                  </tr>
                </thead>
                <tbody>
                  {tuttiIMesi.map(mese => {
                    const corrispettivo = corrispettiviPerAnno[annoSelezionato]?.find(
                      c => format(new Date(c.mese), 'yyyy-MM') === mese.key
                    );
                    if (!corrispettivo) {
                      return (
                        <tr key={mese.key} className="border-b hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-400">
                            {mese.label.charAt(0).toUpperCase() + mese.label.slice(1)}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-300">-</td>
                          <td className="p-3 text-right font-mono text-slate-300">-</td>
                          <td className="p-3 text-right font-mono text-slate-300">-</td>
                          <td className="p-3 text-sm text-slate-300">-</td>
                          {canModify && (
                            <td className="p-3 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8"
                                onClick={() => {
                                  setCorrispettivoDaModificare({
                                    mese: mese.key + '-01',
                                    corrispettivi_ivati: 0,
                                    corrispettivi_netti: 0,
                                    numero_scontrini: 0
                                  });
                                  setShowForm(true);
                                }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    }
                    return (
                      <tr key={corrispettivo.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium">
                          {corrispettivo ? format(new Date(corrispettivo.mese), 'MMMM yyyy', { locale: it }).charAt(0).toUpperCase() + format(new Date(corrispettivo.mese), 'MMMM yyyy', { locale: it }).slice(1) : mese.label}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {fmtEur(corrispettivo.corrispettivi_ivati)}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {fmtEur(corrispettivo.corrispettivi_netti)}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {corrispettivo.numero_scontrini.toLocaleString('it-IT')}
                        </td>
                        <td className="p-3 text-sm text-slate-500">
                          {format(new Date(corrispettivo.data_inserimento), 'dd/MM/yyyy HH:mm')}
                        </td>
                        {canModify && (
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8"
                              onClick={() => handleModify(corrispettivo)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {/* Riga Totali */}
                  <tr className="border-b-2 border-slate-300 bg-slate-50 font-bold">
                    <td className="p-3">TOTALI</td>
                    <td className="p-3 text-right font-mono">{fmtEur(totaliAnno.ivati)}</td>
                    <td className="p-3 text-right font-mono">{fmtEur(totaliAnno.netti)}</td>
                    <td className="p-3 text-right font-mono">{totaliAnno.scontrini.toLocaleString('it-IT')}</td>
                    <td className="p-3"></td>
                    {canModify && <td className="p-3"></td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <FormCorrispettivi
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setCorrispettivoDaModificare(null);
        }}
        tenant={tenant}
        user={user}
        corrispettivoDaModificare={corrispettivoDaModificare}
      />
    </div>
  );
}