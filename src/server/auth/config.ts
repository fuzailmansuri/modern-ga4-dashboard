/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { env } from "~/env.js";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      accessToken?: string;
      refreshToken?: string;
    } & DefaultSession["user"];
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }

  interface User {
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
  }
}

/**
 * Refresh an access token using the refresh token
 */
async function refreshAccessToken(token: any): Promise<any> {
  try {
    if (!token.refreshToken) {
      throw new Error("No refresh token available");
    }

    const url = "https://oauth2.googleapis.com/token";

    const params = new URLSearchParams();
    params.append("client_id", env.AUTH_GOOGLE_ID);
    params.append("client_secret", env.AUTH_GOOGLE_SECRET);
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", token.refreshToken);

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body: params,
    });

    const refreshedTokens: any = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/analytics.readonly",
            "https://www.googleapis.com/auth/analytics.manage.users.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token, // Add this to preserve existing token properties
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : 0,
          refreshToken: account.refresh_token,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      }

      // Return previous token if the access token has not expired yet
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Access token has expired, try to update it
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub!,
          name: token.name,
          email: token.email,
          image: token.image as string | null | undefined,
        },
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        error: token.error,
      };
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;
