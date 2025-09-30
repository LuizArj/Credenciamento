import NextAuth from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authenticateLocalUser } from '../../../utils/user-management';

export const authOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER || `http://localhost:8080/realms/${process.env.KEYCLOAK_REALM}`,
      authorization: { params: { scope: 'openid email profile' } }
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
        // Usuário Keycloak
        token.accessToken = account.access_token;
        token.roles = profile?.roles || [];
        token.isLocalUser = false;
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

          const { data: userData, error } = await supabaseAdmin
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

          if (!error && userData) {
            const roles = userData.roles?.map(r => r.role.name) || [];
            console.log('Roles recuperadas do banco:', roles);
            token.roles = roles;
            token.isLocalUser = true;
          } else {
            console.error('Erro ao buscar roles do usuário:', error);
          }
        } catch (error) {
          console.error('Erro ao tentar recuperar roles:', error);
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