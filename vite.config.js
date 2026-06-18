import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const SCRIPT_URL = process.env.VITE_SCRIPT_URL || "";

function appsScriptProxy() {
  return {
    name: "apps-script-proxy",
    configureServer(server) {
      server.middlewares.use("/google-script", async (req, res) => {
        try {
          const response = await fetch(SCRIPT_URL + (req.url || ""), { redirect: "follow" });
          const data = await response.text();
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(data);
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}

export default defineConfig({
  base: "/pocketbook/",
  plugins: [
    appsScriptProxy(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Pocketbook",
        short_name: "Pocketbook",
        description: "Personal finance dashboard",
        theme_color: "#FAF9F7",
        background_color: "#FAF9F7",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "/pocketbook/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pocketbook/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
});
