import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verifica se esistono già super admin
        const tuttiUtenti = await base44.asServiceRole.entities.User.list();
        const superAdminEsistenti = tuttiUtenti.filter(u => u.tipo_account === 'super_admin');

        if (superAdminEsistenti.length > 0) {
            return Response.json({ 
                error: 'Esiste già un Super Admin nel sistema' 
            }, { status: 403 });
        }

        // Imposta l'utente corrente come super admin
        await base44.asServiceRole.entities.User.update(user.id, {
            tipo_account: 'super_admin',
            azienda_id: null
        });

        return Response.json({ 
            success: true,
            message: 'Sei stato impostato come Super Admin. Ricarica la pagina.'
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});