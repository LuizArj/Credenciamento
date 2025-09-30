// utils/cpe-auth.js

// Simples cache em memória para armazenar o token da CPE
let cpeTokenCache = {
  accessToken: null,
  expiresAt: null,
};

// Função para obter um token válido (novo ou do cache)
export async function getCpeToken() {
  const now = new Date();
  
  if (cpeTokenCache.accessToken && cpeTokenCache.expiresAt > now) {
    console.log("Reutilizando token da CPE do cache.");
    return cpeTokenCache.accessToken;
  }

  console.log("Token da CPE expirado ou inexistente. Solicitando um novo...");
  const authUrl = 'https://amei.sebrae.com.br/auth/realms/externo/protocol/openid-connect/token';
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', process.env.CPE_CLIENT_ID);
  params.append('client_secret', process.env.CPE_CLIENT_SECRET);

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    throw new Error('Falha ao obter o token de acesso da CPE.');
  }

  const data = await response.json();
  const expiresIn = data.expires_in || 1800;

  cpeTokenCache.accessToken = data.access_token;
  cpeTokenCache.expiresAt = new Date(now.getTime() + (expiresIn * 1000));

  return cpeTokenCache.accessToken;
}