import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
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
