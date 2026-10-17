// Grabador de shorts de OTEA: graba la página real (no simula nada) con el screencast de Chrome a 1080x1920,
// le pone toques visibles, subtítulos y tarjetas de entrada y cierre, y arma un MP4 H.264 a 30 fps.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const BASE = process.env.OTEA_URL || "http://127.0.0.1:4173/";
const SALIDA = path.join(path.dirname(fileURLToPath(import.meta.url)), "salida");
fs.mkdirSync(SALIDA, { recursive: true });

const CSS = `
  html, body, main, * { scrollbar-width: none !important; }
  *::-webkit-scrollbar { display: none !important; }
  #v-capa { position: fixed; inset: 0; z-index: 99999; pointer-events: none; font-family: 'DM Sans', system-ui, sans-serif; }
  #v-sub { position: absolute; left: 16px; right: 16px; bottom: 74px; display: flex; justify-content: center; opacity: 0; transform: translateY(10px); transition: opacity 260ms ease, transform 260ms ease; }
  #v-sub.v-on { opacity: 1; transform: none; }
  #v-sub div { max-width: 330px; text-align: center; background: rgba(10,14,30,0.86); color: #fff; border-radius: 16px; padding: 10px 14px 11px; box-shadow: 0 10px 30px -10px rgba(0,0,0,.5); }
  #v-sub b { display: block; font-family: 'Bricolage Grotesque', 'DM Sans', sans-serif; font-weight: 800; font-size: 21px; line-height: 1.12; letter-spacing: -0.01em; }
  #v-sub span { display: block; margin-top: 4px; font-size: 13px; line-height: 1.3; color: rgba(255,255,255,0.82); }
  #v-sub mark { background: #ffb703; color: #0d1730; padding: 0 4px; border-radius: 4px; }
  #v-chip { position: absolute; top: 62px; right: 10px; opacity: 0; transition: opacity 300ms ease; background: rgba(10,14,30,0.82); color: #fff; font-size: 10.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; border-radius: 999px; padding: 5px 9px; display: flex; align-items: center; gap: 6px; }
  #v-chip.v-on { opacity: 1; }
  #v-chip i { width: 7px; height: 7px; border-radius: 99px; background: #4ade80; box-shadow: 0 0 0 3px rgba(74,222,128,.25); }
  #v-chip.v-pronto i { background: #ffb703; box-shadow: 0 0 0 3px rgba(255,183,3,.25); }
  .v-toque { position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 999px; background: rgba(255,255,255,0.55); border: 2px solid rgba(255,255,255,0.95); box-shadow: 0 4px 18px rgba(0,0,0,.35); animation: v-toque 650ms ease-out forwards; }
  @keyframes v-toque { 0% { transform: scale(.4); opacity: 0; } 25% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.7); opacity: 0; } }
  .v-dedo { position: absolute; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 999px; background: rgba(255,255,255,0.75); border: 2px solid #fff; box-shadow: 0 4px 16px rgba(0,0,0,.35); transition: left 520ms cubic-bezier(.4,.1,.2,1), top 520ms cubic-bezier(.4,.1,.2,1), opacity 250ms ease; }
  #v-tarjeta { position: absolute; inset: 0; opacity: 0; transition: opacity 380ms ease; background: #0d1730; overflow: hidden; }
  #v-tarjeta.v-on { opacity: 1; }
  #v-tarjeta img.v-fondo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: scale(1.08); animation: v-ken 6s ease-out forwards; }
  @keyframes v-ken { to { transform: scale(1.0); } }
  #v-tarjeta .v-velo { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(8,12,26,.94) 0%, rgba(8,12,26,.55) 55%, rgba(8,12,26,.25) 100%); }
  #v-tarjeta .v-cuerpo { position: absolute; left: 26px; right: 26px; bottom: 120px; color: #fff; }
  #v-tarjeta .v-ojo { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.8); }
  #v-tarjeta h1 { margin-top: 10px; font-family: 'Bricolage Grotesque', 'DM Sans', sans-serif; font-weight: 800; font-size: 40px; line-height: .98; letter-spacing: -0.035em; }
  #v-tarjeta h1 em { font-style: normal; color: #ffb703; }
  #v-tarjeta p { margin-top: 12px; font-size: 16px; line-height: 1.4; color: rgba(255,255,255,.88); }
  #v-tarjeta .v-palabra { display: inline-block; opacity: 0; transform: translateY(14px); animation: v-pal 420ms cubic-bezier(.2,.7,.2,1) forwards; }
  @keyframes v-pal { to { opacity: 1; transform: none; } }
  #v-tarjeta .v-marca { position: absolute; top: 28px; left: 26px; display: flex; align-items: center; gap: 9px; color: #fff; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; letter-spacing: .05em; font-size: 18px; }
  #v-tarjeta .v-marca svg { width: 30px; height: 30px; }
  #v-tarjeta .v-cred { position: absolute; right: 12px; bottom: 12px; font-size: 9px; color: rgba(255,255,255,.6); }
  #v-tarjeta .v-cta { display: inline-block; margin-top: 18px; background: #fff; color: #0d1730; font-weight: 800; border-radius: 999px; padding: 11px 18px; font-size: 15px; }
  #v-tarjeta .v-lista { margin-top: 14px; display: grid; gap: 7px; }
  #v-tarjeta .v-lista div { display: flex; gap: 9px; align-items: center; font-size: 14.5px; font-weight: 600; opacity: 0; transform: translateX(-10px); animation: v-pal 420ms ease forwards; }
  #v-tarjeta .v-lista i { width: 8px; height: 8px; border-radius: 99px; background: #4ade80; flex: none; }
  #v-imagen { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(8,12,26,.88); opacity: 0; transition: opacity 300ms ease; }
  #v-imagen.v-on { opacity: 1; }
  #v-imagen img { width: 82%; border-radius: 14px; box-shadow: 0 30px 60px -20px rgba(0,0,0,.7); transform: scale(.92) rotate(-2deg); transition: transform 600ms cubic-bezier(.2,.8,.2,1); }
  #v-imagen.v-on img { transform: scale(1) rotate(0); }
  #v-imagen p { position: absolute; top: 90px; left: 0; right: 0; text-align: center; color: #fff; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 22px; }
`;

const LOGO = `<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#1f40cc"/><path d="M3 33c9-1 14-8 21-10s10-6 13-11" stroke="#fff" stroke-opacity=".45" stroke-width="1.6" fill="none"/><path d="M3 27c8-1 12-7 18-9s9-7 11-13" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" fill="none"/><path d="M5 30 35 10" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="20" r="3.2" fill="#fff"/></svg>`;

function instalarCapa() {
  // Se ejecuta en la página: capa de producción que sobrevive a la navegación dentro de la app (HashRouter).
  const poner = () => {
    if (document.getElementById("v-capa")) return;
    const st = document.createElement("style"); st.id = "v-estilo"; st.textContent = window.__vCSS; document.head.appendChild(st);
    const c = document.createElement("div"); c.id = "v-capa";
    c.innerHTML = `<div id="v-chip"><i></i><span></span></div><div id="v-sub"><div><b></b><span></span></div></div><div id="v-tarjeta"></div><div id="v-imagen"><p></p><img alt=""/></div>`;
    document.body.appendChild(c);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", poner); else poner();
}

export async function grabar(nombre, escenario, { ancho = 360, alto = 640, escala = 3, inicio = null, calentar = [] } = {}) {
  const navegador = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--force-color-profile=srgb", "--font-render-hinting=none"],
  });
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: escala, serviceWorkers: "block", locale: "es-CO", hasTouch: false, acceptDownloads: true });
  await ctx.addInitScript(({ css }) => {
    window.__vCSS = css;
    try {
      localStorage.setItem("observatorio-santa-cruz:tema", "dia");
      localStorage.setItem("observatorio-santa-cruz:ayuda-mapa-vista", "1");
      localStorage.setItem("observatorio-santa-cruz:panel-temas-abierto", "1");
    } catch {}
  }, { css: CSS });
  const p = await ctx.newPage();
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));

  const cdp = await ctx.newCDPSession(p);
  const cuadros = [];
  cdp.on("Page.screencastFrame", async (f) => {
    cuadros.push({ t: f.metadata.timestamp, data: f.data });
    try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch {}
  });

  // ---------------------------------------------------------------- ayudantes del guion
  const capa = async () => { await p.evaluate(instalarCapa); };
  const h = {
    p,
    esperar: (ms) => p.waitForTimeout(ms),
    async ir(ruta, espera = 900) {
      if (p.url().startsWith(BASE)) await p.evaluate((r) => { window.location.hash = r; }, ruta);
      else { await p.goto(BASE + "#" + ruta, { waitUntil: "networkidle" }); }
      await p.waitForTimeout(espera); await capa();
    },
    async sub(titulo, texto = "", ms = 0) {
      await capa();
      await p.evaluate(([t, x]) => {
        const s = document.getElementById("v-sub");
        s.classList.remove("v-on");
        setTimeout(() => { s.querySelector("b").innerHTML = t; s.querySelector("span").innerHTML = x; s.querySelector("span").style.display = x ? "block" : "none"; s.classList.add("v-on"); }, 120);
      }, [titulo, texto]);
      if (ms) await p.waitForTimeout(ms);
    },
    async sinSub() { await p.evaluate(() => document.getElementById("v-sub")?.classList.remove("v-on")); },
    async chip(texto, pronto = false) {
      await capa();
      await p.evaluate(([t, pr]) => { const c = document.getElementById("v-chip"); c.querySelector("span").textContent = t; c.classList.toggle("v-pronto", pr); c.classList.toggle("v-on", !!t); }, [texto, pronto]);
    },
    /** Toque visible sobre un elemento (o un punto) y, si se pide, el clic real. */
    async tocar(objetivo, { clic = true, ms = 450 } = {}) {
      await capa();
      let x, y;
      if (Array.isArray(objetivo)) [x, y] = objetivo;
      else {
        const loc = typeof objetivo === "string" ? p.locator(objetivo).first() : objetivo;
        await loc.scrollIntoViewIfNeeded();
        await p.waitForTimeout(150);
        const b = await loc.boundingBox();
        x = b.x + b.width / 2; y = b.y + b.height / 2;
      }
      await p.evaluate(([x, y]) => {
        const c = document.getElementById("v-capa");
        let d = document.querySelector(".v-dedo");
        if (!d) { d = document.createElement("div"); d.className = "v-dedo"; d.style.left = x + 40 + "px"; d.style.top = y + 80 + "px"; c.appendChild(d); }
        requestAnimationFrame(() => { d.style.opacity = "1"; d.style.left = x + "px"; d.style.top = y + "px"; });
      }, [x, y]);
      await p.waitForTimeout(560);
      await p.evaluate(([x, y]) => {
        const r = document.createElement("div"); r.className = "v-toque"; r.style.left = x + "px"; r.style.top = y + "px";
        document.getElementById("v-capa").appendChild(r); setTimeout(() => r.remove(), 700);
        const d = document.querySelector(".v-dedo"); if (d) setTimeout(() => { d.style.opacity = "0"; }, 380);
      }, [x, y]);
      if (clic) await p.mouse.click(x, y);
      await p.waitForTimeout(ms);
    },
    /** Desplazamiento suave del contenido (main) hasta un elemento o una posición. */
    async bajar(objetivo, { ms = 1100, margen = 70 } = {}) {
      await p.evaluate(async ([obj, ms, margen]) => {
        const m = document.getElementById("contenido");
        let destino;
        if (typeof obj === "number") destino = m.scrollTop + obj;
        else { const el = document.querySelector(obj); if (!el) return; destino = m.scrollTop + el.getBoundingClientRect().top - m.getBoundingClientRect().top - margen; }
        const ini = m.scrollTop, t0 = performance.now();
        const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        await new Promise((ok) => { const paso = (t) => { const k = Math.min(1, (t - t0) / ms); m.scrollTop = ini + (destino - ini) * ease(k); if (k < 1) requestAnimationFrame(paso); else ok(); }; requestAnimationFrame(paso); });
      }, [objetivo, ms, margen]);
      await p.waitForTimeout(200);
    },
    /** Tarjeta de pantalla completa (entrada, transición o cierre). */
    async tarjeta({ foto, ojo = "", titulo, texto = "", cta = "", lista = [], credito = "", ms = 2600 }) {
      await capa();
      await p.evaluate(([foto, ojo, titulo, texto, cta, lista, credito, logo, base]) => {
        const t = document.getElementById("v-tarjeta");
        const palabras = (s, d0) => s.split(/(\s+)/).map((w, i) => (/^\s+$/.test(w) ? w : `<span class="v-palabra" style="animation-delay:${d0 + i * 45}ms">${w}</span>`)).join("");
        t.innerHTML = `${foto ? `<img class="v-fondo" src="${base}fotos/${foto}-960.webp" alt="">` : ""}<div class="v-velo"></div>
          <div class="v-marca">${logo}<span>OTEA</span></div>
          <div class="v-cuerpo">${ojo ? `<div class="v-ojo">${ojo}</div>` : ""}<h1>${palabras(titulo, 150)}</h1>${texto ? `<p class="v-palabra" style="animation-delay:${300 + titulo.split(" ").length * 90}ms">${texto}</p>` : ""}
          ${lista.length ? `<div class="v-lista">${lista.map((x, i) => `<div style="animation-delay:${500 + i * 220}ms"><i></i>${x}</div>`).join("")}</div>` : ""}
          ${cta ? `<span class="v-cta v-palabra" style="animation-delay:${700 + lista.length * 220}ms">${cta}</span>` : ""}</div>
          ${credito ? `<div class="v-cred">${credito}</div>` : ""}`;
        t.classList.add("v-on");
      }, [foto, ojo, titulo, texto, cta, lista, credito, LOGO, BASE]);
      await p.waitForTimeout(ms);
    },
    async quitarTarjeta() { await p.evaluate(() => document.getElementById("v-tarjeta").classList.remove("v-on")); await p.waitForTimeout(420); },
    async mostrarImagen(rutaArchivo, titulo, ms = 2600) {
      const b64 = fs.readFileSync(rutaArchivo).toString("base64");
      await p.evaluate(([src, t]) => { const v = document.getElementById("v-imagen"); v.querySelector("img").src = src; v.querySelector("p").textContent = t; v.classList.add("v-on"); }, [`data:image/png;base64,${b64}`, titulo]);
      await p.waitForTimeout(ms);
      await p.evaluate(() => document.getElementById("v-imagen").classList.remove("v-on"));
      await p.waitForTimeout(400);
    },
  };

  // Rutas pesadas (el mapa) se abren una vez antes de grabar para que queden en caché y no salga la pantalla de carga larga.
  for (const r of calentar) {
    await p.goto(BASE + "#" + r, { waitUntil: "networkidle" });
    await p.waitForFunction(() => !document.body.innerText.includes("Preparando el mapa"), null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1500);
  }
  // Antes de grabar: abrir la primera página y dejar la capa lista (lo que pasa antes no sale en el video).
  await p.goto(inicio ?? BASE + "#/", { waitUntil: "networkidle" });
  await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((ok) => { i.onload = i.onerror = ok; })))); });
  await p.waitForTimeout(800);
  await capa();
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: ancho * escala, maxHeight: alto * escala, everyNthFrame: 1 });
  const t0 = Date.now();
  await escenario(h);
  await p.waitForTimeout(400);
  await cdp.send("Page.stopScreencast");
  const duracion = (Date.now() - t0) / 1000;
  await navegador.close();

  // ---------------------------------------------------------------- armar el MP4
  const dir = path.join(SALIDA, `_${nombre}`);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const lineas = [];
  cuadros.forEach((c, i) => {
    const f = path.join(dir, `${String(i).padStart(5, "0")}.jpg`);
    fs.writeFileSync(f, Buffer.from(c.data, "base64"));
    const sig = cuadros[i + 1]?.t ?? c.t + 1.2;
    lineas.push(`file '${f.replace(/\\/g, "/")}'`, `duration ${Math.max(0.01, sig - c.t).toFixed(4)}`);
  });
  lineas.push(`file '${path.join(dir, `${String(cuadros.length - 1).padStart(5, "0")}.jpg`).replace(/\\/g, "/")}'`);
  fs.writeFileSync(path.join(dir, "lista.txt"), lineas.join("\n"));
  const mp4 = path.join(SALIDA, `${nombre}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(dir, "lista.txt"),
    "-vf", `fps=30,scale=${ancho * escala}:${alto * escala}:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-movflags", "+faststart", mp4]);
  console.log(`${nombre}: ${cuadros.length} cuadros, ${duracion.toFixed(1)} s → ${mp4}${errores.length ? `\n  errores: ${errores.join(" | ")}` : ""}`);
  return { mp4, dir };
}
