import { CAPAS, COLORES_BARRIO, TEMAS } from "../../lib/capas";
import type { FiltroHuecos, FiltroSiniestros, Modo } from "./MapaVivo";

interface Props {
  modo: Modo;
  activas: Set<string>;
  cargando: Record<string, "cargando" | "listo" | "error">;
  onCambiar: (id: string) => void;
  colorBarrios: string;
  onColorBarrios: (id: string) => void;
  filtroSiniestros: FiltroSiniestros;
  onFiltroSiniestros: (f: FiltroSiniestros) => void;
  filtroHuecos: FiltroHuecos;
  onFiltroHuecos: (f: FiltroHuecos) => void;
}

const ANIOS_HUECOS = ["Todos", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];
const ANIOS = ["Todos", "2019", "2020", "2021", "2022", "2023", "2024", "2025"];

/** Opciones detalladas: cada capa por separado, color de barrios y filtros. */
export default function PanelCapas(p: Props) {
  return (
    <div className="space-y-6 text-base">
      {p.modo === "comuna" && (
        <div>
          <label htmlFor="color-barrios" className="block font-semibold">
            Pintar los barrios según
          </label>
          <select
            id="color-barrios"
            value={p.colorBarrios}
            onChange={(e) => p.onColorBarrios(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-nivel bg-superficie px-3 py-2.5"
          >
            <option value="">No pintar (solo límites)</option>
            {COLORES_BARRIO.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {TEMAS.map((t) => (
        <fieldset key={t.id}>
          <legend className="mb-1 font-semibold">{t.nombre}</legend>
          <ul className="space-y-0.5">
            {CAPAS.filter((c) => c.tema === t.id).map((c) => {
              const activa = p.activas.has(c.id);
              const est = p.cargando[c.id];
              const soloComuna = p.modo === "ciudad" && !c.archivoCiudad;
              return (
                <li key={c.id}>
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-papel-hondo">
                    <input type="checkbox" checked={activa} onChange={() => p.onCambiar(c.id)} className="h-5 w-5 shrink-0 accent-[#3b82f6]" />
                    <span className="flex-1 leading-snug">
                      {c.nombre}
                      {soloComuna && <span className="block text-sm text-tinta-tenue">Solo hay datos para Santa Cruz</span>}
                      {activa && est === "cargando" && <span className="block text-sm text-tinta-tenue">Cargando…</span>}
                      {activa && est === "error" && <span className="block text-sm text-ladrillo">No se pudo cargar</span>}
                    </span>
                  </label>
                  {c.id === "huecos" && activa && (
                    <div className="ml-10 mt-1 grid grid-cols-2 gap-2">
                      <label className="text-sm">
                        Mostrar
                        <select
                          value={p.filtroHuecos.estado}
                          onChange={(e) => p.onFiltroHuecos({ ...p.filtroHuecos, estado: e.target.value as FiltroHuecos["estado"] })}
                          className="mt-0.5 w-full rounded-lg border border-nivel bg-superficie px-2 py-2"
                        >
                          <option value="Todos">Todos</option>
                          <option value="Pendiente">Solo pendientes</option>
                          <option value="Arreglado">Solo arreglados</option>
                        </select>
                      </label>
                      <label className="text-sm">
                        Año del reporte
                        <select
                          value={p.filtroHuecos.anio}
                          onChange={(e) => p.onFiltroHuecos({ ...p.filtroHuecos, anio: e.target.value })}
                          className="mt-0.5 w-full rounded-lg border border-nivel bg-superficie px-2 py-2"
                        >
                          {ANIOS_HUECOS.map((a) => (
                            <option key={a}>{a}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                  {c.id === "siniestros_viales" && activa && (
                    <div className="ml-10 mt-1 grid grid-cols-2 gap-2">
                      <label className="text-sm">
                        Mostrar
                        <select
                          value={p.filtroSiniestros.clase}
                          onChange={(e) => p.onFiltroSiniestros({ ...p.filtroSiniestros, clase: e.target.value as FiltroSiniestros["clase"] })}
                          className="mt-0.5 w-full rounded-lg border border-nivel bg-superficie px-2 py-2"
                        >
                          <option value="Atropello">Solo atropellos</option>
                          <option value="Todas">Todos los siniestros</option>
                        </select>
                      </label>
                      <label className="text-sm">
                        Año
                        <select
                          value={p.filtroSiniestros.anio}
                          onChange={(e) => p.onFiltroSiniestros({ ...p.filtroSiniestros, anio: e.target.value })}
                          className="mt-0.5 w-full rounded-lg border border-nivel bg-superficie px-2 py-2"
                        >
                          {ANIOS.map((a) => (
                            <option key={a}>{a}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}
