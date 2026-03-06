var _a, _b;
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
var isGitHubActions = process.env.GITHUB_ACTIONS === "true";
var repoName = (_b = (_a = process.env.GITHUB_REPOSITORY) === null || _a === void 0 ? void 0 : _a.split("/")[1]) !== null && _b !== void 0 ? _b : "";
export default defineConfig({
    base: isGitHubActions && repoName ? "/".concat(repoName, "/") : "/",
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
