import NextAuth from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authenticateLocalUser } from '../../../utils/user-management';
import https from 'https';

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
          response_type: 'code'
        } 
      },
      token: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
      userinfo: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/userinfo`,
      jwks_endpoint: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username,
          email: profile.email,
          roles: profile.roles || profile.groups || []
        }
      },
      httpOptions: {
        timeout: 10000,
        agent: new https.Agent({
          rejectUnauthorized: false
        })
      }
    }),
    CredentialsProvider({
      name: 'Credenciais Locais',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.error('Credenciais faltando');
          throw new Error('Usuário e senha são obrigatórios');
        }

        const result = await authenticateLocalUser(credentials.username, credentials.password);
        
        if (result.error) {
          console.error('Erro na autenticação:', result.error);
          throw new Error(result.error.message || 'Erro na autenticação');
        }

        if (!result.data || !result.data.user) {
          console.error('Dados do usuário não encontrados');
          throw new Error('Usuário não encontrado');
        }

        const { user } = result.data;
        console.log('Dados do usuário recebidos no authorize:', user);
        
        // Garantindo que todos os campos são strings ou booleanos
        const authUser = {
          id: String(user.id),
          name: String(user.name),
          email: String(user.email),
          roles: user.roles || [],
          isLocalUser: true
        };
        console.log('Objeto de autenticação construído:', authUser);
        return authUser;
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, user }) {
      console.log('JWT Callback - Entrada:', { token, account, profile, user });
      
      if (account) {
        // Usuário Keycloak - verificar se precisa registrar
        token.accessToken = account.access_token;
        token.roles = profile?.roles || [];
        token.isLocalUser = false;
        
        // Auto-registro do usuário do Keycloak no sistema de permissões
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
          );

          // Verificar se usuário já existe
          const { data: existingUser, error: checkError } = await supabaseAdmin
            .from('credenciamento_admin_users')
            .select('id, keycloak_id')
            .or(`username.eq.${token.email},keycloak_id.eq.${token.sub}`)
            .single();

          if (!existingUser) {
            // Registrar novo usuário do Keycloak
            console.log('Registrando novo usuário do Keycloak:', token.email);
            const { data: newUser, error: insertError } = await supabaseAdmin
              .from('credenciamento_admin_users')
              .insert({
                username: token.email,
                email: token.email,
                keycloak_id: token.sub,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select('id')
              .single();

            if (!insertError && newUser) {
              console.log('Usuário Keycloak registrado com sucesso:', newUser.id);
              
              // Atribuir role 'operator' por padrão para novos usuários
              const { data: operatorRole } = await supabaseAdmin
                .from('credenciamento_admin_roles')
                .select('id')
                .eq('name', 'operator')
                .single();

              if (operatorRole) {
                await supabaseAdmin
                  .from('credenciamento_admin_user_roles')
                  .insert({
                    user_id: newUser.id,
                    role_id: operatorRole.id,
                    created_at: new Date().toISOString()
                  });
                
                token.roles = ['operator'];
                console.log('Role operator atribuída ao novo usuário');
              }
            }
          } else if (existingUser && !existingUser.keycloak_id) {
            // Atualizar usuário existente com keycloak_id
            await supabaseAdmin
              .from('credenciamento_admin_users')
              .update({ 
                keycloak_id: token.sub,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingUser.id);
            
            console.log('Keycloak ID vinculado ao usuário existente');
          }
        } catch (error) {
          console.error('Erro no auto-registro do Keycloak:', error);
        }
        
        console.log('JWT Callback - Usuário Keycloak:', token);
      } else if (user?.isLocalUser) {
        // Usuário Local
        token.isLocalUser = true;
        token.name = user.name;
        token.email = user.email;
        token.roles = user.roles || [];
        console.log('JWT Callback - Usuário Local:', token);
      } else if (!token.roles || token.roles.length === 0) {
        // Se não temos roles, vamos buscar do banco
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
          );

          let userData = null;
          
          // Buscar por keycloak_id primeiro, depois por username/email
          if (token.sub) {
            const { data: kcUser } = await supabaseAdmin
              .from('credenciamento_admin_users')
              .select(`
                *,
                roles:credenciamento_admin_user_roles(
                  role:credenciamento_admin_roles(
                    name
                  )
                )
              `)
              .eq('keycloak_id', token.sub)
              .single();
            
            userData = kcUser;
          }
          
          // Se não encontrou por keycloak_id, buscar por email/username
          if (!userData && token.email) {
            const { data: emailUser } = await supabaseAdmin
              .from('credenciamento_admin_users')
              .select(`
                *,
                roles:credenciamento_admin_user_roles(
                  role:credenciamento_admin_roles(
                    name
                  )
                )
              `)
              .eq('username', token.email)
              .single();
            
            userData = emailUser;
          }

          if (userData) {
            const roles = userData.roles?.map(r => r.role.name) || [];
            console.log('Roles recuperadas do banco:', roles);
            token.roles = roles;
          } else {
            console.log('Usuário não encontrado no sistema de permissões');
            token.roles = [];
          }
        } catch (error) {
          console.error('Erro ao buscar roles do usuário:', error);
          token.roles = [];
        }
      }
      
      console.log('JWT Callback - Token Final:', token);
      return token;
    },
    async session({ session, token }) {
      console.log('Session Callback - Entrada:', { session, token });
      
      // Garantindo que todos os campos são serializáveis
      const updatedSession = {
        ...session,
        user: {
          name: token.name || null,
          email: token.email || null,
          roles: token.roles || []
        },
        isLocalUser: !!token.isLocalUser,
        expires: session.expires
      };
      
      console.log('Session Callback - Sessão Final:', updatedSession);
      return updatedSession;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};

export default NextAuth(authOptions);