import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { file_url } = await req.json();
    
    if (!file_url) {
      return Response.json({ error: 'File URL required' }, { status: 400 });
    }

    // Scarica il file Excel
    const response = await fetch(file_url);
    const arrayBuffer = await response.arrayBuffer();
    
    // Leggi il file Excel
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converti in JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    if (rawData.length === 0) {
      return Response.json({ error: 'File Excel vuoto' }, { status: 400 });
    }

    // Mappa i dati dall'Excel all'entità Tenant (converti tutto a stringa)
    const tenantsData = rawData.map(row => ({
      numero_negozio: String(row['N.'] ?? ''),
      ragione_sociale: String(row['RAGIONE SOCIALE'] ?? ''),
      insegna: String(row['INSEGNA'] ?? ''),
      note: row['NOTE'] ? String(row['NOTE']) : '',
      telefono: row['TELEFONO'] ? String(row['TELEFONO']) : '',
      indirizzo_punto_vendita: row['INDIRIZZO PUNTO VENDITA'] ? String(row['INDIRIZZO PUNTO VENDITA']) : '',
      reperibile: row['REPERIBILE'] ? String(row['REPERIBILE']) : '',
      capoarea_resp_commerciale: row['CAPOAREA O RESP COMMERCIALE'] ? String(row['CAPOAREA O RESP COMMERCIALE']) : '',
      mail_urgenze_pv_chiuso: row['MAIL URGENZE P.V. CHIUSO'] ? String(row['MAIL URGENZE P.V. CHIUSO']) : '',
      referente_tecnico: row['REFERENTE TECNICO'] ? String(row['REFERENTE TECNICO']) : '',
      indirizzo_ufficio_marketing: row['INDIRIZZO UFFICIO MARKETING'] ? String(row['INDIRIZZO UFFICIO MARKETING']) : '',
      pec: row['PEC'] ? String(row['PEC']) : '',
      macchina_condizionamento_esterna: row['Macchina esterna'] ? String(row['Macchina esterna']) : '',
      macchina_condizionamento_interna: row['Macchina interna'] ? String(row['Macchina interna']) : ''
    }));

    // Importa i dati nell'entità Tenant
    const createdTenants = [];
    const errors = [];

    for (const tenant of tenantsData) {
      try {
        const tenantData = {
          centro_id: "fano",
          numero_negozio: tenant.numero_negozio,
          ragione_sociale: tenant.ragione_sociale,
          insegna: tenant.insegna,
          note: tenant.note,
          telefono: tenant.telefono,
          indirizzo_punto_vendita: tenant.indirizzo_punto_vendita,
          reperibile: tenant.reperibile,
          capoarea_resp_commerciale: tenant.capoarea_resp_commerciale,
          mail_urgenze_pv_chiuso: tenant.mail_urgenze_pv_chiuso,
          referente_tecnico: tenant.referente_tecnico,
          indirizzo_ufficio_marketing: tenant.indirizzo_ufficio_marketing,
          pec: tenant.pec,
          macchina_condizionamento_esterna: tenant.macchina_condizionamento_esterna,
          macchina_condizionamento_interna: tenant.macchina_condizionamento_interna
        };

        await base44.entities.Tenant.create(tenantData);
        createdTenants.push(tenantData);
      } catch (error) {
        errors.push({
          ragione_sociale: tenant.ragione_sociale,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      imported: createdTenants.length,
      total: rawData.length,
      errors: errors.length > 0 ? errors : null,
      message: `Importati ${createdTenants.length} su ${rawData.length} tenant${errors.length > 0 ? ` con ${errors.length} errori` : ''}`
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});