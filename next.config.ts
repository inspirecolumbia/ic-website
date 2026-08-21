import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16.3 started auto-generating AGENTS.md/CLAUDE.md at the repo root
  // on every `next dev` (framework advisory boilerplate, not this repo's
  // own conventions -- CLAUDE.md here is the user's personal global config,
  // not project-specific). Opted out rather than having a dev server
  // silently create/modify root-level files the team never asked for.
  agentRules: false,
  // Lets the e2e dev server (tests/e2e, run via playwright.config.ts) use a
  // separate build cache from a developer's own `npm run dev`, since Next's
  // dev lock is scoped to distDir, not to the port -- two `next dev`
  // instances against the default `.next` would otherwise refuse to start
  // side by side even on different ports. Unset for every normal run.
  distDir: process.env.PLAYWRIGHT_DIST_DIR || ".next",
  // Default is 1MB. The application form can submit a resume + transcript
  // together (5MB each, see lib/storage.ts), and the admin job form submits
  // a raw source photo up to 10MB (lib/jobPhoto.ts) before it's cropped down
  // client-side -- both routinely exceed the default well before hitting
  // either feature's own real limit.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // Covers both the dev and prod Supabase projects without hardcoding
        // either project ref -- scoped to the one bucket job photos live in.
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/job-photos/**",
      },
      {
        protocol: "http",
        // The local Docker Supabase stack (`supabase start`) serves Storage
        // over plain HTTP on this fixed port -- never matches a real
        // deployment, so this is inert in prod, just lets a job photo
        // uploaded while developing against the local stack actually render.
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/job-photos/**",
      },
    ],
    // Next 16's SSRF guard blocks optimizing any URL that resolves to a
    // private/loopback IP even if remotePatterns matches it -- needed only
    // for the 127.0.0.1 pattern above (local dev), which is already scoped
    // to a single fixed port and path. No real deployment's Supabase host
    // is ever a local IP, so this has no effect outside a developer's own
    // machine.
    dangerouslyAllowLocalIP: true,
  },
  async redirects() {
    return [
      {
        source: "/recruitment",
        destination: "https://forms.gle/4CvfsfUF9dotR7xv5",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
