import NextAuth from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';
import https from 'https';
import { query, withTransaction, setSessionVariables } from '../../../lib/config/database';

// Desabilitar verificação SSL em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export const authOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER,
      wellKnown: undefined, // Desabilita descoberta automática
      authorization: {
        url: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/auth`,
        params: {
          scope: 'openid email profile',
          response_type: 'code',
        },
      },
      token: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
      userinfo: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/userinfo`,
      jwks_endpoint: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username,
          email: profile.email,
          roles: profile.roles || profile.groups || [],
        };
      },
      httpOptions: {
        timeout: 10000,
        agent: new https.Agent({
          rejectUnauthorized: false,
        }),
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // Log apenas em caso de erro ou primeira autenticação
      if (process.env.NODE_ENV === 'development' && account) {
        const identAuth = token.name || token.email || token.sub || '(sem identificador)';
        console.log('NextAuth: Nova autenticação para', identAuth);
      }

      if (account && account.provider === 'keycloak') {
        // Usuário Keycloak - verificar se precisa registrar
        token.accessToken = account.access_token;
        token.roles = profile?.roles || [];
        token.isLocalUser = false;

        // Auto-registro do usuário do Keycloak no sistema de permissões
        try {
          // Verificar se usuário já existe por username ou keycloak_id
          const existingRes = await query(
            'SELECT id, keycloak_id FROM credenciamento_admin_users WHERE username = $1 OR keycloak_id = $2 LIMIT 1',
            [token.email, token.sub]
          );
          const existingUser = existingRes.rows[0];

          if (!existingUser) {
            console.log('NextAuth: Registrando novo usuário do Keycloak:', token.email);
            // Inserir usuário e atribuir role manager em transação
            const created = await withTransaction(async (client) => {
              const insertRes = await client.query(
                `INSERT INTO credenciamento_admin_users (username, email, keycloak_id, created_at, updated_at) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
                [token.email, token.email, token.sub, new Date().toISOString(), new Date().toISOString()]
              );
              const newUser = insertRes.rows[0];

              // Encontrar role 'manager'
              const roleRes = await client.query(`SELECT id FROM credenciamento_admin_roles WHERE name = $1 LIMIT 1`, ['manager']);
              const managerRole = roleRes.rows[0];

              if (managerRole) {
                await client.query(
                  `INSERT INTO credenciamento_admin_user_roles (user_id, role_id, created_at) VALUES ($1,$2,$3)`,
                  [newUser.id, managerRole.id, new Date().toISOString()]
                );
                return { id: newUser.id, managerAssigned: true };
              }

              return { id: newUser.id, managerAssigned: false };
            });

            if (created && created.managerAssigned) {
              token.roles = ['manager'];
              console.log('NextAuth: Role manager atribuída ao novo usuário');
            }
          } else if (existingUser && !existingUser.keycloak_id) {
            // Atualizar usuário existente com keycloak_id
            await query(
              `UPDATE credenciamento_admin_users SET keycloak_id = $1, updated_at = $2 WHERE id = $3`,
              [token.sub, new Date().toISOString(), existingUser.id]
            );
              // TEMP LOG: updated existing user with keycloak_id
              console.log('NextAuth(TEMP): updated existing user', { id: existingUser.id, keycloak_id: token.sub });
          }
        } catch (error) {
          console.error('NextAuth: Erro no auto-registro do Keycloak:', error);
        }
      }

      // Buscar roles do banco de dados
      if (!token.roles || token.roles.length === 0) {
        try {
          let roles = [];

          // Usar transação para buscar roles
          await withTransaction(async (client) => {
            // Marcar conexão como autenticada para RLS
            await setSessionVariables(client, { 'myapp.user_role': 'authenticated' });

            // Tentar buscar por keycloak_id
            if (token.sub) {
              const r = await client.query(
                `SELECT rr.name FROM credenciamento_admin_user_roles ur 
                 JOIN credenciamento_admin_roles rr ON ur.role_id = rr.id 
                 WHERE ur.user_id = (SELECT id FROM credenciamento_admin_users WHERE keycloak_id = $1 LIMIT 1)`,
                [token.sub]
              );
              roles = (r.rows || []).map((row) => row.name);
            }

            // Se não encontrou por keycloak_id, tentar por username/email
            if ((!roles || roles.length === 0) && token.email) {
              const r2 = await client.query(
                `SELECT rr.name FROM credenciamento_admin_user_roles ur 
                 JOIN credenciamento_admin_roles rr ON ur.role_id = rr.id 
                 WHERE ur.user_id = (SELECT id FROM credenciamento_admin_users WHERE username = $1 LIMIT 1)`,
                [token.email]
              );
              roles = (r2.rows || []).map((row) => row.name);
            }
          });

          token.roles = roles || [];
        } catch (error) {
          console.error('NextAuth: Erro ao buscar roles do usuário:', error);
          token.roles = [];
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Apenas log em desenvolvimento e para novos logins
      if (process.env.NODE_ENV === 'development' && !session.logged) {
        const identSess = token.name || token.email || token.sub || '(sem identificador)';
        console.log('NextAuth: Sessão criada para', identSess);
        session.logged = true;
      }

      // TEMP LOG: print full session payload for debugging login flow
      try {
        console.log('NextAuth(TEMP): session payload', {
          userName: token.name || null,
          email: token.email || null,
          sub: token.sub || null,
          roles: token.roles || [],
          isLocalUser: !!token.isLocalUser,
          expires: session.expires,
        });
      } catch (e) {
        console.error('NextAuth(TEMP): failed to log session payload', e);
      }

      // Garantindo que todos os campos são serializáveis
      const finalName = token.name || token.email || token.sub || null;
      return {
        ...session,
        user: {
          name: finalName,
          email: token.email || null,
          roles: token.roles || [],
        },
        isLocalUser: !!token.isLocalUser,
        expires: session.expires,
      };
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: false, // Desabilitar logs de debug
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata);
    },
    warn(code) {
      // Suprimir warnings
    },
    debug(code, metadata) {
      // Suprimir debug logs
    },
  },
};

export default NextAuth(authOptions);
