// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Build target: standard Node.js server (for VPS / Docker / PM2 deployment).
// Disables the Cloudflare Workers plugin and tells TanStack Start (Nitro under
// the hood) to emit a Node server bundle at .output/server/index.mjs.
//
// Run in production with:   node .output/server/index.mjs
export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    target: "node-server",
  },
});
