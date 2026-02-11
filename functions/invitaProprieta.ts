import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.tipo_account !== 'super_admin') {
            return Response.json({ error: 'Non autorizzato' }, { status: 403 });
        }

        const { email, full_name, azienda_id } = await req.json();

        if (!email || !full_name || !azienda_id) {
            return Response.json({ 
                error: 'Email, nome completo e ID azienda sono obbligatori' 
            }, { status: 400 });
        }

        // Invita l'utente
        await base44.users.inviteUser(email, 'user');

        // Attendi che l'utente sia creato nel database (con retry)
        let newUser = null;
        for (let i = 0; i < 20; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const users = await base44.asServiceRole.entities.User.filter({ email });
            if (users.length > 0) {
                newUser = users[0];
                break;
            }
        }

        if (!newUser) {
            return Response.json({ 
                error: 'Utente invitato ma non trovato nel database' 
            }, { status: 500 });
        }

        // Aggiorna il tipo di account e l'azienda
        await base44.asServiceRole.entities.User.update(newUser.id, {
            tipo_account: 'proprieta',
            azienda_id: azienda_id,
            full_name: full_name
        });

        return Response.json({ 
            success: true,
            message: 'Proprietà invitato con successo'
        });
    } catch (error) {
        console.error('Errore invito proprietà:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});