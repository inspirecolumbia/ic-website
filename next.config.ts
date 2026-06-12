import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
