import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  // Hospedagem é Vercel, que serve o build a partir da raiz do domínio — ao
  // contrário do GitHub Pages de teste (silva5875.github.io/TRIPSMART/), que
  // exigia um base path com o nome do repositório.
  base: "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
