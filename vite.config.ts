import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // Só no build de produção: GitHub Pages de teste serve em
  // silva5875.github.io/TRIPSMART/, não na raiz — sem isso os assets (JS/CSS)
  // seriam pedidos a partir de "/" e dariam 404. `npm run dev` continua em
  // "/" para não mudar o fluxo local. Trocar para "/" (e pathSegmentsToKeep
  // para 0 em public/404.html) quando o domínio próprio (www.tripsmart.com)
  // entrar.
  base: command === "build" ? "/TRIPSMART/" : "/",
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
