import { useState, type ReactNode } from "react";
import { Logo } from "../components/Layout";
import IconoNav from "../components/IconosNav";
import { BotonCabecera, Cabecera, Kpi, Relacionados, Seccion } from "../components/Pagina";
import { Revelar } from "../components/Animacion";
import { ACENTOS, SEMAFORO } from "../lib/marca";

// ------------------------------------------------------------------ contraste (WCAG 2.1)
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const nota = (c: number) => (c >= 7 ? "AAA" : c >= 4.5 ? "AA" : c >= 3 ? "Solo texto grande" : "No pasa");

// Los mismos valores que index.css (fuente única de verdad: allá). Si cambian allá, cambian aquí.
const NEUTROS: { nombre: string; uso: string; dia: string; noche: string }[] = [
  { nombre: "Papel", uso: "Fondo de la página", dia: "#f4f8fe", noche: "#0a0d1f" },
  { nombre: "Superficie", uso: "Tarjetas y paneles", dia: "#ffffff", noche: "#12172f" },
  { nombre: "Tinta", uso: "Texto principal", dia: "#0c1d3a", noche: "#e9ebff" },
  { nombre: "Tinta suave", uso: "Texto de apoyo", dia: "#4a4d6e", noche: "#aab0d6" },
  { nombre: "Tinta tenue", uso: "Notas y fuentes", dia: "#5f6285", noche: "#8d94c4" },
  { nombre: "Marca", uso: "Títulos y enlaces", dia: "#1e40af", noche: "#93c5fd" },
  { nombre: "Menta", uso: "Fondos suaves", dia: "#e2edfd", noche: "#231f55" },
  { nombre: "Nivel", uso: "Bordes y líneas", dia: "#d0def4", noche: "#2b3260" },
];

const copiar = (t: string) => {
  try {
    void navigator.clipboard?.writeText(t);
  } catch {
    /* sin portapapeles */
  }
};

function Muestra({ hex, etiqueta, sub }: { hex: string; etiqueta: string; sub?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={() => { copiar(hex); setOk(true); setTimeout(() => setOk(false), 1200); }} title="Copiar el color"
      className="group text-left">
      <span className="block h-14 rounded-xl ring-1 ring-black/10 transition group-hover:scale-[1.03]" style={{ background: hex }} />
      <span className="mt-1.5 block text-sm font-semibold leading-tight">{etiqueta}</span>
      <span className="block text-xs text-tinta-tenue">{ok ? "Copiado" : hex.toUpperCase()}{sub ? ` · ${sub}` : ""}</span>
    </button>
  );
}

const Par = ({ si, no }: { si: ReactNode; no: ReactNode }) => (
  <div className="grid gap-3 md:grid-cols-2">
    <div className="rounded-2xl border border-[#2d9a5a]/50 bg-menta-2 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#2d9a5a]">Así sí</p><p className="mt-1">{si}</p></div>
    <div className="rounded-2xl border border-[#c0583a]/50 bg-ladrillo-claro p-4"><p className="text-xs font-semibold uppercase tracking-wide text-peligro">Así no</p><p className="mt-1">{no}</p></div>
  </div>
);

const ICONOS = ["inicio", "mapa", "personas", "alerta", "corredor", "indicadores", "radar", "accesibilidad", "prioridades", "participacion", "subir", "corazon", "fuentes", "andenes", "arbol", "tren", "lupa", "paleta", "luna", "sol", "flecha"];

export default function Identidad() {
  return (
    <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera etiqueta="Manual de identidad" icono="paleta" titulo="Cómo se ve y cómo habla el observatorio"
        texto="Una sola forma de usar el color, las letras, los íconos y las palabras, para que todo el sitio se sienta de la misma casa y siga siendo fácil de usar. Para que lo sigan quienes hereden el proyecto, y para ti si vas a presentarlo.">
        <BotonCabecera to="/propuesta" claro>Ver la propuesta de valor</BotonCabecera>
      </Cabecera>

      <Seccion mitad id="t-i-con" titulo="Concepto: Ladera" texto="Tres cosas que se ven desde cualquier calle de Santa Cruz.">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Las curvas de nivel", "El territorio. La comuna es una ladera y todo lo que medimos pasa sobre ella. Por eso las curvas de nivel son el patrón de fondo.", "#3b82f6"],
            ["El cable", "La conexión. El Metrocable cruza la comuna: la línea, la estación y el punto que late son nuestros símbolos de movimiento.", "#2d6ae0"],
            ["La gente y lo construido", "La gente y lo construido. El zafiro y los colores de semáforo marcan problemas y alertas, siempre con un número al lado.", "#2e9ad8"],
          ].map(([t, x, col]) => (
            <Revelar key={t} className="h-full">
              <div className="vidrio h-full rounded-2xl p-4" style={{ ["--glow" as string]: col, borderTop: `4px solid ${col}` }}>
                <h3 className="font-semibold text-marca">{t}</h3><p className="mt-1.5 text-sm text-tinta-suave">{x}</p>
              </div>
            </Revelar>
          ))}
        </div>
        <p className="mt-3 text-sm text-tinta-suave"><strong className="text-tinta">Valores:</strong> claro (lo entiende cualquiera), verificable (cada cifra tiene fuente) y cercano (habla como un vecino que sabe de datos).</p>
      </Seccion>

      <Seccion mitad id="t-i-logo" titulo="Logo" texto="Una ladera con la línea de un cable encima, sobre un degradado de cobalto a azul cielo. Se usa siempre completo.">
        <div className="grid gap-3 md:grid-cols-4">
          {[["Sobre claro", "#f4f8fe"], ["Sobre oscuro", "#0a0d1f"], ["Sobre cobalto", "#1e40af"], ["Sobre color de módulo", "#1d4f7a"]].map(([t, bg]) => (
            <div key={t} className="grid h-28 place-items-center rounded-2xl ring-1 ring-black/10" style={{ background: bg }}>
              <div className="text-center"><Logo className="mx-auto h-12 w-12" /><p className="mt-1.5 text-xs font-semibold" style={{ color: bg === "#f4f8fe" ? "#4a4d6e" : "#e9ebff" }}>{t}</p></div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <div className="vidrio rounded-2xl p-4 text-sm text-tinta-suave"><p className="font-semibold text-tinta">Espacio libre</p><p>Deja alrededor del logo la mitad de su alto, sin texto ni bordes.</p></div>
          <div className="vidrio rounded-2xl p-4 text-sm text-tinta-suave"><p className="font-semibold text-tinta">Tamaño mínimo</p><p>24 px de alto en pantalla. Más pequeño se pierde la línea del cable.</p></div>
          {[["Estirado", "scaleX(1.6)"], ["Otro color", "hue-rotate(150deg)"]].map(([t, f]) => (
            <div key={t} className="vidrio rounded-2xl p-4 text-sm text-tinta-suave">
              <div className="mb-1.5 flex h-10 items-center"><Logo className="h-9 w-9 origin-left" /><span className="mx-3 text-peligro" aria-hidden="true">✕</span><span style={{ display: "inline-block", filter: f.startsWith("hue") ? f : undefined, transform: f.startsWith("scale") ? f : undefined, transformOrigin: "left" }}><Logo className="h-9 w-9" /></span></div>
              <p className="font-semibold text-tinta">No: {t}</p>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion id="t-i-color" titulo="Color" texto="Se toca un color para copiar su código. Los de modo día y modo noche son pares: el mismo papel, otro tono.">
        <div className="vidrio vidrio--quieto rounded-2xl p-4 sm:p-5">
          <h3 className="font-semibold text-marca">Base (cambia con el modo)</h3>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            {NEUTROS.map((n) => (
              <div key={n.nombre}>
                <div className="grid grid-cols-2 gap-1.5">
                  <Muestra hex={n.dia} etiqueta={n.nombre} sub="día" /><Muestra hex={n.noche} etiqueta=" " sub="noche" />
                </div>
                <p className="mt-0.5 text-xs text-tinta-suave">{n.uso}</p>
              </div>
            ))}
          </div>
          <h3 className="mt-6 font-semibold text-marca">Contraste de los textos</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="border-b border-nivel text-left text-tinta-suave"><th className="py-1.5 font-semibold">Texto sobre fondo</th><th className="py-1.5 font-semibold">Día</th><th className="py-1.5 font-semibold">Noche</th></tr></thead>
              <tbody>
                {[["Tinta sobre papel", 2, 0], ["Tinta suave sobre papel", 3, 0], ["Tinta tenue sobre superficie", 4, 1], ["Marca sobre papel", 5, 0]].map(([t, i, f]) => {
                  const n = NEUTROS[i as number]; const fondo = NEUTROS[f as number];
                  const d = contraste(n.dia, fondo.dia), nn = contraste(n.noche, fondo.noche);
                  return (
                    <tr key={String(t)} className="border-b border-nivel/70">
                      <td className="py-1.5">{t}</td>
                      <td className="py-1.5 tabular-nums">{d.toFixed(1)} : 1 <span className="text-xs text-tinta-tenue">({nota(d)})</span></td>
                      <td className="py-1.5 tabular-nums">{nn.toFixed(1)} : 1 <span className="text-xs text-tinta-tenue">({nota(nn)})</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-tinta-tenue">Calculado en esta página con la fórmula WCAG 2.1. Meta: 4,5 : 1 o más para texto normal.</p>
        </div>

        <div className="vidrio vidrio--quieto mt-4 rounded-3xl p-4 sm:p-5">
          <h3 className="font-bold text-marca">Un color por módulo (todos en la familia de azules)</h3>
          <p className="mt-0.5 text-sm text-tinta-suave">Aparece en la cabecera, en el menú y en los detalles de ese módulo. Con eso sabes dónde estás sin leer.</p>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {Object.values(ACENTOS).map((a) => (
              <div key={a.id}>
                <div className="flex h-14 overflow-hidden rounded-xl ring-1 ring-black/10">
                  {[a.oscuro, a.medio, a.vivo].map((h) => <span key={h} className="flex-1" style={{ background: h }} />)}
                </div>
                <p className="mt-1.5 text-sm font-semibold leading-tight">{a.nombre}</p>
                <p className="text-xs text-tinta-tenue">{a.medio.toUpperCase()}</p>
                <p className="text-xs text-tinta-tenue">texto blanco {contraste("#ffffff", a.medio).toFixed(1)} : 1</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-tinta-tenue">Cobalto: Inicio, Mapa, Indicadores, Prioridades, Propuesta, Fuentes · Azul: Accesibilidad · Índigo: Corredor 49 · Zafiro: Problemáticas · Cielo: Radar · Añil: Mi barrio · Ultramar: Mis datos.</p>
        </div>

        <div className="vidrio vidrio--quieto mt-4 rounded-2xl p-4 sm:p-5">
          <h3 className="font-semibold text-marca">Semáforo único</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {([["Bien", SEMAFORO.bien, "Llega a la meta o la supera"], ["Ojo", SEMAFORO.ojo, "A medias o sin dato suficiente"], ["Mal", SEMAFORO.mal, "Lejos de la meta"]] as const).map(([t, c, x]) => (
              <div key={t} className="flex items-center gap-3"><span className="h-10 w-10 shrink-0 rounded-full" style={{ background: c }} /><div><p className="font-semibold">{t}</p><p className="text-xs text-tinta-suave">{x}</p></div></div>
            ))}
          </div>
          <p className="mt-3 text-sm text-tinta-suave">Regla: el color nunca va solo. Siempre lleva un número o una palabra, para quien no distingue colores.</p>
        </div>
      </Seccion>

      <Seccion mitad id="t-i-tipo" titulo="Letra" texto="Una sola familia, Inter, con pesos y tamaños fijos.">
        <div className="vidrio vidrio--quieto divide-y divide-nivel rounded-2xl px-4 sm:px-5">
          {[
            ["Título de página", "text-[1.9rem] font-semibold leading-tight tracking-tight", "Lo que pasa en Santa Cruz", "30 px · Semibold"],
            ["Título de sección", "text-lg font-semibold tracking-tight", "Diferencias entre barrios", "18 px · Semibold, con un punto del color del módulo"],
            ["Cifra grande", "text-[2rem] font-semibold tabular-nums leading-none", "22,4 %", "32 px · Semibold · números de ancho fijo"],
            ["Texto", "text-base", "Minutos estimados que camina cada manzana hasta el lugar más cercano.", "14 a 16 px · Regular"],
            ["Nota y fuente", "text-xs text-tinta-tenue", "Fuente: Censo 2018, DANE. Descargado el 10 de octubre de 2026.", "13 px · Regular"],
          ].map(([t, cl, ej, d]) => (
            <div key={t} className="grid gap-1 py-3 md:grid-cols-[10rem_1fr_auto] md:items-baseline md:gap-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-tinta-tenue">{t}</p>
              <p className={cl}>{ej}</p>
              <p className="text-xs text-tinta-tenue">{d}</p>
            </div>
          ))}
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-tinta-suave">
          <li>El texto de lectura es de 14 a 16 px, las notas de 12 a 13 px, y la persona puede agrandarlo con A+ (cuatro niveles, hasta 138 %).</li>
          <li>Las líneas de texto no pasan de unos 70 caracteres.</li>
          <li>Los números llevan coma decimal y punto de miles: 108.252 personas, 0,85 m².</li>
        </ul>
      </Seccion>

      <Seccion mitad id="t-i-comp" titulo="Componentes" texto="Lo que se ve en todas las páginas. Se construyen con las mismas piezas (components/Pagina.tsx).">
        <div className="vidrio vidrio--quieto space-y-5 rounded-2xl p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi valor="22,4 %" texto="llegan al Metro en 10 min" tono="rojo" />
            <Kpi valor="85,2 %" texto="a 5 min de una parada" tono="verde" />
            <Kpi valor="44,4 %" texto="a 15 min de biblioteca" tono="ambar" />
            <Kpi grande valor="0,85" texto="m² de espacio público por habitante" nota="Referencia: 15 m²" tono="rojo" />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-xl bg-[#1e40af] px-4 py-2.5 text-sm font-semibold text-white shadow">Botón principal</span>
            <span className="rounded-xl bg-menta px-4 py-2.5 text-sm font-semibold text-marca">Botón suave</span>
            {[["Hecho", "#1e40af"], ["Prototipo", "#2d6ae0"], ["Por validar", "#6a8ff5"], ["Propuesta", "#7d83a8"]].map(([t, c]) => <span key={t} className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ background: c }}>{t}</span>)}
          </div>
          <div className="grid gap-3 text-sm text-tinta-suave md:grid-cols-3">
            <p><strong className="text-tinta">Tarjetas:</strong> bordes de 16 px (24 px las grandes), borde fino y, al pasar el mouse, un brillo del color de su dato. En modo noche son de vidrio.</p>
            <p><strong className="text-tinta">Rejilla:</strong> 2 columnas en celular, 4 en pantalla grande. Ancho máximo 1024 px en módulos y 1152 px en portada. Espacios de 12, 32 y 36 px.</p>
            <p><strong className="text-tinta">Movimiento:</strong> suave y corto (200 a 600 ms). Si la persona pidió menos movimiento en su sistema, se quita.</p>
          </div>
        </div>
      </Seccion>

      <Seccion mitad id="t-i-ico" titulo="Íconos" texto="Línea de 1,8 px, esquinas redondeadas, 24 px. Siempre con una palabra al lado.">
        <div className="vidrio vidrio--quieto grid grid-cols-4 gap-3 rounded-2xl p-4 sm:grid-cols-7 sm:p-5">
          {ICONOS.map((n) => (
            <div key={n} className="flex flex-col items-center gap-1.5 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-menta text-marca"><IconoNav nombre={n} className="h-6 w-6" trazo={1.8} /></span>
              <span className="text-xs text-tinta-suave">{n}</span>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion mitad id="t-i-voz" titulo="Voz" texto="Un vecino que sabe de datos: claro, directo y sin hacerse el importante.">
        <div className="space-y-3">
          <Par si="Solo 22,4 % de las personas llega al Metro en 10 minutos caminando." no="Se evidencia una deficiencia significativa de accesibilidad multimodal en el área de estudio." />
          <Par si="No sabemos si la Alcaldía publica esos reportes. Hay que preguntarlo." no="Los reportes ciudadanos están plenamente integrados a la plataforma." />
          <Par si="Dice qué se midió, con qué fuente y qué no se puede afirmar." no="Los datos demuestran que la Carrera 49 es la solución." />
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-tinta-suave">
          <li>Se habla de tú. Frases cortas. Sin jerga: "andén", no "infraestructura peatonal".</li>
          <li>Lo que no se pudo verificar se dice así: <em>por verificar</em>. Nunca se rellena con un número inventado.</li>
          <li>Se señalan problemas, no culpables. Se muestran conteos por barrio, nunca víctimas ni personas.</li>
        </ul>
      </Seccion>

      <Seccion id="t-i-acc" titulo="Accesibilidad y confianza">
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["Se lee bien", "Contraste de 4,5 : 1 o más en todos los textos, en modo día y noche. Letra ajustable con A− y A+."],
            ["Se usa sin mouse", "Todo se alcanza con teclado, con foco visible de 3 px. Ctrl + K busca cualquier módulo o barrio."],
            ["Se puede revisar", "Cada cifra enlaza a su fuente, fecha y consulta (Fuentes y calidad). Los estados Hecho, Prototipo, Por validar y Propuesta dicen qué tan firme es cada cosa."],
            ["No se inventa", "Los datos del territorio salen solo de fuentes oficiales o de lo que sube la comunidad. Lo demás se marca como hipótesis."],
          ].map(([t, x], i) => (
            <Revelar key={t} retraso={i * 40} className="h-full"><div className="vidrio h-full rounded-2xl p-4"><h3 className="font-semibold text-marca">{t}</h3><p className="mt-1 text-sm text-tinta-suave">{x}</p></div></Revelar>
          ))}
        </div>
      </Seccion>

      <Relacionados ids={["propuesta", "fuentes", "mapa"]} />
    </div>
  );
}
