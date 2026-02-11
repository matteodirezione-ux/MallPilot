import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.tipo_account !== 'proprieta') {
      return Response.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    const { userId, full_name } = await req.json();

    if (!userId || !full_name) {
      return Response.json({ error: 'Parametri mancanti' }, { status: 400 });
    }

    await base44.asServiceRole.entities.User.update(userId, {
      full_name: full_name
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Errore aggiornamento direttore:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});