import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Chiamata manuale: solo un admin può lanciarla. Da workflow schedulato non c'è utente.
    const chiamante = await base44.auth.me().catch(() => null);
    if (chiamante && chiamante.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Destinatari: tutti gli amministratori dell'app
    const utenti = await base44.asServiceRole.entities.User.list();
    const amministratori = utenti.filter((u) => u.role === 'admin');

    for (const amministratore of amministratori) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: amministratore.email,
        template_name: 'ReminderBackupManuale',
        variables: {
          first_name: amministratore.full_name?.split(' ')[0] || ''
        },
        category: 'transactional'
      });
    }

    return Response.json({ success: true, email_inviate: amministratori.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});