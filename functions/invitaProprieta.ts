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
            // Invita nuovo utente usando l'SDK
            await base44.asServiceRole.entities.User.create({
                email: email,
                full_name: full_name,
                role: 'user',
                tipo_account: 'proprieta',
                azienda_id: azienda_id
            });

            
            // Invia l'invito email separatamente
            try {
                await fetch(`https://api.base44.com/api/users/invite`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': req.headers.get('Authorization'),
                        'X-App-Id': Deno.env.get('BASE44_APP_ID')
                    },
                    body: JSON.stringify({
                        email: email,
                        role: 'user'
                    })
                });
            } catch (emailError) {
                console.log('Errore invio email (utente comunque creato):', emailError);
            }
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