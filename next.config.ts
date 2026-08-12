import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
