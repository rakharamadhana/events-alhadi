import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output bundles everything needed for cPanel/Passenger deployment.
  output: "standalone",

  // Exclude native modules from webpack bundling.
  serverExternalPackages: ["bcryptjs"],
};

export default nextConfig;
