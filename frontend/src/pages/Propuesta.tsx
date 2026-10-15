import type { ReactNode } from "react";
import { useDatos } from "../lib/datos";
import { dec, num, pct } from "../lib/formato";
import type { Indicadores } from "../lib/tipos";
import { BotonCabecera, Cabecera, Relacionados, Seccion } from "../components/Pagina";
import { Revelar } from "../components/Animacion";

type Estado = "Hecho" | "Prototipo" | "Por validar" | "Propuesta";
const COLOR: Record<Estado, string> = { Hecho: "#3b82f6", Prototipo: "#2d6ae0", "Por validar": "#6a8ff5", Propuesta: "#7d83a8" };
const Chip = ({ e }: { e: Estado }) => <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: COLOR[e] }}>{e}</span>;

const Tarjeta = ({ titulo, children, tono }: { titulo: string; children: ReactNode; tono?: string }) => (
  <div className="h-full rounded-2xl border border-nivel bg-superficie p-4 shadow-sm" style={tono ? { borderTopColor: tono, borderTopWidth: 4 } : undefined}>
    <h3 className="font-semibold text-marca">{titulo}</h3>
    <div className="mt-1.5 space-y-1.5 text-sm text-tinta-suave">{children}</div>
  </div>
);

const CANALES: { canal: string; que: string; estado: Estado; nota: string }[] = [
  { canal: "Inventario oficial de la Alcaldía", que: "Andenes (ancho), calzadas, escaleras y puentes del mapa", estado: "Hecho", nota: "Ya está en el mapa y en Accesibilidad. Es la base, pero puede estar desactualizado y no dice cuándo se dañó algo." },
  { canal: "Reportes de vecinos con foto y ubicación", que: "Huecos, andenes rotos, escaleras en mal estado, basura acumulada, luminarias", estado: "Prototipo", nota: "El módulo Participación guarda reportes solo en el navegador. Falta el servidor, la foto y la validación por la JAC." },
  { canal: "ReportesMED (app de la Alcaldía)", que: "Huecos, escombros y basuras, luminarias", estado: "Por validar", nota: "Existe desde 2022. No verificamos si la Alcaldía publica esos reportes como datos abiertos: hay que pedirlos o consultarlos." },
  { canal: "Radar de noticias", que: "Emergencias, cierres, basuras, accidentes, obras", estado: "Hecho", nota: "Se recolecta solo, con Google Noticias. Sirve para contexto y para detectar picos, no para medir." },
  { canal: "Recorrido con celular o cámara y visión por computador", que: "Huecos, andenes y escaleras detectados en video geolocalizado", estado: "Propuesta", nota: "Se grabarían las calles de la comuna caminando o en moto y un modelo marcaría los daños. No lo hemos probado: hay que medir qué tan bien detecta antes de afirmarlo." },
  { canal: "Imágenes satelitales o de dron", que: "Zonas de acumulación de residuos, cambios en laderas", estado: "Propuesta", nota: "Útil para laderas y escombreras grandes, no para huecos ni andenes. Fase posterior." },
];

function Contenido({ ind }: { ind: Indicadores }) {
  const c = ind.comuna;
  const acc = ind.accesibilidad?.comuna as Record<string, number> | undefined;
  const an = ind.infraestructura?.andenes;
  const atropellos = ind.barrios.reduce((s, b) => s + b.atropellos, 0);

  return (
    <div className="pagina-rejilla mx-auto max-w-[112rem] px-4 py-6 lg:px-8 2xl:px-12">
      <Cabecera etiqueta="Propuesta de valor" icono="corazon" titulo="Por qué Santa Cruz necesita un observatorio"
        texto={<>Qué problemas tiene la comuna, qué existe ya, qué falta, cómo lo detectamos y quién lo usaría. Escrito con lo que pudimos verificar y marcando lo que todavía no.</>}>
        <BotonCabecera to="/radar">Ver el radar de noticias</BotonCabecera>
        <BotonCabecera to="/problematicas" claro>Ver las problemáticas</BotonCabecera>
      </Cabecera>

      <Seccion id="t-p-nec" titulo="Qué necesita la comuna" texto="Las cifras salen de los datos oficiales que ya están en el observatorio.">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Espacio público", `${dec(c.espacio_publico_m2_hab)} m² por habitante frente a los 15 m² de referencia nacional. Casi no hay dónde estar, jugar o caminar sin estorbos.`, "#3b82f6"],
            ["Llegar caminando", `Solo ${pct(acc?.transporte_masivo_10min_pct)} de las personas llega al Metro o Metrocable en 10 minutos caminando. La ladera alarga el camino.`, "#2d6ae0"],
            ["Andenes que sirvan", `${pct(an?.angostos_pct)} del andén inventariado mide menos de 1,2 m. Con coches, bastones o sillas, no caben.`, "#6a8ff5"],
            ["Seguridad vial", `${num(atropellos)} atropellos registrados entre 2019 y 2025 en los barrios de la comuna.`, "#c0583a"],
            ["Ladera y agua", `${pct(c.amenaza_pct?.Alta)} de la superficie tiene amenaza alta por movimiento en masa. En noviembre de 2024 una emergencia por un tubo del acueducto dejó cientos de damnificados.`, "#8a4a6a"],
            ["Decidir con datos", "Hoy las decisiones de obra, presupuesto participativo y proyectos privados se apoyan en datos repartidos en muchas oficinas y formatos.", "#2a8ac8"],
          ].map(([t, x, col], i) => (
            <Revelar key={t} retraso={i * 40} className="h-full"><Tarjeta titulo={t} tono={col}><p>{x}</p></Tarjeta></Revelar>
          ))}
        </div>
      </Seccion>

      <Seccion mitad id="t-p-existe" titulo="¿Ya existe algo así?" texto="Lo que encontramos. No es una revisión exhaustiva: antes de presentarlo, hay que confirmarlo con la Alcaldía y la comunidad.">
        <div className="grid gap-3 md:grid-cols-2">
          <Tarjeta titulo="ReportesMED (Alcaldía de Medellín)">
            <p>App para que los vecinos reporten huecos, escombros y basuras en las calles y daños en luminarias; reemplazó a HuecosMed. Se puede usar sin registrarse y los reportes llegan a las entidades responsables (según la <a className="font-semibold text-marca underline" href="https://www.medellin.gov.co/es/sala-de-prensa/noticias/con-reportesmed-ciudadanos-podran-reportar-escombros-huecos-en-las-calles-y-danos-en-luminarias/" target="_blank" rel="noopener noreferrer">noticia de 2022</a>).</p>
            <p><strong className="text-tinta">Lo que no cubre:</strong> andenes, escaleras, pendientes ni accesibilidad, y no es un mapa de decisión por comuna.</p>
          </Tarjeta>
          <Tarjeta titulo="Datos geográficos abiertos de la Alcaldía">
            <p>La Alcaldía publica capas de movilidad, espacio público, POT, riesgo y seguridad. Nosotros usamos decenas de capas de ahí y del DANE (la lista completa está en Fuentes y calidad).</p>
            <p><strong className="text-tinta">Lo que no hay (que hayamos visto):</strong> un análisis que junte esas capas para una sola comuna y diga, por ejemplo, cuántos minutos camina cada manzana hasta el Metro.</p>
          </Tarjeta>
          <Tarjeta titulo="Noticias y redes">
            <p>La información sobre emergencias, basuras y obras está repartida entre muchos medios y páginas, sin orden ni historial.</p>
            <p>El Radar la junta por tema y barrio, pero es contexto, no medición.</p>
          </Tarjeta>
          <Tarjeta titulo="Lo que no sabemos">
            <p>Si la Alcaldía, alguna universidad o una organización de la comuna ya tiene un tablero parecido. Hay que preguntarlo en la presentación del reto: si existe, lo correcto es conectarnos, no competir.</p>
          </Tarjeta>
        </div>
      </Seccion>

      <Seccion mitad id="t-p-dif" titulo="Qué lo hace distinto" texto="Cinco cosas que ya funcionan en esta versión.">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            ["Minutos reales", "Caminando por calles, escaleras y puentes, con la pendiente de la ladera, para cada una de las 476 manzanas."],
            ["Responde preguntas concretas", "¿Conviene ir por la Carrera 49? Medimos que sí para algunos barrios y no para todos."],
            ["Todo se puede revisar", "Cada cifra apunta a su fuente, fecha y consulta. Lo que no se pudo verificar sale como pendiente."],
            ["Junta lo que está separado", "Mapa, indicadores, accesibilidad, seguridad, noticias y tus propios datos en el mismo lugar."],
            ["Honesto con sus límites", "Dice qué no se puede afirmar. Eso da confianza a una comunidad que ya ha visto muchas promesas."],
          ].map(([t, x], i) => <Revelar key={t} retraso={i * 40} className="h-full"><Tarjeta titulo={t}><p>{x}</p></Tarjeta></Revelar>)}
        </div>
      </Seccion>

      <Seccion id="t-p-det" titulo="Cómo detectamos aceras, escaleras, huecos y basura" texto="Ningún canal alcanza solo. La idea es cruzar varios.">
        <div className="overflow-x-auto rounded-2xl border border-nivel bg-superficie shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-nivel bg-papel text-left text-tinta-suave">
              <th className="px-4 py-2 font-semibold">Canal</th><th className="px-4 py-2 font-semibold">Qué detecta</th><th className="px-4 py-2 font-semibold">Estado</th><th className="px-4 py-2 font-semibold">Ojo con</th></tr></thead>
            <tbody>
              {CANALES.map((x) => (
                <tr key={x.canal} className="border-b border-nivel/70 align-top">
                  <td className="px-4 py-2.5 font-semibold">{x.canal}</td><td className="px-4 py-2.5">{x.que}</td>
                  <td className="px-4 py-2.5"><Chip e={x.estado} /></td><td className="px-4 py-2.5 text-tinta-suave">{x.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-tinta-suave">
          Una forma sencilla de cruzar: cuando un daño aparece en dos canales (por ejemplo un reporte de vecino y un hueco detectado en video), sube su prioridad; cuando está solo en uno, queda "por verificar" hasta que alguien lo confirme en campo.
        </p>
      </Seccion>

      <Seccion mitad id="t-p-redes" titulo="¿Y TikTok, Facebook y otras redes?">
        <div className="grid gap-3 md:grid-cols-2">
          <Tarjeta titulo="Lo que no hacemos" tono="#c0583a">
            <p>No sacamos información de TikTok, Facebook o Instagram con programas automáticos. Esas plataformas lo prohíben en sus términos de servicio, y lo que publica una persona sigue siendo un dato personal protegido por la Ley 1581 de 2012 (habeas data) aunque sea visible.</p>
            <p>Además, un proyecto que gana un reto y luego tiene un problema legal por esto pierde más de lo que gana.</p>
          </Tarjeta>
          <Tarjeta titulo="Lo que sí podemos hacer" tono="#3b82f6">
            <p><strong className="text-tinta">1. Que el vecino nos cuente a nosotros:</strong> un formulario o un número de WhatsApp de la comuna donde manda la foto, la ubicación y acepta que se use. Es más limpio y más útil que raspar redes.</p>
            <p><strong className="text-tinta">2. Páginas públicas de organizaciones de la comuna,</strong> con su permiso, leídas por una persona o con su autorización.</p>
            <p><strong className="text-tinta">3. Programas oficiales para investigación</strong> de algunas plataformas, si aceptan al proyecto. No verificamos si están disponibles para Colombia: hay que revisarlo.</p>
            <p><strong className="text-tinta">4. Siempre agregado:</strong> conteos por barrio y por tema, nunca perfiles ni nombres de personas.</p>
          </Tarjeta>
        </div>
      </Seccion>

      <Seccion mitad id="t-p-vende" titulo="Por qué se puede vender, y a quién" texto="Son hipótesis. Cada una se valida con entrevistas antes de decir que es un cliente.">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["Alcaldía y secretarías", "Priorizar obras de andenes, vías y espacio público con criterios claros y trazables."],
            ["JAL, JAC y presupuesto participativo", "Llevar datos a las reuniones y justificar por qué una obra va primero."],
            ["Constructoras e inmobiliarias", "Entender la zona: densidad, tratamientos del POT, accesibilidad y oferta (hoy 41 ofertas registradas, pocas para sacar conclusiones)."],
            ["Otras comunas y municipios", "El mismo método se repite con otro código de comuna. Es lo que permitiría llegar al Valle de Aburrá."],
          ].map(([t, x], i) => <Revelar key={t} retraso={i * 40} className="h-full"><Tarjeta titulo={t}><p>{x}</p></Tarjeta></Revelar>)}
        </div>
        <p className="mt-3 text-sm text-tinta-suave">Modelo posible: una suscripción por comuna o municipio con actualización de datos e informes. Los números de precio no están calculados todavía.</p>
      </Seccion>

      <Seccion mitad id="t-p-gana" titulo="¿Ganará el reto?" texto="Nadie lo puede asegurar. Esto es lo que juega a favor y lo que hay que reforzar.">
        <div className="grid gap-3 md:grid-cols-2">
          <Tarjeta titulo="A favor" tono="#3b82f6">
            <ul className="list-disc space-y-1 pl-5">
              <li>Funciona hoy, no es solo una idea: se puede probar en vivo.</li>
              <li>Responde directamente al reto (espacios públicos, equipamientos y movilidad).</li>
              <li>Todo está documentado y se puede revisar.</li>
              <li>Crece: ya tiene API, subida de datos propios y radar.</li>
            </ul>
          </Tarjeta>
          <Tarjeta titulo="A reforzar antes de presentar" tono="#c0583a">
            <ul className="list-disc space-y-1 pl-5">
              <li>Hablar con una JAC o líder de la comuna y poner su comentario en la presentación.</li>
              <li>Probar los reportes con 15 o 20 vecinos reales.</li>
              <li>Medir en campo si los minutos caminando se parecen a la realidad en 3 o 4 recorridos.</li>
              <li>Tener una sola frase de impacto y un cálculo de costo.</li>
            </ul>
          </Tarjeta>
        </div>
      </Seccion>

      <Seccion mitad id="t-p-datos" titulo="Qué información necesitamos" texto="Lo que ya tenemos y lo que falta conseguir.">
        <div className="grid gap-2 md:grid-cols-2">
          {([
            ["Censo 2018, POT, movilidad, equipamientos, riesgo, seguridad", "Hecho"],
            ["Tiempos caminando por manzana, con pendiente", "Hecho"],
            ["Titulares de noticias por tema y barrio", "Hecho"],
            ["Reportes de vecinos con foto y ubicación", "Prototipo"],
            ["Datos de ReportesMED por comuna", "Por validar"],
            ["Residuos: toneladas por barrio (Emvarias y EPM)", "Por validar"],
            ["Velocidades de buses y carros en la 49", "Por validar"],
            ["Video geolocalizado de las calles para detectar daños", "Propuesta"],
          ] as [string, Estado][]).map(([t, e]) => (
            <div key={t} className="flex items-center justify-between gap-3 rounded-xl border border-nivel bg-superficie px-3.5 py-2.5 text-sm"><span>{t}</span><Chip e={e} /></div>
          ))}
        </div>
      </Seccion>

      <Relacionados ids={["radar", "datos", "prioridades"]} />
    </div>
  );
}

export default function Propuesta() {
  const estado = useDatos<Indicadores>("indicadores.json");
  return estado.estado === "listo" ? <Contenido ind={estado.datos} /> : <p className="p-6 text-tinta-suave">{estado.estado === "error" ? "No se pudieron cargar los datos." : "Cargando…"}</p>;
}
