import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function normalizeBasePath(basePath: string | undefined) {
  if (!basePath) {
    return "/";
  }

  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

const githubPagesBase = process.env.GITHUB_PAGES === "true" ? "/roistat-dashboard-tg/" : "/";
const configuredBasePath = process.env.VITE_APP_BASE_PATH?.trim();
const appBase = normalizeBasePath(configuredBasePath ?? githubPagesBase);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: appBase,
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
