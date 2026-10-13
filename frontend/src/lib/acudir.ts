/**
 * Directorio de a quién acudir. Solo lleva datos que se confirmaron en páginas oficiales (Alcaldía de Medellín);
 * donde no hay un contacto publicado, lo dice en lugar de inventarlo.
 */
export type Entrada = { quien: string; para: string; como: string; donde?: string; url?: string };
export type GrupoAcudir = { titulo: string; entradas: Entrada[] };

const ALCALDIA = "https://www.medellin.gov.co";
const VIA = "Mande la carta por la Línea Única o el formulario PQRSD de la Alcaldía, dirigida a la secretaría.";

export const DIRECTORIO: GrupoAcudir[] = [
  {
    titulo: "Para pedir o reclamar",
    entradas: [
      {
        quien: "Línea Única de Atención a la Ciudadanía (Alcaldía)",
        para: "El primer lugar si no sabe a quién le toca. Recibe peticiones, quejas y reclamos de cualquier secretaría.",
        como: "Llamar al 604 44 44 144, escribir al WhatsApp 301 604 44 44 o al correo atencion.ciudadana@medellin.gov.co. También hay formulario PQRSD en la página.",
        donde: "Centro Administrativo La Alpujarra, calle 44 # 52-165",
        url: ALCALDIA,
      },
      { quien: "Secretaría de Infraestructura Física", para: "Andenes, vías y obras públicas del barrio.", como: VIA},
      { quien: "Secretaría de Movilidad", para: "Seguridad vial, cruces, señalización y rutas de bus.", como: VIA},
      { quien: "Departamento Administrativo de Planeación", para: "El POT, los proyectos de espacio público y los parques.", como: VIA},
      {
        quien: "DAGRD, Gestión del Riesgo de Desastres",
        para: "Zonas de ladera, amenaza y obras de mitigación. Para una emergencia ya en curso llame al 123.",
        como: "Por la Línea Única o el formulario PQRSD de la Alcaldía.",
        url: "https://www.medellin.gov.co/es/dagrd/",
      },
      {
        quien: "Subsecretaría de Planeación Local y Presupuesto Participativo",
        para: "Cómo funciona el Presupuesto Participativo, el Consejo Comunal de Planeación y las fechas de cada fase.",
        como: "Consultar la página oficial o preguntar en la Línea Única. Las fechas cambian cada año.",
        url: "https://www.medellin.gov.co/es/secretaria-participacion-ciudadana/subsecretaria-de-planeacion-local-y-presupuesto-participativo/",
      },
    ],
  },
  {
    titulo: "Si no le responden o le niegan lo que pidió",
    entradas: [
      {
        quien: "Personería de Medellín",
        para: "Vigila a la administración y defiende los derechos de la gente. Orienta si una entidad no responde y ayuda a inscribir una veeduría ciudadana (Ley 850 de 2003).",
        como: "Llevar la copia de la petición con su fecha de radicado.",
        url: "https://www.personeriamedellin.gov.co",
      },
      {
        quien: "Tutela",
        para: "Si la entidad deja pasar el plazo sin contestar, la tutela protege el derecho de petición.",
        como: "Se presenta ante cualquier juez y no necesita abogado. Pida orientación en la Personería antes.",
      },
      {
        quien: "Contraloría General de Medellín",
        para: "Cuando el problema es el manejo del dinero público en una obra.",
        como: "Presentar la denuncia con datos de la obra y el contrato si los tiene.",
        url: "https://www.contraloriamedellin.gov.co",
      },
    ],
  },
  {
    titulo: "Metro y emergencias",
    entradas: [
      { quien: "Metro de Medellín", para: "Estaciones, Metrocable y acceso peatonal a ellos.", como: "Por los canales de atención de su página.", url: "https://www.metrodemedellin.gov.co" },
      { quien: "Emergencias: 123", para: "Una emergencia en curso. Los bomberos atienden a toda hora.", como: "Llamar al 123." },
      { quien: "SIATA", para: "Alertas de lluvia y crecientes en tiempo real.", como: "Mirar la página o la aplicación.", url: "https://siata.gov.co" },
    ],
  },
  {
    titulo: "Dentro de la comuna",
    entradas: [
      {
        quien: "Junta Administradora Local (JAL)",
        para: "Los ediles son elegidos por voto y llevan los temas de la comuna ante la Alcaldía.",
        como: "Pedir un espacio en una sesión. La sede y los horarios se preguntan en la Línea Única: no hay un contacto publicado que se haya podido confirmar.",
      },
      {
        quien: "Consejo Comunal de Planeación",
        para: "Representa a la comuna en la planeación local y en el Presupuesto Participativo.",
        como: "Preguntar en la Subsecretaría cómo se elige y cuándo sesiona en la Comuna 2.",
        url: "https://www.medellin.gov.co/es/secretaria-participacion-ciudadana/subsecretaria-de-planeacion-local-y-presupuesto-participativo/",
      },
    ],
  },
];
