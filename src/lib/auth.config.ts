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
