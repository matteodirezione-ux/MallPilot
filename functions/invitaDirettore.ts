import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.tipo_account !== 'proprieta') {
      return Response.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    const { email, full_name, centri_ids } = await req.json();

    if (!email || !full_name || !centri_ids || centri_ids.length === 0) {
      return Response.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    // Invita l'utente
    await base44.asServiceRole.users.inviteUser(email, 'user');

    // Attendi che l'utente venga creato nel database
    let newUser = null;
    let attempts = 0;
    while (!newUser && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users.length > 0) {
        newUser = users[0];
      }
      attempts++;
    }

    if (!newUser) {
      return Response.json({ error: 'Utente non trovato dopo invito' }, { status: 500 });
    }

    // Aggiorna l'utente con tipo_account e full_name
    await base44.asServiceRole.entities.User.update(newUser.id, {
      tipo_account: 'direttore',
      full_name: full_name
    });

    // Crea le assegnazioni
    await Promise.all(
      centri_ids.map(centro_id =>
        base44.asServiceRole.entities.Assegnazione.create({
          user_email: email,
          centro_id
        })
      )
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('Errore invito direttore:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});