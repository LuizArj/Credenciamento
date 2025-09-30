import { NextResponse } from 'next/server';

// Configuração de rate limiting
const rateLimit = {
    tokenBucket: new Map(),
    maxTokens: 50, // Máximo de tokens por IP
    refillRate: 10, // Tokens reabastecidos por minuto
    refillTime: 60 * 1000, // Tempo de reabastecimento em ms (1 minuto)
};

// Função para verificar rate limit
function checkRateLimit(ip) {
    const now = Date.now();
    let bucket = rateLimit.tokenBucket.get(ip);

    // Criar novo bucket se não existir
    if (!bucket) {
        bucket = {
            tokens: rateLimit.maxTokens,
            lastRefill: now,
        };
        rateLimit.tokenBucket.set(ip, bucket);
    }

    // Reabastecer tokens
    const timePassed = now - bucket.lastRefill;
    const refillTokens = Math.floor((timePassed * rateLimit.refillRate) / rateLimit.refillTime);
    
    if (refillTokens > 0) {
        bucket.tokens = Math.min(rateLimit.maxTokens, bucket.tokens + refillTokens);
        bucket.lastRefill = now;
    }

    // Verificar se há tokens disponíveis
    if (bucket.tokens <= 0) {
        return false;
    }

    // Consumir um token
    bucket.tokens--;
    return true;
}

// Middleware de segurança
export async function middleware(request) {
    // Obter IP do cliente (em produção, use X-Forwarded-For ou similar)
    const ip = request.ip || '127.0.0.1';

    // Verificar rate limit para APIs
    if (request.nextUrl.pathname.startsWith('/api/')) {
        if (!checkRateLimit(ip)) {
            return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }
    }

    // Headers de segurança
    const response = NextResponse.next();
    const headers = response.headers;

    // Prevenir XSS e outras injeções
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('X-Content-Type-Options', 'nosniff');
    
    // Política de segurança de conteúdo
    headers.set('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        `connect-src 'self' ${process.env.N8N_WEBHOOK_URL}`,
    ].join('; '));

    // Prevenir clickjacking
    headers.set('X-Frame-Options', 'DENY');

    // Política de referrer
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Desabilitar cache para APIs
    if (request.nextUrl.pathname.startsWith('/api/')) {
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        headers.set('Pragma', 'no-cache');
        headers.set('Expires', '0');
    }

    return response;
}

// Configurar em quais rotas o middleware será executado
export const config = {
    matcher: [
        '/api/:path*',
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};