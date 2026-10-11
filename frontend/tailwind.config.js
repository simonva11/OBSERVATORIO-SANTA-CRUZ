/** Paleta "ladera": tomada del paisaje de la comuna (montaña, cable, ladrillo, curvas de nivel). */
/** @type {import('tailwindcss').Config} */
export default {
  future: { hoverOnlyWhenSupported: true },
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Todos los colores leen variables de index.css: así el modo noche cambia en todo el sitio.
        tinta: { DEFAULT: "rgb(var(--tinta) / <alpha-value>)", suave: "rgb(var(--tinta-suave) / <alpha-value>)", tenue: "rgb(var(--tinta-tenue) / <alpha-value>)" },
        papel: { DEFAULT: "rgb(var(--papel) / <alpha-value>)", hondo: "rgb(var(--papel-hondo) / <alpha-value>)" },
        superficie: "rgb(var(--superficie) / <alpha-value>)",
        nivel: "rgb(var(--nivel) / <alpha-value>)",
        marca: "rgb(var(--marca) / <alpha-value>)",
        acento: { DEFAULT: "rgb(var(--acento) / <alpha-value>)", hondo: "rgb(var(--acento-hondo) / <alpha-value>)" },
        menta: { DEFAULT: "rgb(var(--menta) / <alpha-value>)", 2: "rgb(var(--menta-2) / <alpha-value>)" },
        aviso: { fondo: "rgb(var(--aviso-fondo) / <alpha-value>)", borde: "rgb(var(--aviso-borde) / <alpha-value>)" },
        peligro: "rgb(var(--peligro) / <alpha-value>)",
        ladera: { DEFAULT: "rgb(var(--ladera) / <alpha-value>)", claro: "rgb(var(--ladera-claro) / <alpha-value>)", hondo: "rgb(var(--ladera-hondo) / <alpha-value>)" },
        cable: { DEFAULT: "rgb(var(--cable) / <alpha-value>)", claro: "rgb(var(--cable-claro) / <alpha-value>)" },
        ladrillo: { DEFAULT: "rgb(var(--ladrillo) / <alpha-value>)", claro: "rgb(var(--ladrillo-claro) / <alpha-value>)" },
        ambar: { DEFAULT: "rgb(var(--ambar) / <alpha-value>)", claro: "rgb(var(--ambar-claro) / <alpha-value>)", texto: "rgb(var(--ambar-texto) / <alpha-value>)" },
      },
      fontFamily: {
        sans: ['"Inter Variable"', '"Inter"', "system-ui", "sans-serif"],
      },
      fontSize: {
        // escala modular 1.25 (tercera mayor) desde 16 px
        xs: ["0.8rem", { lineHeight: "1.3rem" }],
        sm: ["0.875rem", { lineHeight: "1.4rem" }],
        base: ["1rem", { lineHeight: "1.6rem" }],
        lg: ["1.25rem", { lineHeight: "2rem" }],
        xl: ["1.35rem", { lineHeight: "1.9rem" }],
        "2xl": ["1.6rem", { lineHeight: "2.1rem" }],
        "3xl": ["2rem", { lineHeight: "2.4rem" }],
        "4xl": ["2.5rem", { lineHeight: "2.8rem" }],
      },
    },
  },
  plugins: [],
};
