// Next.js 16 renamed middleware.ts to proxy.ts. Bare clerkMiddleware() with
// no auth.protect() calls anywhere is deliberately public-by-default: every
// existing page stays exactly as accessible as it is today. Route protection
// is a later branch's job (Authorization), once an /admin area actually
// exists to protect.
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
