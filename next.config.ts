import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads the session, so Cache Components would add a Suspense
  // boundary to each one for no gain in a local app.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
