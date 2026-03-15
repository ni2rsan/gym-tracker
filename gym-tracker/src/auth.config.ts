import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-compatible auth config — NO Prisma, NO Node.js built-ins.
// Used by middleware (Edge Runtime). src/auth.ts extends this with the PrismaAdapter.
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const protectedRoutes = ["/workout", "/planner", "/reports", "/dashboard", "/logs", "/social", "/invite"];
      const isProtected = protectedRoutes.some((r) =>
        nextUrl.pathname.startsWith(r)
      );

      if (isProtected && !isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
        return Response.redirect(loginUrl);
      }

      if ((nextUrl.pathname === "/" || nextUrl.pathname === "/login") && isLoggedIn) {
        return Response.redirect(new URL("/planner", nextUrl.origin));
      }

      return true;
    },
  },
};
