import type { NextConfig } from "next";
import { DEFAULT_COURSE_SLUG } from "./src/lib/course-config";

// Optimise images from this project's public Supabase Storage buckets only.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl}/storage/v1/object/public/**`)]
      : [],
  },
  // /course goes straight to the default course (no page to render).
  redirects() {
    return [
      {
        source: "/course",
        destination: `/course/${DEFAULT_COURSE_SLUG}`,
        permanent: false,
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
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
