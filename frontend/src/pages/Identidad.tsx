import { useState, type ReactNode } from "react";
import { Logo } from "../components/Layout";
import IconoNav from "../components/IconosNav";
import { Aviso, BotonCabecera, Cabecera, EtiquetaClase, Kpi, Relacionados, Seccion, type ClaseDato } from "../components/Pagina";
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

// Los mismos valores que los tokens de index.css (la fuente de verdad está allá).
const NEUTROS: { nombre: string; uso: string; dia: string; noche: string }[] = [
  { nombre: "Papel", uso: "Fondo de la página", dia: "#f6f5f1", noche: "#0b0f19" },
  { nombre: "Papel hondo", uso: "Paneles de apoyo", dia: "#edebe4", noche: "#111725" },
  { nombre: "Superficie", uso: "Mapas, tablas y campos", dia: "#ffffff", noche: "#151c2d" },
  { nombre: "Nivel", uso: "Líneas y bordes", dia: "#dedbd1", noche: "#2c364e" },
  { nombre: "Tinta", uso: "Texto principal y cifras", dia: "#101729", noche: "#eceef3" },
  { nombre: "Tinta suave", uso: "Texto de apoyo", dia: "#3e465a", noche: "#b4bccc" },
  { nombre: "Tinta tenue", uso: "Notas y fuentes", dia: "#626a7c", noche: "#8e97ac" },
  { nombre: "Cobalto", uso: "Botones, enlaces y foco", dia: "#1f40cc", noche: "#8ca6ff" },
];

const copiar = (t: string) => {
  try { void navigator.clipboard?.writeText(t); } catch { /* sin portapapeles */ }
};

function Muestra({ hex, etiqueta, sub }: { hex: string; etiqueta: string; sub?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={() => { copiar(hex); setOk(true); setTimeout(() => setOk(false), 1200); }} title="Copiar el color" className="group text-left">
      <span className="block h-12 rounded-lg border border-nivel" style={{ background: hex }} />
      <span className="mt-1.5 block text-sm font-semibold leading-tight">{etiqueta}</span>
      <span className="block font-mono text-xs text-tinta-tenue">{ok ? "Copiado" : hex.toUpperCase()}{sub ? ` · ${sub}` : ""}</span>
    </button>
  );
}

const Par = ({ si, no }: { si: ReactNode; no: ReactNode }) => (
  <div className="grid gap-4 border-b border-nivel pb-4 md:grid-cols-2">
    <div><p className="font-mono text-xs uppercase tracking-wider text-ladera">Así sí</p><p className="mt-1">{si}</p></div>
    <div><p className="font-mono text-xs uppercase tracking-wider text-peligro">Así no</p><p className="mt-1 text-tinta-suave">{no}</p></div>
  </div>
);

const Etiqueta = ({ children }: { children: ReactNode }) => <p className="font-mono text-xs uppercase tracking-wider text-tinta-tenue">{children}</p>;

const ICONOS = ["inicio", "mapa", "personas", "alerta", "corredor", "indicadores", "radar", "accesibilidad", "prioridades", "participacion", "subir", "corazon", "fuentes", "andenes", "arbol", "tren", "lupa", "paleta", "luna", "sol", "flecha"];
const CLASES: ClaseDato[] = ["oficial", "entregado", "derivado", "ciudadano", "prensa", "demostrativo", "pendiente"];

export default function Identidad() {
  return (
    <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera etiqueta="Manual de identidad" icono="paleta" titulo="Cómo se ve y cómo habla OTEA"
        pregunta="¿Qué reglas siguen las páginas para verse y sentirse igual?"
        texto="Una sola forma de usar el color, la letra, las piezas y las palabras. Sirve para quien herede el proyecto y para quien lo presente.">
        <BotonCabecera to="/propuesta">Ver la propuesta de valor</BotonCabecera>
      </Cabecera>

      <Seccion mitad id="t-i-con" titulo="Concepto: cartografía de ladera" pregunta="¿De dónde sale el estilo?"
        texto="La comuna es una ladera con un cable encima. El sitio se ve como un buen mapa impreso: papel cálido, tinta oscura, líneas finas y un solo color fuerte.">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ["Curvas de nivel", "El territorio. Aparecen de fondo en la portada y en el logo, siempre tenues."],
            ["La regla", "La escala de un mapa. Bajo cada título hay una regla con marcas: recuerda que aquí todo se mide."],
            ["Tinta y papel", "Las cifras van en tinta negra con una raya encima, sin cajas. El color se guarda para lo que importa."],
          ].map(([t, x]) => (
            <div key={t} className="border-t-2 border-tinta pt-3">
              <h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-tinta-suave">{x}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm text-tinta-suave"><strong className="text-tinta">Valores:</strong> claro (lo entiende cualquiera), verificable (cada cifra dice de dónde sale) y cercano (habla como un vecino que sabe de datos).</p>
      </Seccion>

      <Seccion mitad id="t-i-logo" titulo="Logo" pregunta="¿Cómo se usa el logo?"
        texto="Un cuadro cobalto con tres curvas de nivel y la línea del cable con su cabina. Se usa siempre completo y sin cambiarle el color.">
        <div className="grid gap-4 sm:grid-cols-3">
          {[["Sobre papel", "#f6f5f1", "#3e465a"], ["Sobre blanco", "#ffffff", "#3e465a"], ["Sobre noche", "#0b0f19", "#b4bccc"]].map(([t, bg, tx]) => (
            <div key={t} className="grid h-28 place-items-center rounded-[14px] border border-nivel" style={{ background: bg }}>
              <div className="text-center"><Logo className="mx-auto h-12 w-12" /><p className="mt-1.5 text-xs font-semibold" style={{ color: tx }}>{t}</p></div>
            </div>
          ))}
        </div>
        <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm text-tinta-suave sm:grid-cols-2">
          <li><strong className="text-tinta">Espacio libre:</strong> la mitad de su alto alrededor, sin texto ni bordes.</li>
          <li><strong className="text-tinta">Tamaño mínimo:</strong> 24 px. Más pequeño se pierde el cable.</li>
          <li><strong className="text-tinta">No:</strong> estirarlo, rotarlo, cambiarle el color o ponerle sombra.</li>
          <li><strong className="text-tinta">Nombre:</strong> OTEA, en mayúsculas, con “Observatorio Santa Cruz” debajo cuando haya espacio.</li>
        </ul>
      </Seccion>

      <Seccion id="t-i-color" titulo="Color" pregunta="¿Qué color va dónde?"
        texto="Toca un color para copiar su código. Cada tono de día tiene su pareja de noche: el mismo papel, otra luz.">
        <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">
          {NEUTROS.map((n) => (
            <div key={n.nombre}>
              <div className="grid grid-cols-2 gap-1.5">
                <Muestra hex={n.dia} etiqueta={n.nombre} sub="día" /><Muestra hex={n.noche} etiqueta=" " sub="noche" />
              </div>
              <p className="mt-0.5 text-xs text-tinta-suave">{n.uso}</p>
            </div>
          ))}
        </div>

        <h3 className="fuente-titulo mt-10 text-lg font-semibold">Contraste de los textos</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="tabla min-w-[520px]">
            <thead><tr><th>Texto sobre fondo</th><th>Día</th><th>Noche</th></tr></thead>
            <tbody>
              {([["Tinta sobre papel", 4, 0], ["Tinta suave sobre papel", 5, 0], ["Tinta tenue sobre papel hondo", 6, 1], ["Cobalto sobre papel", 7, 0], ["Cobalto sobre superficie", 7, 2]] as const).map(([t, i, f]) => {
                const n = NEUTROS[i]; const fondo = NEUTROS[f];
                const d = contraste(n.dia, fondo.dia), nn = contraste(n.noche, fondo.noche);
                return (
                  <tr key={t}>
                    <td>{t}</td>
                    <td className="tabular-nums">{d.toFixed(1)} : 1 <span className="text-xs text-tinta-tenue">({nota(d)})</span></td>
                    <td className="tabular-nums">{nn.toFixed(1)} : 1 <span className="text-xs text-tinta-tenue">({nota(nn)})</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-tinta-tenue">Calculado en esta misma página con la fórmula WCAG 2.1. Meta: 4,5 : 1 o más para texto normal.</p>

        <h3 className="fuente-titulo mt-10 text-lg font-semibold">Un color por tema</h3>
        <p className="mt-1 max-w-3xl text-sm text-tinta-suave">El cobalto es la marca. Cada tema tiene un color propio que se usa con mesura: el punto del encabezado, el ícono del menú y las categorías de sus gráficos. Así se reconoce el tema sin leer el título.</p>
        <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {Object.values(ACENTOS).map((a) => (
            <div key={a.id}>
              <div className="flex h-12 overflow-hidden rounded-lg border border-nivel">
                {[a.oscuro, a.medio, a.vivo].map((h) => <span key={h} className="flex-1" style={{ background: h }} />)}
              </div>
              <p className="mt-1.5 text-sm font-semibold leading-tight">{a.nombre}</p>
              <p className="text-xs text-tinta-suave">{a.tema}</p>
              <p className="font-mono text-xs text-tinta-tenue">{a.medio.toUpperCase()} · blanco {contraste("#ffffff", a.medio).toFixed(1)} : 1</p>
            </div>
          ))}
        </div>

        <h3 className="fuente-titulo mt-10 text-lg font-semibold">Semáforo único</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {([["Bien", SEMAFORO.bien, "Llega a la meta o la supera"], ["Ojo", SEMAFORO.ojo, "A medias o sin dato suficiente"], ["Mal", SEMAFORO.mal, "Lejos de la meta"]] as const).map(([t, c, x]) => (
            <div key={t} className="flex items-center gap-3"><span className="h-9 w-9 shrink-0 rounded-full" style={{ background: c }} /><div><p className="font-semibold">{t}</p><p className="text-xs text-tinta-suave">{x}</p></div></div>
          ))}
        </div>
        <p className="mt-3 text-sm text-tinta-suave">Regla: el color nunca va solo. Siempre lleva un número o una palabra, para quien no distingue colores o imprime en blanco y negro.</p>
      </Seccion>

      <Seccion mitad id="t-i-tipo" titulo="Letra" pregunta="¿Qué letra se usa y para qué?"
        texto="Tres familias, cada una con un trabajo: una para títulos y cifras, una para leer y una técnica para fuentes y etiquetas.">
        <div className="divide-y divide-nivel border-y border-nivel">
          {[
            ["Bricolage Grotesque", "Títulos y cifras", <p key="a" className="fuente-titulo text-3xl font-extrabold tracking-tight">Lo que pasa en Santa Cruz</p>],
            ["Bricolage Grotesque", "Cifra grande", <p key="b" className="fuente-titulo text-4xl font-extrabold tabular-nums tracking-tight">22,4 %</p>],
            ["DM Sans", "Texto de lectura", <p key="c" className="text-base">Minutos estimados que camina cada manzana hasta el lugar más cercano.</p>],
            ["IBM Plex Mono", "Fuentes, fechas y etiquetas", <p key="d" className="font-mono text-xs uppercase tracking-wider text-tinta-tenue">DANE · Censo 2018 · datos a 10 oct 2026</p>],
          ].map(([f, uso, ej]) => (
            <div key={String(uso)} className="grid gap-1 py-4 md:grid-cols-[11rem_1fr] md:items-baseline md:gap-6">
              <div><p className="text-sm font-semibold">{f}</p><p className="text-xs text-tinta-tenue">{uso}</p></div>
              {ej}
            </div>
          ))}
        </div>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-tinta-suave">
          <li>El texto de lectura va de 15 a 17 px y la persona puede agrandarlo con A+ (hasta 138 %).</li>
          <li>Las líneas de texto no pasan de unos 70 caracteres.</li>
          <li>Coma decimal y punto de miles: 108.252 personas, 0,85 m².</li>
        </ul>
      </Seccion>

      <Seccion id="t-i-comp" titulo="Piezas" pregunta="¿Con qué se arma cada página?"
        texto="Todas las páginas usan las mismas piezas (components/Pagina.tsx e index.css). Así una cifra, una fuente o un aviso se ven igual en cualquier módulo.">
        <div className="grid gap-10">
          <div>
            <Etiqueta>Cifra · raya encima, sin caja; el color de la raya dice si es buena o mala noticia</Etiqueta>
            <div className="mt-3 grid grid-cols-2 gap-6 md:grid-cols-4">
              <Kpi valor="85,2 %" texto="a 5 min de una parada" tono="verde" />
              <Kpi valor="44,4 %" texto="a 15 min de una biblioteca" tono="ambar" />
              <Kpi valor="22,4 %" texto="llegan al Metro en 10 min" tono="rojo" />
              <Kpi grande valor="0,85" texto="m² de espacio público por habitante" nota="Referencia: 15 m²" tono="rojo" />
            </div>
          </div>
          <div>
            <Etiqueta>Clase de dato · va junto a cada fuente y dice qué tan firme es</Etiqueta>
            <div className="mt-3 flex flex-wrap gap-2">{CLASES.map((c) => <EtiquetaClase key={c} clase={c} />)}</div>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <Etiqueta>Botones y filtros</Etiqueta>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <span className="boton boton-1">Acción principal</span>
                <span className="boton boton-2">Acción secundaria</span>
                <span className="chip" aria-pressed="true">Filtro activo</span>
                <span className="chip">Filtro</span>
              </div>
              <p className="mt-2 text-sm text-tinta-suave">Una sola acción principal por bloque. Los filtros son pastillas: la activa se llena de tinta.</p>
            </div>
            <div>
              <Etiqueta>Avisos · tres tonos</Etiqueta>
              <div className="mt-3 grid gap-2">
                <Aviso titulo="Información">Contexto que ayuda a leer el dato.</Aviso>
                <Aviso tono="ojo" titulo="Cuidado">Un límite del dato que cambia la lectura.</Aviso>
                <Aviso tono="demo" titulo="Prototipo">Lo que se ve aquí no es real o no llega a ninguna entidad.</Aviso>
              </div>
            </div>
          </div>
          <div className="grid gap-6 text-sm text-tinta-suave md:grid-cols-3">
            <p><strong className="text-tinta">Cada bloque responde una pregunta.</strong> Arriba la pregunta en letra técnica, luego el título, el dato, la fuente con su fecha, cómo se calculó (plegable) y qué hacer después.</p>
            <p><strong className="text-tinta">Pocas cajas.</strong> Se separa con espacio y líneas finas. Las cajas quedan para mapas, tablas y avisos.</p>
            <p><strong className="text-tinta">Movimiento corto.</strong> 150 a 250 ms. Si la persona pidió menos movimiento en su sistema, se quita.</p>
          </div>
        </div>
      </Seccion>

      <Seccion mitad id="t-i-ico" titulo="Íconos" pregunta="¿Cómo son los íconos?" texto="Línea de 1,8 px, esquinas redondeadas, 24 px. Siempre con una palabra al lado.">
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-7">
          {ICONOS.map((n) => (
            <div key={n} className="flex flex-col items-center gap-1.5 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-lg border border-nivel bg-superficie text-tinta"><IconoNav nombre={n} className="h-6 w-6" trazo={1.8} /></span>
              <span className="text-xs text-tinta-suave">{n}</span>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion mitad id="t-i-voz" titulo="Voz" pregunta="¿Cómo habla OTEA?" texto="Un vecino que sabe de datos: claro, directo y sin hacerse el importante.">
        <div className="space-y-4">
          <Par si="Solo 22,4 % de las personas llega al Metro en 10 minutos caminando." no="Se evidencia una deficiencia significativa de accesibilidad multimodal en el área de estudio." />
          <Par si="No sabemos si la Alcaldía publica esos reportes. Hay que preguntarlo." no="Los reportes ciudadanos están plenamente integrados a la plataforma." />
          <Par si="Dice qué se midió, con qué fuente y qué no se puede afirmar." no="Los datos demuestran que la Carrera 49 es la solución." />
        </div>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-tinta-suave">
          <li>Se habla de tú. Frases cortas. Sin jerga: “andén”, no “infraestructura peatonal”.</li>
          <li>Lo que no se pudo verificar se dice así: <em>pendiente</em>. Nunca se rellena con un número inventado.</li>
          <li>Se señalan problemas, no culpables. Se muestran conteos por barrio, nunca personas, placas ni direcciones.</li>
        </ul>
      </Seccion>

      <Seccion id="t-i-ciu" titulo="Vista ciudadana" pregunta="¿Cómo se arma «Así vivimos Santa Cruz»?" texto="Misma paleta y tipografías; más letra, más aire y una imagen por tema. Cada tema tiene su color, que se repite en la etiqueta, la cifra y el mapa.">
        <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {[
            ["Tarjeta de problema", "Imagen, número y título del tema, frase que lo resume y la cifra principal con su unidad en palabras."],
            ["Cifra con equivalencia", "Un número grande y debajo qué significa: «unas 8 de cada 10», «una botella de agua». Solo equivalencias que se pueden verificar."],
            ["Mapa ciudadano", "Un tema a la vez, un solo color en cinco tonos, leyenda con palabras, ficha corta del barrio elegido y la lista de barrios como alternativa al color."],
            ["Compartir", "Mensaje corto con cifra, fuente y enlace, visible antes de enviarlo. Aclara que compartir no es presentar una solicitud."],
            ["Fotografía documental", "Solo fotos de Santa Cruz con autor, fecha, licencia y lugar conocido en el catálogo (lib/fotos.ts). Grandes en portadas, medianas junto al texto, pequeñas en el menú. El crédito siempre visible; placas y caras de niños difuminadas."],
            ["Texto sobre foto", "Siempre sobre un velo oscuro que garantiza contraste; nunca una foto de fondo en cada sección: se alterna con fondos limpios."],
            ["Menú «Explorar»", "Los temas con su foto y su pregunta, luego explorar y participar con su estado real (Funciona, Prueba, Canal oficial) y la puerta a OTEA Técnico."],
            ["Lo que todavía no sabemos", "Cada historia termina sus datos diciendo qué no se puede concluir. La fuente queda a un toque, sin ocupar la pantalla."],
          ].map(([t, x]) => (
            <div key={t} className="border-t border-nivel pt-3"><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-tinta-suave">{x}</p></div>
          ))}
        </div>
        <p className="mt-4 text-sm text-tinta-suave">Las fotos deben ser de Santa Cruz, sin rostros identificables, placas ni direcciones. Cómo agregar una y qué fotos faltan: <code className="mono">docs/fotos.md</code>.</p>
      </Seccion>

      <Seccion id="t-i-acc" titulo="Accesibilidad y confianza" pregunta="¿Qué se cumple siempre?">
        <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {[
            ["Se lee bien", "Contraste de 4,5 : 1 o más en los textos, de día y de noche. Letra ajustable con A− y A+."],
            ["Se usa sin mouse", "Todo se alcanza con teclado y con foco visible de 3 px. Ctrl + K busca módulos, barrios y conceptos."],
            ["Se puede revisar", "Cada cifra enlaza a su ficha en Fuentes y calidad: entidad, fecha, licencia, transformaciones y límites."],
            ["No se inventa", "Lo que es prototipo, ejemplo o propuesta lo dice con una etiqueta. Lo que no se pudo comprobar queda como pendiente."],
          ].map(([t, x]) => (
            <div key={t} className="border-t border-nivel pt-3"><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-tinta-suave">{x}</p></div>
          ))}
        </div>
      </Seccion>

      <Relacionados ids={["propuesta", "fuentes", "mapa"]} />
    </div>
  );
}
