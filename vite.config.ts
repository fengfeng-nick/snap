import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // GitHub Pages 部署在 https://fengfeng-nick.github.io/snap/ 子路径下
  base: "/snap/",
  plugins: [react(), tailwindcss()],
});
