import { msalInstance } from '../../lib/auth';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        // Obter conta autenticada
        const account = msalInstance.getAllAccounts()[0];
        if (!account) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        // Buscar token de acesso
        const response = await msalInstance.acquireTokenSilent({
            scopes: ["User.Read", "profile"],
            account: account
        });

        // Retornar token e informações do usuário
        res.status(200).json({ 
            token: response.accessToken,
            user: {
                name: account.name,
                username: account.username,
                roles: account.idTokenClaims.roles || []
            }
        });
    } catch (error) {
        console.error('Erro na autenticação:', error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
}