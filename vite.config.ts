import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

declare const process: {
  env: Record<string, string | undefined>;
};

const isGitHubActions = process.env.GITHUB_ACTIONS === "true";
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";

export default defineConfig({
  base: isGitHubActions && repoName ? `/${repoName}/` : "/",
  plugins: [react()],
  server: {
    host: 'https://walletmanagement.onrender.com',
    proxy: {
      "/api": {
        target: "https://walletmanagement.onrender.com",
        changeOrigin: true
      }
    }
  }
});
