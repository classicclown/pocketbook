import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

function appsScriptProxy(scriptUrl) {
  return {
    name: "apps-script-proxy",
    configureServer(server) {
      if (!scriptUrl) {
        server.config.logger.warn(
          "[apps-script-proxy] VITE_SCRIPT_URL is not set — /google-script requests will fail. Add it to .env",
        );
      }
      server.middlewares.use("/google-script", async (req, res) => {
        try {
          if (!scriptUrl) throw new Error("VITE_SCRIPT_URL is not set");
          // Append only the query string. req.url here is like "/?sheet=foo";
          // concatenating its leading slash would hit ".../exec/?..." which the
          // Apps Script redirect bounces to a Google HTML page instead of JSON.
          const qIdx = (req.url || "").indexOf("?");
          const query = qIdx >= 0 ? req.url.slice(qIdx) : "";
          const response = await fetch(scriptUrl + query, { redirect: "follow" });
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

export default defineConfig(({ mode }) => {
  // Load .env so the proxy target is available in the Node config context —
  // Vite does not populate process.env from .env files automatically.
  const env = loadEnv(mode, process.cwd(), "");
  const SCRIPT_URL = env.VITE_SCRIPT_URL || "";

  return {
  base: "/pocketbook/",
  plugins: [
    appsScriptProxy(SCRIPT_URL),
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
  };
});
