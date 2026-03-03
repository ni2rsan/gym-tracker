import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Edge-compatible proxy — uses authConfig (no Prisma, no Node.js built-ins).
// Route protection logic lives in authConfig.callbacks.authorized.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
