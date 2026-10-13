import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useDatos } from "../lib/datos";
import { AMENAZA, GRUPOS_EQUIPAMIENTO, TRATAMIENTOS } from "../lib/capas";
import { cop, dec, metros, num, pct, dec2 } from "../lib/formato";
import type { FichaBarrio as Ficha, Indicadores } from "../lib/tipos";

/** Referencia normativa: el Decreto 1504 de 1998 fija 15 m² de espacio público efectivo por habitante como mínimo. */
const META_EP = 15;

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-t border-nivel pt-3">
      <h3 className="mb-2 text-lg font-semibold [font-stretch:108%]">{titulo}</h3>
      {children}
    </section>
  );
}

function Dato({ etiqueta, valor, ayuda }: { etiqueta: string; valor: ReactNode; ayuda?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-base">
      <dt className="text-tinta-suave">{etiqueta}</dt>
      <dd className="text-right font-medium tabular-nums">
        {valor}
        {ayuda && <span className="block text-sm font-normal text-tinta-tenue">{ayuda}</span>}
      </dd>
    </div>
  );
}

function Barra({ valor, maximo, color }: { valor: number; maximo: number; color: string }) {
  const ancho = maximo > 0 ? Math.max(2, (valor / maximo) * 100) : 0;
  return (
    <span className="block h-1.5 w-full rounded bg-papel-hondo">
      <span className="block h-1.5 rounded" style={{ width: `${ancho}%`, background: color }} />
    </span>
  );
}

/** Señales calculadas con reglas simples y visibles. No son diagnósticos. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function senales(f: Ficha, comuna: Indicadores["comuna"], barrios: Ficha[], acceso?: any) {
  const s: string[] = [];
  const promAtropellos = barrios.reduce((a, b) => a + b.atropellos, 0) / barrios.length;
  if (f.espacio_publico_m2_hab != null && comuna.espacio_publico_m2_hab != null && f.espacio_publico_m2_hab < comuna.espacio_publico_m2_hab)
    s.push(`Tiene menos espacio público por habitante que el promedio de la comuna (${dec2(f.espacio_publico_m2_hab)} frente a ${dec2(comuna.espacio_publico_m2_hab)} m²).`);
  if (f.amenaza_alta_pct >= 10) s.push(`El ${pct(f.amenaza_alta_pct)} de su área está en amenaza alta por movimientos en masa.`);
  if (f.atropellos > promAtropellos * 1.2)
    s.push(`Registra más atropellos que el promedio por barrio (${num(f.atropellos)} frente a ${num(Math.round(promAtropellos))}, 2019 a 2025).`);
  if (acceso?.transporte_masivo_10min_pct != null && acceso.transporte_masivo_10min_pct < 20)
    s.push(`Solo el ${pct(acceso.transporte_masivo_10min_pct)} de su gente llega caminando en 10 minutos o menos a una estación de Metro, Metrocable o Metroplús (estimación por la red de calles).`);
  else if (!acceso && f.estacion_distancia_lineal_m != null && f.estacion_distancia_lineal_m > 600)
    s.push(`La estación de Metro o cable más cercana está a más de 600 m en línea recta desde el centro del barrio.`);
  if (f.sedes_educativas_oficiales === 0) s.push("No tiene sedes educativas oficiales dentro de sus límites.");
  if (f.densidad_hab_ha != null && comuna.densidad_hab_ha != null && f.densidad_hab_ha > comuna.densidad_hab_ha * 1.15)
    s.push(`Es más denso que el promedio de la comuna (${num(Math.round(f.densidad_hab_ha))} frente a ${num(Math.round(comuna.densidad_hab_ha))} hab/ha).`);
  return s;
}

export default function FichaBarrio({ ficha, indicadores }: { ficha: Ficha; indicadores: Indicadores }) {
  const { comuna, barrios } = indicadores;
  const grupos = Object.entries(ficha.equipamientos_por_grupo);
  const maxGrupo = Math.max(1, ...grupos.map(([, v]) => v));
  const acceso = indicadores.accesibilidad?.barrios?.find((b: { barrio: string }) => b.barrio === ficha.nombre);
  const anden = indicadores.infraestructura?.andenes?.barrios?.find((b: { barrio: string }) => b.barrio === ficha.nombre);
  const lista = senales(ficha, comuna, barrios, acceso);
  const rec = useDatos<{ huecos: { por_barrio: { barrio: string; total: number; arreglados: number; pendientes: number; dias_mediana: number | null }[] }; obras: { por_barrio: Record<string, number> }; quebradas: { por_barrio: Record<string, number> } }>("reclamos.json");
  const hue = rec.estado === "listo" ? rec.datos.huecos.por_barrio.find((b) => b.barrio === ficha.nombre) : undefined;
  const obrasPedidas = rec.estado === "listo" ? rec.datos.obras.por_barrio[ficha.nombre] : undefined;
  const quebReportes = rec.estado === "listo" ? rec.datos.quebradas.por_barrio[ficha.nombre] : undefined;

  return (
    <article className="space-y-3">
      <header>
        <p className="text-sm text-tinta-suave">Barrio de la Comuna 2, código {ficha.codigo}</p>
        <h2 className="text-3xl font-semibold leading-tight [font-stretch:112%]">{ficha.nombre}</h2>
        <p className="text-sm text-tinta-suave">{dec(ficha.area_ha)} hectáreas</p>
      </header>

      <Seccion titulo="Necesidades que muestran los datos">
        {lista.length ? (
          <ul className="list-disc space-y-1.5 pl-5 text-base">
            {lista.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-tinta-suave">Con los datos actuales no aparecen señales fuera de lo común frente a la comuna.</p>
        )}
        <p className="mt-2 text-xs text-tinta-tenue">
          Señales calculadas con reglas simples frente al promedio de la comuna. Sirven para orientar, no son un diagnóstico.
        </p>
      </Seccion>

      <Seccion titulo="Personas (Censo 2018, DANE)">
        <dl>
          <Dato etiqueta="Población" valor={num(ficha.poblacion_2018)} />
          <Dato etiqueta="Densidad" valor={`${num(ficha.densidad_hab_ha && Math.round(ficha.densidad_hab_ha))} hab/ha`} ayuda={`Comuna: ${num(comuna.densidad_hab_ha && Math.round(comuna.densidad_hab_ha))}`} />
          <Dato etiqueta="Menores de 10 años" valor={num(ficha.menores_10_2018)} />
          <Dato etiqueta="Personas de 60 años o más" valor={num(ficha.mayores_60_2018)} />
          <Dato etiqueta="Viviendas" valor={num(ficha.viviendas_2018)} />
        </dl>
      </Seccion>

      <Seccion titulo="Equipamientos y espacio público">
        <dl>
          <Dato etiqueta="Equipamientos dentro del barrio" valor={num(ficha.equipamientos)} />
        </dl>
        {grupos.length > 0 && (
          <ul className="mb-2 mt-1 space-y-1">
            {grupos.map(([g, v]) => (
              <li key={g} className="grid grid-cols-[1fr_auto] items-center gap-x-2 text-xs">
                <span>{g}</span>
                <span className="tabular-nums">{v}</span>
                <span className="col-span-2">
                  <Barra valor={v} maximo={maxGrupo} color={GRUPOS_EQUIPAMIENTO[g] ?? "#a5a9cc"} />
                </span>
              </li>
            ))}
          </ul>
        )}
        <dl>
          <Dato etiqueta="Sedes educativas" valor={`${num(ficha.sedes_educativas)} (${num(ficha.sedes_educativas_oficiales)} oficiales)`} />
          <Dato etiqueta="Escenarios deportivos" valor={num(ficha.escenarios_deportivos)} />
          <Dato etiqueta="Bibliotecas" valor={num(ficha.bibliotecas)} />
          <Dato
            etiqueta="Espacio público por habitante"
            valor={`${dec2(ficha.espacio_publico_m2_hab)} m²`}
            ayuda={`Comuna: ${dec2(comuna.espacio_publico_m2_hab)} m². Referencia nacional: ${META_EP} m²`}
          />
          <Dato etiqueta="Espacio público proyectado por el POT" valor={`${num(ficha.espacio_publico_proyectado_m2)} m²`} />
        </dl>
      </Seccion>

      <Seccion titulo="Movilidad y seguridad vial">
        <dl>
          <Dato
            etiqueta="Estación de Metro o cable más cercana"
            valor={ficha.estacion_mas_cercana ?? "Sin dato"}
            ayuda={`${metros(ficha.estacion_distancia_lineal_m)} en línea recta (referencia)`}
          />
          <Dato
            etiqueta="Tiempo promedio caminando a una estación"
            valor={acceso?.transporte_masivo_promedio_min != null ? `${dec(acceso.transporte_masivo_promedio_min)} min` : "Sin dato"}
            ayuda={acceso ? `Por la red de calles y con pendiente. ${pct(acceso.transporte_masivo_10min_pct)} de la gente llega en 10 min o menos` : undefined}
          />
          {anden && (
            <Dato
              etiqueta="Andenes inventariados"
              valor={`${dec2(anden.andenes_km)} km`}
              ayuda={`Ancho mediano ${dec2(anden.ancho_mediano_m)} m; ${pct(anden.andenes_angostos_pct)} más angosto que 1,2 m`}
            />
          )}
          <Dato etiqueta="Siniestros viales 2019 a 2025" valor={num(ficha.siniestros_viales)} />
          <Dato etiqueta="Atropellos 2019 a 2025" valor={num(ficha.atropellos)} />
        </dl>
      </Seccion>

      {(hue || obrasPedidas || quebReportes) && (
        <Seccion titulo="Huecos y reclamos a la Alcaldía">
          <dl>
            {hue && <Dato etiqueta="Reportes de huecos desde 2020" valor={num(hue.total)} ayuda={`${num(hue.arreglados)} ya figuran arreglados y ${num(hue.pendientes)} siguen pendientes${hue.dias_mediana != null ? `. La mitad se arregló en ${hue.dias_mediana} días o menos` : ""}`} />}
            {obrasPedidas != null && <Dato etiqueta="Obras pedidas a Infraestructura" valor={num(obrasPedidas)} />}
            {quebReportes != null && <Dato etiqueta="Solicitudes sobre quebradas" valor={num(quebReportes)} />}
          </dl>
          <p className="mt-2 text-sm">
            <Link to={`/mapa?capas=huecos&barrio=${ficha.codigo}`} className="text-cable underline underline-offset-2">Ver los huecos de este barrio en el mapa</Link>
          </p>
        </Seccion>
      )}

      <Seccion titulo="Plan de Ordenamiento Territorial">
        <p className="mb-1 text-xs text-tinta-suave">Tratamientos: lo que el POT espera que la zona llegue a ser.</p>
        <ul className="space-y-1">
          {Object.entries(ficha.tratamientos_pct).map(([t, v]) => (
            <li key={t} className="flex items-center gap-2 text-sm">
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: TRATAMIENTOS[t] ?? "#bbb" }} />
              <span className="flex-1">{t.startsWith("Áreas de Preservación") ? "Preservación de infraestructuras" : t}</span>
              <span className="tabular-nums">{pct(v)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2">
          <Dato etiqueta="Área con amenaza alta" valor={<span style={{ color: ficha.amenaza_alta_pct >= 10 ? AMENAZA.Alta : undefined }}>{pct(ficha.amenaza_alta_pct)}</span>} />
          <Dato etiqueta="Área con amenaza media" valor={pct(ficha.amenaza_media_pct)} />
          <Dato etiqueta="Área en alto riesgo no mitigable" valor={pct(ficha.riesgo_no_mitigable_pct)} />
        </dl>
      </Seccion>

      <Seccion titulo="Vivienda">
        <dl>
          <Dato etiqueta="Ofertas de venta de vivienda (OIME, 2023)" valor={num(ficha.ofertas_venta_vivienda)} />
          <Dato
            etiqueta="Mediana del precio pedido por m²"
            valor={ficha.mediana_precio_m2_venta ? cop(ficha.mediana_precio_m2_venta) : "Pocos datos"}
            ayuda={ficha.mediana_precio_m2_venta ? "Precio pedido en internet, no avalúo" : "Se muestra con 3 o más ofertas"}
          />
        </dl>
      </Seccion>

      <Seccion titulo="Lo que todavía no se sabe">
        <ul className="list-disc space-y-1 pl-5 text-xs text-tinta-suave">
          <li>El inventario de andenes trae su ancho, pero los códigos de estado y material no tienen significado publicado.</li>
          <li>Las escaleras y senderos salen de OpenStreetMap y pueden estar incompletos. Los tiempos de caminata son estimaciones.</li>
          <li>Jardines infantiles y centros de salud pueden estar incompletos en la capa oficial.</li>
          <li>La población es del Censo 2018.</li>
        </ul>
      </Seccion>
    </article>
  );
}
