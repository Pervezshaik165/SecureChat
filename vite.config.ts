import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from 'url';
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

export default defineConfig(async () => {
  const isFast = Boolean(process.env.DEV_FAST);

  const basePlugins = [react(), tailwindcss()];

  let plugins = basePlugins;

  if (!isFast) {
    const extras = [runtimeErrorOverlay(), metaImagesPlugin()];

    let replitPlugins: any[] = [];
    if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
      try {
        const carto = await import("@replit/vite-plugin-cartographer");
        const devBanner = await import("@replit/vite-plugin-dev-banner");
        replitPlugins = [carto.cartographer(), devBanner.devBanner()];
      } catch (e) {
        // If optional replit plugins fail to load locally, continue without them
        // (they are only helpful in the Replit environment)
        // eslint-disable-next-line no-console
        console.warn("Replit dev plugins not loaded:", e instanceof Error ? e.message : e);
      }
    }

    plugins = [...basePlugins, ...extras, ...replitPlugins];
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    css: {
      postcss: {
        plugins: [],
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    optimizeDeps: {
      // Limit pre-bundling to the essential runtime libs to speed cold starts
      include: [
        "react",
        "react-dom",
        "socket.io-client",
        "wouter",
        "@tanstack/react-query",
      ],
    },
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: true,
      watch: {
        // ignore heavy folders to reduce filesystem scanning overhead
        ignored: ["**/node_modules/**", "**/dist/**", "**/attached_assets/**"],
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      hmr: { overlay: false },
    },
  };
});
