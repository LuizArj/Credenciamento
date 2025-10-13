/**
 * Sistema de Rate Limiting para proteger APIs
 * 
 * @module lib/security/rate-limit
 * @description Implementa rate limiting usando token bucket algorithm
 */

import { securityConfig } from '../config';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Armazena os buckets de tokens por IP
 */
const buckets = new Map<string, TokenBucket>();

/**
 * Configuração do rate limiter
 */
const config = {
  maxTokens: securityConfig.rateLimit.maxRequests, // Máximo de tokens por IP
  windowMs: securityConfig.rateLimit.windowMs, // Janela de tempo em ms
  refillRate: securityConfig.rateLimit.maxRequests / (securityConfig.rateLimit.windowMs / 60000), // Tokens por minuto
};

/**
 * Limpa buckets antigos periodicamente (evita memory leak)
 */
function cleanupOldBuckets(): void {
  const now = Date.now();
  const maxAge = config.windowMs * 2;

  buckets.forEach((bucket, ip) => {
    if (now - bucket.lastRefill > maxAge) {
      buckets.delete(ip);
    }
  });
}

// Executa limpeza a cada 5 minutos
if (typeof window === 'undefined') {
  // Apenas no servidor
  setInterval(cleanupOldBuckets, 5 * 60 * 1000);
}

/**
 * Verifica se uma requisição deve ser permitida
 * 
 * @param identifier - Identificador único (geralmente IP do cliente)
 * @returns true se a requisição deve ser permitida, false caso contrário
 */
export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  let bucket = buckets.get(identifier);

  // Criar novo bucket se não existir
  if (!bucket) {
    bucket = {
      tokens: config.maxTokens,
      lastRefill: now,
    };
    buckets.set(identifier, bucket);
  }

  // Calcular tokens a adicionar baseado no tempo passado
  const timePassed = now - bucket.lastRefill;
  const refillAmount = (timePassed / config.windowMs) * config.maxTokens;

  if (refillAmount > 0) {
    bucket.tokens = Math.min(config.maxTokens, bucket.tokens + refillAmount);
    bucket.lastRefill = now;
  }

  // Verificar se há tokens disponíveis
  if (bucket.tokens < 1) {
    return false;
  }

  // Consumir um token
  bucket.tokens -= 1;
  return true;
}

/**
 * Obtém informações sobre o rate limit de um identificador
 */
export function getRateLimitInfo(identifier: string): {
  remaining: number;
  total: number;
  resetAt: Date;
} {
  const bucket = buckets.get(identifier);

  if (!bucket) {
    return {
      remaining: config.maxTokens,
      total: config.maxTokens,
      resetAt: new Date(Date.now() + config.windowMs),
    };
  }

  return {
    remaining: Math.floor(bucket.tokens),
    total: config.maxTokens,
    resetAt: new Date(bucket.lastRefill + config.windowMs),
  };
}

/**
 * Reseta o rate limit de um identificador (útil para testes ou exceções)
 */
export function resetRateLimit(identifier: string): void {
  buckets.delete(identifier);
}

/**
 * Middleware helper para Next.js API routes
 */
export function withRateLimit<T>(
  handler: (req: any, res: any) => Promise<T>,
  options?: {
    maxRequests?: number;
    windowMs?: number;
  }
) {
  return async (req: any, res: any): Promise<T | void> => {
    // Extrair IP do cliente
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.headers['x-real-ip'] ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    // Verificar rate limit
    if (!checkRateLimit(ip)) {
      const info = getRateLimitInfo(ip);

      res.status(429).json({
        error: 'Too many requests',
        message: 'Por favor, aguarde antes de fazer novas requisições',
        retryAfter: Math.ceil((info.resetAt.getTime() - Date.now()) / 1000),
      });

      return;
    }

    // Adicionar headers de rate limit
    const info = getRateLimitInfo(ip);
    res.setHeader('X-RateLimit-Limit', info.total.toString());
    res.setHeader('X-RateLimit-Remaining', info.remaining.toString());
    res.setHeader('X-RateLimit-Reset', info.resetAt.toISOString());

    return handler(req, res);
  };
}
