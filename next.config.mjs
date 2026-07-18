import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allows CI/local verification to build into an isolated directory so a
  // running dev server can't clobber the production output. Defaults to
  // the standard .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // recharts is a large barrel package; without this every chart page pulls
    // in the whole library (hundreds of modules), which slows the dev
    // on-demand compile and bloats the bundle. This rewrites the imports to
    // load only the pieces actually used.
    optimizePackageImports: ["recharts"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Microphone is allowed for our own origin (+ the ElevenLabs voice
          // agent) so the ConvAI audio-chat widget can listen; camera and
          // geolocation stay disabled.
          {
            key: "Permissions-Policy",
            value: 'camera=(), microphone=(self "https://elevenlabs.io"), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
