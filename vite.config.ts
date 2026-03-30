import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const githubPagesBase = process.env.GITHUB_PAGES === "true" ? "/roistat-dashboard-tg/" : "/";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: githubPagesBase,
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
