import { msalInstance } from '../lib/auth';

// Middleware para verificar autenticação
export function withAuth(handler) {
    return async (req, res) => {
        try {
            // Verificar token no header de autorização
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Token não fornecido' });
            }

            const token = authHeader.split(' ')[1];
            
            // Verificar token com o MSAL
            const account = msalInstance.getAllAccounts()[0];
            if (!account) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }

            // Adicionar dados do usuário ao request
            req.user = {
                name: account.name,
                username: account.username,
                roles: account.idTokenClaims.roles || []
            };
            
            // Chamar o próximo handler
            return handler(req, res);
        } catch (error) {
            console.error('Erro de autenticação:', error);
            return res.status(401).json({ error: 'Erro na autenticação' });
        }
    };
}

// Função para gerar token de acesso temporário
export function generateAccessToken(attendantName, eventId) {
    return generateToken({
        attendantName,
        eventId,
        type: 'access',
        timestamp: Date.now()
    });
}