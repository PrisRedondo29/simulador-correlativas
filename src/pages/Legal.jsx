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
        data: 'Identificador de cuenta, correo electrónico, nombre y foto de perfil de Google, alias opcional y copia sincronizada de tu progreso académico asociada a tu cuenta.',
        purpose: 'Respaldar y sincronizar tu progreso entre dispositivos cuando elegís iniciar sesión.',
        retention: 'Mientras mantengas tu cuenta; podés exportarla en JSON o eliminar tu cuenta y datos en la nube directamente desde Configuración.',
    },
    {
        channel: 'Métricas de uso opcionales (PostHog Cloud EU)',
        data: 'Solo si aceptás explícitamente (opt-in): eventos agregados de uso de funciones, tiempo activo estimado, identificador de navegador consentido (distinct_id) y UID técnico si iniciás sesión con Google. Sin Session Replay, sin autocaptura, sin notas, DNI ni legajo.',
        purpose: 'Comprender qué herramientas ayudan más, detectar errores y mejorar la experiencia del simulador.',
        retention: 'Procesado en servidores de PostHog Cloud (Unión Europea). Podés revocar el consentimiento en cualquier momento desde Configuración.',
    },
    {
        channel: 'Respaldos exportados manualmente (JSON)',
        data: 'Copia portable de tu progreso, notas, regularidades y Mi Agenda descargada a tu dispositivo.',
        purpose: 'Conservar un respaldo bajo tu exclusiva custodia o migrarlo manualmente.',
        retention: 'Bajo tu control directo en tu dispositivo; la app no almacena copias en servidores.',
    },
    {
        channel: 'Formulario de contacto (EmailJS)',
        data: 'Nombre, correo de respuesta, mensaje y, de forma opcional (con aviso previo), diagnóstico técnico: UID (o "Invitado"), navegador, sistema operativo, resolución de pantalla, idioma, ruta y fecha.',
        purpose: 'Responder tu consulta y reproducir errores técnicos reportados.',
        retention: 'Solo el tiempo necesario para gestionar la consulta de soporte.',
    },
];

const NORMATIVE_SOURCES = [
    {
        code: 'Res. HCS 260/24',
        title: 'Res. HCS 260/24',
        description: 'Aprobación del Plan 17.14, cargas horarias (3374 / 1888 hs) y Anexo VI de equivalencias',
        url: 'https://www.planesdeestudio.unlu.edu.ar/sites/www.planesdeestudio.unlu.edu.ar/files/site/3141a825-2bd3-4770-b55a-f7ee9b66b8c8_0.pdf',
        linkLabel: 'Ver PDF oficial',
    },
    {
        code: 'Res. HCS 836/24',
        title: 'Res. HCS 836/24',
        description: 'Rectificatoria del Anexo VI de equivalencias (código 14031)',
        url: 'https://www.planesdeestudio.unlu.edu.ar/sites/www.planesdeestudio.unlu.edu.ar/files/site/17-SCAN/RES%20HCS%20836-24.pdf',
        linkLabel: 'Ver PDF oficial',
    },
    {
        code: 'Disp. SA 395/24',
        title: 'Disp. SA 395/24',
        description: 'Régimen de correlatividades del Plan 17.14',
        url: 'https://www.planesdeestudio.unlu.edu.ar/sites/www.planesdeestudio.unlu.edu.ar/files/site/adbe75eb-5477-4537-924b-02fad84ebe7e.pdf',
        linkLabel: 'Ver PDF oficial',
    },
    {
        code: 'Res. HCS 726/24',
        title: 'Res. HCS 726/24',
        description: 'Diplomaturas Intracurriculares del Plan 17.14',
        url: 'https://www.planesdeestudio.unlu.edu.ar/sites/www.planesdeestudio.unlu.edu.ar/files/site/17-SCAN/RES%20HCS%20726-24.pdf',
        linkLabel: 'Ver PDF oficial',
    },
    {
        code: 'Res. HCS 89/2025',
        title: 'Plan de Transición 2025–2029 (Res. HCS 89/2025)',
        description: 'Cronograma progresivo de dictado 17.13 → 17.14',
        url: 'https://www.planesdeestudio.unlu.edu.ar/?q=node/32',
        linkLabel: 'Índice Planes de Estudio',
    },
    {
        code: 'RGE UNLu',
        title: 'Régimen General de Estudios (RGE) UNLu',
        description: 'Vigencia de regularidad (5 cuatrimestres) e intentos de final',
        url: 'https://www.unlu.edu.ar/regimen.html',
        linkLabel: 'Ver página oficial',
    },
];

const OFFICIAL_PORTAL_LINKS = [
    {
        label: 'División Planes de Estudio (LSI)',
        url: 'https://www.planesdeestudio.unlu.edu.ar/?q=node/32',
    },
    {
        label: 'Ficha oficial Plan 17.14',
        url: 'https://www.unlu.edu.ar/carg-sistemas.html',
    },
    {
        label: 'Ficha oficial Plan 17.13',
        url: 'https://www.unlu.edu.ar/carg-sistemas-1713.html',
    },
];

const LEGAL_ANCHORS = [
    { href: '#no-oficial', label: 'Proyecto no oficial' },
    { href: '#datos-tratados', label: 'Datos tratados' },
    { href: '#saweb-local', label: 'SAWeb local' },
    { href: '#derechos-ley-25326', label: 'Derechos Ley 25.326' },
    { href: '#fuentes-contacto', label: 'Normativa y contacto' },
];

export default function Legal() {
    const { policy, tenant } = usePlanCapabilities();
    const institutionShort = tenant?.shortName || 'UNLu';
    const careerName = policy?.carrera || 'Licenciatura en Sistemas de Información';

    return (
        <article className="flex flex-col gap-6 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
            <header className="space-y-2 border-b border-[#E2E8F0] dark:border-[#2A3540] pb-5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#005A36] dark:text-[#86EFAC]">
                    <i className="fa-solid fa-scale-balanced text-[11px]" aria-hidden="true" />
                    Proyecto estudiantil no oficial · {institutionShort} · {careerName}
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
                    Aviso legal y privacidad
                </h1>
                <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] max-w-3xl leading-relaxed">
                    Información transparente sobre el alcance orientativo de este simulador y el tratamiento de tus datos conforme a la Ley N° 25.326 de Protección de los Datos Personales (República Argentina).
                </p>
                <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                    Última actualización: 23 de noviembre de 2026
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <aside className="lg:col-span-3 lg:sticky lg:top-20">
                    <nav
                        aria-label="Secciones legales"
                        className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-3.5 lg:p-4 space-y-3"
                    >
                        <p className="hidden lg:block text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] px-1">
                            En esta página
                        </p>
                        <div className="flex flex-wrap lg:flex-col gap-2 lg:gap-1">
                            {LEGAL_ANCHORS.map((item) => (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    className="px-3 py-1.5 lg:py-2 rounded-xl text-xs font-medium bg-[#F8FAFC] dark:bg-[#1E2730] lg:bg-transparent lg:dark:bg-transparent text-[#334155] dark:text-[#CBD5E1] hover:bg-[#ECFDF5]/70 dark:hover:bg-[#102A20]/60 hover:text-[#005A36] dark:hover:text-[#86EFAC] border border-[#E2E8F0] dark:border-[#2A3540] lg:border-transparent lg:dark:border-transparent transition-colors"
                                >
                                    {item.label}
                                </a>
                            ))}
                        </div>

                        <div className="hidden lg:block pt-3 border-t border-[#E2E8F0] dark:border-[#2A3540] space-y-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
                            <p className="font-semibold text-[#334155] dark:text-[#CBD5E1]">
                                En síntesis
                            </p>
                            <ul className="space-y-1.5 leading-snug">
                                <li className="flex items-start gap-2">
                                    <i className="fa-solid fa-check text-[#005A36] dark:text-[#6EE7B7] mt-0.5 text-[10px]" aria-hidden="true" />
                                    <span>Uso local sin cuenta obligatoria</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <i className="fa-solid fa-check text-[#005A36] dark:text-[#6EE7B7] mt-0.5 text-[10px]" aria-hidden="true" />
                                    <span>Analítico SAWeb 100% en navegador</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <i className="fa-solid fa-check text-[#005A36] dark:text-[#6EE7B7] mt-0.5 text-[10px]" aria-hidden="true" />
                                    <span>Ley N° 25.326 (Argentina)</span>
                                </li>
                            </ul>
                        </div>
                    </nav>
                </aside>

                <div className="lg:col-span-9 flex flex-col gap-6 min-w-0">
                    <section
                        id="no-oficial"
                        className="scroll-mt-20 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-5 sm:p-6 lg:p-7 space-y-3"
                    >
                        <h2 className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                            <i className="fa-solid fa-circle-info text-[#005A36] dark:text-[#86EFAC]" aria-hidden="true" />
                            1. Proyecto estudiantil no oficial
                        </h2>
                        <p className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                            El <strong>Simulador de Correlativas</strong> es un proyecto estudiantil independiente y de código abierto desarrollado por Priscila Redondo para ayudar a estudiantes a planificar su cursada. <strong>No es un portal oficial, sistema administrativo ni publicación institucional de la Universidad Nacional de Luján ({institutionShort}).</strong>
                        </p>
                        <p className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                            Todas las equivalencias mostradas, cálculos de transición, proyecciones de egreso y documentos PDF generados tienen carácter estrictamente <strong>orientativo y no vinculante</strong>. En particular, las equivalencias señaladas como pendientes de confirmación requieren verificación administrativa ante Coordinación de Carrera o Secretaría Académica de la {institutionShort}, cuyas resoluciones vigentes prevalecen en todos los casos.
                        </p>
                        <p className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                            Asimismo, las referencias o enlaces externos a <strong>CODES++</strong> corresponden a una comunidad estudiantil independiente y no oficial.
                        </p>
                    </section>

                    <section
                        id="datos-tratados"
                        className="scroll-mt-20 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-5 sm:p-6 lg:p-7 space-y-3"
                    >
                        <h2 className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                            <i className="fa-solid fa-database text-[#005A36] dark:text-[#86EFAC]" aria-hidden="true" />
                            2. Qué datos trata la aplicación (Ley N° 25.326)
                        </h2>
                        <p className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                            La aplicación aplica un criterio de minimización de datos y funciona por defecto sin cuenta ni envío de información académica a servidores externos. Tus datos jamás se venden ni se ceden con fines comerciales o publicitarios.
                        </p>

                        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] dark:border-[#2A3540]">
                            <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                <caption className="sr-only">
                                    Resumen de datos tratados por la aplicación
                                </caption>
                                <thead className="bg-[#F8FAFC] dark:bg-[#1E2730] text-[#334155] dark:text-[#CBD5E1]">
                                    <tr>
                                        <th scope="col" className="p-3.5 font-semibold border-b border-[#E2E8F0] dark:border-[#2A3540]">
                                            Módulo / Canal
                                        </th>
                                        <th scope="col" className="p-3.5 font-semibold border-b border-[#E2E8F0] dark:border-[#2A3540]">
                                            Datos tratados
                                        </th>
                                        <th scope="col" className="p-3.5 font-semibold border-b border-[#E2E8F0] dark:border-[#2A3540]">
                                            Finalidad
                                        </th>
                                        <th scope="col" className="p-3.5 font-semibold border-b border-[#E2E8F0] dark:border-[#2A3540]">
                                            Conservación
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2A3540] text-[#475569] dark:text-[#CBD5E1]">
                                    {DATA_INVENTORY.map((row) => (
                                        <tr key={row.channel} className="align-top">
                                            <th
                                                scope="row"
                                                className="p-3.5 font-semibold text-[#1E293B] dark:text-[#F1F5F9] whitespace-normal min-w-[180px]"
                                            >
                                                {row.channel}
                                            </th>
                                            <td className="p-3.5 leading-relaxed">{row.data}</td>
                                            <td className="p-3.5 leading-relaxed">{row.purpose}</td>
                                            <td className="p-3.5 leading-relaxed">{row.retention}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section
                        id="saweb-local"
                        className="scroll-mt-20 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-5 sm:p-6 lg:p-7 space-y-2.5"
                    >
                        <h2 className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                            <i className="fa-solid fa-shield-halved text-[#005A36] dark:text-[#86EFAC]" aria-hidden="true" />
                            3. Procesamiento 100% local del Analítico SAWeb
                        </h2>
                        <p className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                            Cuando importás tu analítico desde SAWeb (archivo PDF o texto copiado), la extracción ocurre íntegramente dentro de tu navegador mediante <code>pdfjs-dist</code>. El parser descarta automáticamente líneas identificatorias (Nombre y Apellido, DNI y Legajo), no sube el documento a servidores propios ni de terceros y nunca solicita tus credenciales institucionales.
                        </p>
                    </section>

                    <section
                        id="derechos-ley-25326"
                        className="scroll-mt-20 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-5 sm:p-6 lg:p-7 space-y-3"
                    >
                        <h2 className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                            <i className="fa-solid fa-user-shield text-[#005A36] dark:text-[#86EFAC]" aria-hidden="true" />
                            4. Derechos del titular de los datos (Ley N° 25.326)
                        </h2>
                        <p className="text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                            Como titular de tus datos personales, tenés derecho de <strong>acceso, rectificación, actualización y supresión</strong> (arts. 14 a 16 de la Ley N° 25.326). Desde{' '}
                            <Link to="/configuracion" className="font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline">
                                Configuración
                            </Link>{' '}
                            podés exportar tu respaldo en JSON, activar o revocar el consentimiento de métricas en PostHog, borrar tus datos locales o eliminar definitivamente tu cuenta de Google y tus datos sincronizados en Cloud Firestore (previa reautenticación).
                        </p>
                        <div className="rounded-xl bg-[#FFFBEB] dark:bg-[#2D2210] border border-[#FDE68A] dark:border-[#5C4318] p-3.5 text-xs sm:text-sm text-[#92400E] dark:text-[#FCD34D] leading-relaxed space-y-1.5">
                            <p className="font-semibold">
                                Alcance y límites de la eliminación en analítica (PostHog Cloud EU)
                            </p>
                            <p>
                                Dar de baja tu cuenta de Firebase Auth y Cloud Firestore <strong>no elimina automáticamente</strong> los eventos agregados históricos ya enviados a PostHog mientras el consentimiento estuvo activo. Al cerrar sesión, revocar el consentimiento o borrar tu cuenta, el navegador ejecuta <code>posthog.reset()</code> y limpia los identificadores locales para desvincular futuras visitas. Si deseás solicitar la supresión de los registros asociados a tu cuenta en PostHog, escribinos desde tu correo de Google vinculado a{' '}
                                <a
                                    href="mailto:prisredondo29@gmail.com?subject=Supresi%C3%B3n%20de%20datos%20anal%C3%ADticos%20PostHog"
                                    className="font-semibold underline"
                                >
                                    prisredondo29@gmail.com
                                </a>{' '}
                                o a través de{' '}
                                <Link to="/contacto" className="font-semibold underline">
                                    Contacto
                                </Link>
                                .
                            </p>
                        </div>
                        <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540] p-3.5 text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
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
                        className="scroll-mt-20 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-5 sm:p-6 lg:p-7 space-y-4"
                    >
                        <h2 className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] flex items-center gap-2">
                            <i className="fa-solid fa-book-open text-[#005A36] dark:text-[#86EFAC]" aria-hidden="true" />
                            5. Fuentes normativas consultadas y canales oficiales
                        </h2>
                        <ul className="divide-y divide-[#E2E8F0] dark:divide-[#2A3540] rounded-xl border border-[#E2E8F0] dark:border-[#2A3540] bg-[#F8FAFC]/60 dark:bg-[#1E2730]/40">
                            {NORMATIVE_SOURCES.map((item) => (
                                <li
                                    key={item.code}
                                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-[#475569] dark:text-[#CBD5E1]"
                                >
                                    <div className="min-w-0">
                                        <span className="font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                                            {item.title}
                                        </span>
                                        <span className="text-[#64748B] dark:text-[#94A3B8]">
                                            {' '}— {item.description}
                                        </span>
                                    </div>
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline shrink-0"
                                    >
                                        <span>{item.linkLabel}</span>
                                        <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" aria-hidden="true" />
                                    </a>
                                </li>
                            ))}
                        </ul>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                                Portales oficiales de la carrera:
                            </span>
                            {OFFICIAL_PORTAL_LINKS.map((portal) => (
                                <a
                                    key={portal.url}
                                    href={portal.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#6EE7B7] border border-[#A7F3D0] dark:border-[#1E4D38] hover:underline"
                                >
                                    <span>{portal.label}</span>
                                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" aria-hidden="true" />
                                </a>
                            ))}
                        </div>

                        <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] pt-1">
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
                </div>
            </div>
        </article>
    );
}
