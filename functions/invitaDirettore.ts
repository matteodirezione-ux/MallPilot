import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Solo super_admin e proprietà possono invitare direttori
        if (user.tipo_account !== 'super_admin' && user.tipo_account !== 'proprieta') {
            return Response.json({ error: 'Forbidden: Only super_admin or proprieta can invite directors' }, { status: 403 });
        }

        const { email, full_name, centri_ids } = await req.json();

        if (!email || !full_name || !centri_ids || centri_ids.length === 0) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Invia invito
        await base44.users.inviteUser(email, 'user');

        // Attendi che l'utente sia creato nel sistema
        let nuovoUtente = null;
        for (let i = 0; i < 20; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const users = await base44.asServiceRole.entities.User.filter({ email });
            if (users.length > 0) {
                nuovoUtente = users[0];
                break;
            }
        }

        if (!nuovoUtente) {
            return Response.json({ 
                error: 'User invite sent but user not yet available in system. Please refresh in a few moments.' 
            }, { status: 202 });
        }

        // Aggiorna tipo account e nome
        await base44.asServiceRole.entities.User.update(nuovoUtente.id, {
            tipo_account: 'direttore',
            full_name: full_name
        });

        // Crea assegnazioni ai centri
        await Promise.all(
            centri_ids.map(centro_id =>
                base44.asServiceRole.entities.Assegnazione.create({
                    user_email: email,
                    centro_id
                })
            )
        );

        return Response.json({ 
            success: true, 
            message: 'Director invited and assigned successfully' 
        });

    } catch (error) {
        console.error('Error inviting director:', error);
        return Response.json({ 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
});