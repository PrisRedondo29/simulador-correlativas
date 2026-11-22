import React from 'react';
import { Link } from 'react-router-dom';
import { usePlanCapabilities } from '../context/PlanContext';

const DATA_INVENTORY = [
    {
        channel: 'Almacenamiento local (localStorage)',
        data: 'Estado de materias, notas numéricas, regularidades, optativas, horarios/eventos/bitácora de Mi Agenda, plan activo y tema visual.',
        purpose: 'Persistir tu simulación y avance en el dispositivo sin requerir registro.',
        retention: 'Permanece en tu navegador hasta que lo borres o reinicies el progreso.',
    },
    {
        channel: 'Importador SAWeb (100% local en el navegador)',
        data: 'Texto o PDF del certificado analítico/cursadas pegado o seleccionado por vos. Nunca pide usuario ni contraseña SAWeb ni se conecta a servidores de la UNLu.',
        purpose: 'Detectar materias aprobadas y regularidades localmente mediante pdfjs-dist. Descarta Nombre, Apellido, DNI y Legajo antes de procesar.',
        retention: 'No se sube ni se almacena en ningún servidor; el archivo/texto se descarta al instante.',
    },
    {
        channel: 'Sincronización opcional en la nube (Firebase Auth + Cloud Firestore)',
        data: 'UID, correo electrónico, nombre y foto de perfil de Google, alias opcional y copia sincronizada de tu progreso académico bajo /users/{uid}.',
        purpose: 'Respaldar y sincronizar tu progreso entre dispositivos cuando elegís iniciar sesión.',
        retention: 'Mientras mantengas tu cuenta; podés solicitar la eliminación y exportar respaldo JSON desde Configuración.',
    },
    {
        channel: 'Métricas de uso y errores técnicos (Firebase Analytics / GA4)',
        data: 'Eventos agregados de navegación y uso de funciones, reportes técnicos de error sanitizados y UID técnico cuando hay sesión activa.',
        purpose: 'Detectar fallas y mejorar funcionalidades. Nunca registra DNI, legajo ni calificaciones individuales.',
        retention: 'Según la política de retención estándar de Google Analytics / Firebase.',
    },
    {
        channel: 'Formulario de contacto (EmailJS)',
        data: 'Nombre, correo de respuesta, mensaje y, de forma opcional (con aviso previo), diagnóstico técnico: UID (o "Invitado"), navegador, sistema operativo, resolución de pantalla, idioma, ruta y fecha.',
        purpose: 'Responder tu consulta y reproducir errores técnicos reportados.',
        retention: 'Solo el tiempo necesario para gestionar la consulta de soporte.',
    },
];

const NORMATIVE_SOURCES = [
    'Res. HCS 260/24 — Aprobación del Plan 17.14, cargas horarias (3374 / 1888 hs) y Anexo VI de equivalencias',
    'Res. HCS 836/24 — Rectificatoria del Anexo VI de equivalencias (código 14031)',
    'Disp. SA 395/24 — Régimen de correlatividades del Plan 17.14',
    'Plan de Transición 2025–2029 (Res. HCS 89/2025) — Cronograma progresivo de dictado 17.13 → 17.14',
    'Reglamento General de Estudios (RGE) UNLu — Vigencia de regularidad (5 cuatrimestres) e intentos de final',
];

export default function Legal() {
    const { policy, tenant } = usePlanCapabilities();
    const institutionShort = tenant?.shortName || 'UNLu';
    const careerName = policy?.carrera || 'Licenciatura en Sistemas de Información';

    return (
        <article className="flex flex-col gap-6 py-6 md:py-8 px-4 sm:px-6 md:px-10 max-w-4xl mx-auto animate-in fade-in duration-300">
            <header className="space-y-2 border-b border-[#E2E8F0] dark:border-[#2A3540] pb-5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#005A36] dark:text-[#86EFAC]">
                    <i className="fa-solid fa-scale-balanced text-[11px]" aria-hidden="true" />
                    Proyecto estudiantil no oficial · {institutionShort} · {careerName}
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
                    Aviso legal y privacidad
                </h1>
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                    Información transparente sobre el alcance orientativo de este simulador y el tratamiento de tus datos conforme a la Ley N° 25.326 de Protección de los Datos Personales (República Argentina).
                </p>
                <p className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                    Última actualización: 22 de noviembre de 2026
                </p>
            </header>

            <nav
                aria-label="Secciones legales"
                className="flex flex-wrap gap-2 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-3"
            >
                <a
                    href="#no-oficial"
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#F8FAFC] dark:bg-[#1E2730] text-[#334155] dark:text-[#CBD5E1] hover:text-[#005A36] dark:hover:text-[#86EFAC] border border-[#E2E8F0] dark:border-[#2A3540]"
                >
                    Proyecto no oficial
                </a>
                <a
                    href="#datos-tratados"
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#F8FAFC] dark:bg-[#1E2730] text-[#334155] dark:text-[#CBD5E1] hover:text-[#005A36] dark:hover:text-[#86EFAC] border border-[#E2E8F0] dark:border-[#2A3540]"
                >
                    Datos tratados
                </a>
                <a
                    href="#saweb-local"
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#F8FAFC] dark:bg-[#1E2730] text-[#334155] dark:text-[#CBD5E1] hover:text-[#005A36] dark:hover:text-[#86EFAC] border border-[#E2E8F0] dark:border-[#2A3540]"
                >
                    SAWeb local
                </a>
                <a
                    href="#derechos-ley-25326"
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#F8FAFC] dark:bg-[#1E2730] text-[#334155] dark:text-[#CBD5E1] hover:text-[#005A36] dark:hover:text-[#86EFAC] border border-[#E2E8F0] dark:border-[#2A3540]"
                >
                    Derechos Ley 25.326
                </a>
                <a
                    href="#fuentes-contacto"
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#F8FAFC] dark:bg-[#1E2730] text-[#334155] dark:text-[#CBD5E1] hover:text-[#005A36] dark:hover:text-[#86EFAC] border border-[#E2E8F0] dark:border-[#2A3540]"
                >
                    Normativa y contacto
                </a>
            </nav>

            <section
                id="no-oficial"
                className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-5 sm:p-6 space-y-3"
            >
                <h2 className="text-base sm:text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                    <i className="fa-solid fa-circle-info text-[#005A36] dark:text-[#86EFAC]" aria-hidden="true" />
                    1. Proyecto estudiantil no oficial
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                    El <strong>Simulador de Correlativas</strong> es un proyecto estudiantil independiente y de código abierto desarrollado por Priscila Redondo para ayudar a estudiantes a planificar su cursada. <strong>No es un portal oficial, sistema administrativo ni publicación institucional de la Universidad Nacional de Luján ({institutionShort}).</strong>
                </p>
                <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                    Todas las equivalencias mostradas, cálculos de transición, proyecciones de egreso y documentos PDF generados tienen carácter estrictamente <strong>orientativo y no vinculante</strong>. En particular, las equivalencias señaladas como pendientes de confirmación requieren verificación administrativa ante Coordinación de Carrera o Secretaría Académica de la {institutionShort}, cuyas resoluciones vigentes prevalecen en todos los casos.
                </p>
                <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                    Asimismo, las referencias o enlaces externos a <strong>CODES++</strong> corresponden a una comunidad estudiantil independiente y no oficial.
                </p>
            </section>

            <section
                id="datos-tratados"
                className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-5 sm:p-6 space-y-3"
            >
                <h2 className="text-base sm:text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                    <i className="fa-solid fa-database text-[#005A36] dark:text-[#86EFAC]" aria-hidden="true" />
                    2. Qué datos trata la aplicación (Ley N° 25.326)
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                    La aplicación aplica un criterio de minimización de datos y funciona por defecto sin cuenta ni envío de información académica a servidores externos. Tus datos jamás se venden ni se ceden con fines comerciales o publicitarios.
                </p>

                <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] dark:border-[#2A3540]">
                    <table className="w-full text-left border-collapse text-xs">
                        <caption className="sr-only">
                            Resumen de datos tratados por la aplicación
                        </caption>
                        <thead className="bg-[#F8FAFC] dark:bg-[#1E2730] text-[#334155] dark:text-[#CBD5E1]">
                            <tr>
                                <th scope="col" className="p-3 font-semibold border-b border-[#E2E8F0] dark:border-[#2A3540]">
                                    Módulo / Canal
                                </th>
                                <th scope="col" className="p-3 font-semibold border-b border-[#E2E8F0] dark:border-[#2A3540]">
                                    Datos tratados
                                </th>
                                <th scope="col" className="p-3 font-semibold border-b border-[#E2E8F0] dark:border-[#2A3540]">
                                    Finalidad
                                </th>
                                <th scope="col" className="p-3 font-semibold border-b border-[#E2E8F0] dark:border-[#2A3540]">
                                    Conservación
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2A3540] text-[#475569] dark:text-[#CBD5E1]">
                            {DATA_INVENTORY.map((row) => (
                                <tr key={row.channel} className="align-top">
                                    <th
                                        scope="row"
                                        className="p-3 font-semibold text-[#1E293B] dark:text-[#F1F5F9] whitespace-normal min-w-[170px]"
                                    >
                                        {row.channel}
                                    </th>
                                    <td className="p-3 leading-relaxed">{row.data}</td>
                                    <td className="p-3 leading-relaxed">{row.purpose}</td>
                                    <td className="p-3 leading-relaxed">{row.retention}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section
                id="saweb-local"
                className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-5 sm:p-6 space-y-2.5"
            >
                <h2 className="text-base sm:text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                    <i className="fa-solid fa-shield-halved text-[#005A36] dark:text-[#86EFAC]" aria-hidden="true" />
                    3. Procesamiento 100% local del Analítico SAWeb
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                    Cuando importás tu analítico desde SAWeb (archivo PDF o texto copiado), la extracción ocurre íntegramente dentro de tu navegador mediante <code>pdfjs-dist</code>. El parser descarta automáticamente líneas identificatorias (Nombre y Apellido, DNI y Legajo), no sube el documento a servidores propios ni de terceros y nunca solicita tus credenciales institucionales.
                </p>
            </section>

            <section
                id="derechos-ley-25326"
                className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-5 sm:p-6 space-y-3"
            >
                <h2 className="text-base sm:text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                    <i className="fa-solid fa-user-shield text-[#005A36] dark:text-[#86EFAC]" aria-hidden="true" />
                    4. Derechos del titular de los datos (Ley N° 25.326)
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                    Como titular de tus datos personales, tenés derecho de <strong>acceso, rectificación, actualización y supresión</strong> (arts. 14 a 16 de la Ley N° 25.326). Podés exportar tu información en JSON desde{' '}
                    <Link to="/configuracion" className="font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline">
                        Configuración
                    </Link>
                    , borrar tus datos locales en el navegador o escribirnos a través de{' '}
                    <Link to="/contacto" className="font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline">
                        Contacto
                    </Link>{' '}
                    o al correo{' '}
                    <a
                        href="mailto:prisredondo29@gmail.com"
                        className="font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline"
                    >
                        prisredondo29@gmail.com
                    </a>
                    .
                </p>
                <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540] p-3.5 text-xs text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                    La{' '}
                    <strong>Agencia de Acceso a la Información Pública (AAIP)</strong>, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales (
                    <a
                        href="https://www.argentina.gob.ar/aaip"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline"
                    >
                        argentina.gob.ar/aaip
                    </a>
                    ).
                </div>
            </section>

            <section
                id="fuentes-contacto"
                className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-5 sm:p-6 space-y-3"
            >
                <h2 className="text-base sm:text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                    <i className="fa-solid fa-book-open text-[#005A36] dark:text-[#86EFAC]" aria-hidden="true" />
                    5. Fuentes normativas consultadas y canales oficiales
                </h2>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1]">
                    {NORMATIVE_SOURCES.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] pt-1">
                    Para trámites académicos oficiales, certificados o consultas administrativas de validez, dirigite siempre al portal institucional{' '}
                    <a
                        href="https://www.unlu.edu.ar/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline"
                    >
                        unlu.edu.ar
                    </a>
                    .
                </p>
            </section>
        </article>
    );
}
