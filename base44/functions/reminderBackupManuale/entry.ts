import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: '📋 Promemoria: Backup manuale del database',
      body: `Ciao,\n\nnon dimenticare di fare un backup manuale dei tuoi dati questo mese.\n\nRicorda: stai già ricevendo backup automatici ogni notte, ma un backup manuale aggiuntivo è sempre una buona pratica.\n\nA presto!`
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});