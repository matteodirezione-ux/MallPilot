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

        // Verifica se l'utente esiste già
        const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
        
        if (existingUsers.length > 0) {
            // Utente già esiste, aggiorna solo i dati
            await base44.asServiceRole.entities.User.update(existingUsers[0].id, {
                tipo_account: 'proprieta',
                azienda_id: azienda_id,
                full_name: full_name
            });
        } else {
            // Invita nuovo utente
            const inviteResult = await fetch(`https://api.base44.com/v1/users/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('BASE44_SERVICE_ROLE_KEY')}`,
                    'X-App-Id': Deno.env.get('BASE44_APP_ID')
                },
                body: JSON.stringify({
                    email: email,
                    role: 'user'
                })
            });

            if (!inviteResult.ok) {
                const errorText = await inviteResult.text();
                throw new Error(`Errore nell'invito utente: ${errorText}`);
            }

            // Attendi che l'utente sia creato nel database (con retry)
            let newUser = null;
            for (let i = 0; i < 30; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const users = await base44.asServiceRole.entities.User.filter({ email });
                if (users.length > 0) {
                    newUser = users[0];
                    break;
                }
            }

            if (!newUser) {
                return Response.json({ 
                    error: 'Utente invitato ma non trovato nel database. Riprova tra qualche istante.' 
                }, { status: 500 });
            }

            // Aggiorna il tipo di account e l'azienda
            await base44.asServiceRole.entities.User.update(newUser.id, {
                tipo_account: 'proprieta',
                azienda_id: azienda_id,
                full_name: full_name
            });
        }

        return Response.json({ 
            success: true,
            message: 'Proprietà invitato con successo'
        });
    } catch (error) {
        console.error('Errore invito proprietà:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});