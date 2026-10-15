import type { ReactNode } from "react";
import type { Estado as EstadoDatos } from "../lib/datos";
import type { TipoDato } from "../lib/tipos";

export function Cargando({ texto = "Cargando datos" }: { texto?: string }) {
  return (
    <div role="status" className="grid gap-3 py-6" aria-label={texto}>
      <p className="mono text-[0.72rem] uppercase tracking-[0.06em] text-tinta-tenue">{texto}…</p>
      <div className="grid gap-2" aria-hidden="true">
        {[92, 76, 58].map((w) => <span key={w} className="h-3 animate-[suave_1.8s_ease-in-out_infinite] rounded bg-papel-hondo" style={{ width: `${w}%` }} />)}
      </div>
    </div>
  );
}

export function ErrorCarga({ error, reintentar }: { error: string; reintentar?: () => void }) {
  return (
    <div role="alert" className="aviso aviso-demo">
      <p className="aviso-t">No se pudieron cargar estos datos</p>
      <p>{error}</p>
      <p className="mt-1 text-sm">Si estás sin internet, vuelve a intentarlo cuando tengas conexión. El resto de la página sigue funcionando.</p>
      {reintentar && (
        <button type="button" onClick={reintentar} className="boton boton-2 mt-3">
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}

export function SinDatos({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="vacio text-sm">
      <div>
      <p className="font-semibold text-tinta">{titulo}</p>
      {children && <div className="mt-1 text-tinta-suave">{children}</div>}
      </div>
    </div>
  );
}

/** Pinta el contenido solo cuando los datos están listos; si no, muestra carga o error. */
export function ConDatos<T>({ estado, children }: { estado: EstadoDatos<T>; children: (datos: T) => ReactNode }) {
  if (estado.estado === "cargando") return <Cargando />;
  if (estado.estado === "error") return <ErrorCarga error={estado.error} reintentar={estado.reintentar} />;
  return <>{children(estado.datos)}</>;
}

const ESTILO_TIPO: Record<TipoDato, string> = {
  oficial: "bg-menta text-marca",
  tercero: "bg-cable-claro text-cable",
  campo: "bg-ambar-claro text-ambar",
  demostrativo: "bg-ladrillo-claro text-ladrillo",
};

const NOMBRE_TIPO: Record<TipoDato, string> = {
  oficial: "Dato oficial",
  tercero: "Dato abierto de terceros",
  campo: "Levantado en campo",
  demostrativo: "Dato demostrativo",
};

export function EtiquetaTipo({ tipo }: { tipo: TipoDato }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${ESTILO_TIPO[tipo]}`}>{NOMBRE_TIPO[tipo]}</span>
  );
}
