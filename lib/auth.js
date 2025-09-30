import { getSession } from 'next-auth/react';

export const keycloakConfig = {
  clientId: process.env.KEYCLOAK_CLIENT_ID,
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
  issuer: process.env.KEYCLOAK_ISSUER,
  realm: process.env.KEYCLOAK_REALM,
};

export const getToken = async () => {
  const session = await getSession();
  return session?.accessToken;
};

export const getUserInfo = async () => {
  const session = await getSession();
  if (!session) return null;

  return {
    name: session.user.name,
    email: session.user.email,
    roles: session.user.roles || []
  };
};

export const isAdmin = async () => {
  const session = await getSession();
  return session?.user?.roles?.includes('admin') || false;
};