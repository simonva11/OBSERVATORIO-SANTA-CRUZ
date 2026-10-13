import { lazy, Suspense } from "react";
import { HashRouter, Link, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { Cargando } from "./components/Estado";
import AvisosPWA from "./components/AvisosPWA";
import Inicio from "./pages/Inicio";

// Las páginas pesadas (mapa y gráficas) se cargan solo cuando se visitan.
const Mapa = lazy(() => import("./pages/Mapa"));
const Indicadores = lazy(() => import("./pages/Indicadores"));
const Accesibilidad = lazy(() => import("./pages/Accesibilidad"));
const Prioridades = lazy(() => import("./pages/Prioridades"));
const Participacion = lazy(() => import("./pages/Participacion"));
const Fuentes = lazy(() => import("./pages/Fuentes"));
const Corredor49 = lazy(() => import("./pages/Corredor49"));
const Problematicas = lazy(() => import("./pages/Problematicas"));
const Datos = lazy(() => import("./pages/Datos"));
const Identidad = lazy(() => import("./pages/Identidad"));
const Radar = lazy(() => import("./pages/Radar"));
const Propuesta = lazy(() => import("./pages/Propuesta"));
const Barrio = lazy(() => import("./pages/Barrio"));
const Inmobiliario = lazy(() => import("./pages/Inmobiliario"));
const Lideres = lazy(() => import("./pages/Lideres"));
const Visita = lazy(() => import("./pages/Visita"));
const Riesgo = lazy(() => import("./pages/Riesgo"));

function NoEncontrada() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-bold">Esta página no existe</h1>
      <p className="mt-2 text-tinta-suave">Puede volver al inicio o abrir el mapa.</p>
      <div className="mt-4 flex gap-3">
        <Link to="/" className="rounded-md bg-acento px-4 py-2 text-white">
          Ir al inicio
        </Link>
        <Link to="/mapa" className="rounded-md border border-nivel px-4 py-2">
          Abrir el mapa
        </Link>
      </div>
    </div>
  );
}

// HashRouter: el sitio funciona como archivos estáticos, sin configurar el servidor.
export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Suspense fallback={<Cargando texto="Cargando módulo" />}>
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/mapa" element={<Mapa />} />
            <Route path="/indicadores" element={<Indicadores />} />
            <Route path="/accesibilidad" element={<Accesibilidad />} />
            <Route path="/prioridades" element={<Prioridades />} />
            <Route path="/participacion" element={<Participacion />} />
            <Route path="/fuentes" element={<Fuentes />} />
            <Route path="/corredor-49" element={<Corredor49 />} />
            <Route path="/problematicas" element={<Problematicas />} />
            <Route path="/datos" element={<Datos />} />
            <Route path="/identidad" element={<Identidad />} />
            <Route path="/radar" element={<Radar />} />
            <Route path="/propuesta" element={<Propuesta />} />
            <Route path="/visita" element={<Visita />} />
            <Route path="/lideres" element={<Lideres />} />
            <Route path="/inmobiliario" element={<Inmobiliario />} />
            <Route path="/riesgo" element={<Riesgo />} />
            <Route path="/barrios" element={<Barrio />} />
            <Route path="/barrios/:codigo" element={<Barrio />} />
            <Route path="*" element={<NoEncontrada />} />
          </Routes>
        </Suspense>
      </Layout>
      <AvisosPWA />
    </HashRouter>
  );
}
