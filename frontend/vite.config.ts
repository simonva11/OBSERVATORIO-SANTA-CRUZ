import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const DIA = 24 * 60 * 60;

// base "./" permite abrir el build desde cualquier carpeta o subruta.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "prompt": la app avisa que hay versión nueva y la persona decide cuándo recargar.
      registerType: "prompt",
      includeAssets: ["icons/icon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        id: "./",
        name: "OTEA · Observatorio de Santa Cruz",
        short_name: "OTEA",
        description: "OTEA: el observatorio inmobiliario y territorial de Santa Cruz, Comuna 2 de Medellín.",
        lang: "es-CO",
        start_url: "./#/",
        scope: "./",
        display: "standalone",
        theme_color: "#3d2fa8",
        background_color: "#f1effa",
        categories: ["navigation", "utilities", "government"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Mapa territorial", url: "./#/mapa", icons: [{ src: "icons/icon-192.png", sizes: "192x192" }] },
          { name: "Mi barrio", url: "./#/barrios", icons: [{ src: "icons/icon-192.png", sizes: "192x192" }] },
        ],
      },
      workbox: {
        // Cascarón (código, estilos, fuentes, íconos) y los datos de hasta 1,2 MB (unos 5 MB en total): así la
        // primera visita ya deja todo listo para usar sin conexión. Lo más pesado se guarda al usarlo.
        globPatterns: ["**/*.{js,css,html,woff2,svg,png}", "data/**/*.{json,geojson}"],
        globIgnores: ["data/edificios.geojson", "data/red.json", "data/espacio_publico_ciudad.geojson", "data/equipamientos_ciudad.geojson", "**/inter-cyrillic*", "**/inter-greek*", "**/inter-vietnamese*"],
        maximumFileSizeToCacheInBytes: 1_200_000,
        // El service worker toma el control de la página en cuanto se activa (sin esperar a la siguiente visita).
        clientsClaim: true,
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // Datos pequeños de la comuna: salen al instante y se refrescan en segundo plano.
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes("/data/") && !/(edificios|red)\.(geo)?json$/.test(url.pathname),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "datos", expiration: { maxEntries: 120, maxAgeSeconds: 30 * DIA }, cacheableResponse: { statuses: [200] } },
          },
          // Red de caminos (rutas a pie) y edificios en 3D: pesan varios MB, se guardan la primera vez que se usan.
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/data\/(edificios|red)\.(geo)?json$/.test(url.pathname),
            handler: "CacheFirst",
            options: { cacheName: "datos-pesados", expiration: { maxEntries: 4, maxAgeSeconds: 30 * DIA }, cacheableResponse: { statuses: [200] } },
          },
          // Fotos del territorio: no van en la primera descarga; se guardan cuando se ven por primera vez.
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes("/fotos/") && url.pathname.endsWith(".webp"),
            handler: "CacheFirst",
            options: { cacheName: "fotos", expiration: { maxEntries: 60, maxAgeSeconds: 60 * DIA }, cacheableResponse: { statuses: [200] } },
          },
          // Estilo del mapa de fondo
          {
            urlPattern: ({ url }) => url.origin === "https://tiles.openfreemap.org" && url.pathname.startsWith("/styles/"),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "mapa-estilo", expiration: { maxEntries: 4, maxAgeSeconds: 7 * DIA }, cacheableResponse: { statuses: [0, 200] } },
          },
          // Mosaicos, tipos de letra y definiciones del mapa de fondo
          {
            urlPattern: ({ url }) => url.origin === "https://tiles.openfreemap.org" && !url.pathname.startsWith("/styles/"),
            handler: "CacheFirst",
            options: { cacheName: "mapa-mosaicos", expiration: { maxEntries: 600, maxAgeSeconds: 14 * DIA }, cacheableResponse: { statuses: [0, 200] } },
          },
          // Relieve (AWS Terrain Tiles)
          {
            urlPattern: ({ url }) => url.hostname.endsWith("amazonaws.com") && url.pathname.includes("elevation-tiles-prod"),
            handler: "CacheFirst",
            options: { cacheName: "mapa-relieve", expiration: { maxEntries: 200, maxAgeSeconds: 30 * DIA }, cacheableResponse: { statuses: [0, 200] } },
          },
          // API opcional: red primero, con respaldo guardado si no hay conexión
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: { cacheName: "api", networkTimeoutSeconds: 3, expiration: { maxEntries: 30, maxAgeSeconds: 2 * DIA }, cacheableResponse: { statuses: [200] } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  base: "./",
  server: { port: 5173, open: false },
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          mapa: ["leaflet", "react-leaflet"],
          maplibre: ["maplibre-gl"],
          graficas: ["recharts"],
        },
      },
    },
  },
});
