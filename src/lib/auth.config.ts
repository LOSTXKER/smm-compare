import type { NextAuthConfig } from "next-auth";

const ADMIN_PATHS = [
  "/admin",
  "/api/users",
  "/api/providers",
  "/api/sync",
  "/api/match",
  "/api/renormalize",
];

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string | undefined;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/login";
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");

      if (isLoginPage || isApiAuth) return true;
      if (!isLoggedIn) return false;

      const role = (auth as { user?: { role?: string } })?.user?.role;
      const isAdminPath = ADMIN_PATHS.some((p) =>
        nextUrl.pathname.startsWith(p)
      );

      if (isAdminPath && role !== "admin") {
        return Response.redirect(new URL("/", nextUrl));
      }

      return true;
    },
  },
  providers: [],
};
