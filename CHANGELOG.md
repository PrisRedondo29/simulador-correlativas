# Changelog

Todos los cambios relevantes de **Simulador de Correlativas UNLu (*Mi Avance Académico UNLu*)** se documentan en este archivo.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y [Semantic Versioning](https://semver.org/lang/es/).

## [2.0.0] - 2026-11-23

### Agregado
- **Importador local de Analítico SAWeb (`pdfjs-dist`):** lectura de PDF/texto en el navegador con descarte automático de Nombre, Apellido, DNI y Legajo, y fusión no destructiva con notas previas.
- **Mi Agenda (`/mi-agenda`):** grilla horaria semanal con detección de superposiciones, calendario de exámenes/entregas con alertas en la barra superior y bitácora por materia.
- **Estadísticas Académicas (`/estadisticas`):** KPIs, promedio general con y sin aplazos, histograma de notas, evolución por cuatrimestre, efectividad en finales y tabla desagregada materia por materia.
- **Motor compartido de equivalencias (`equivalenciasUtils.js`):** soporte `AND/OR` (`anyOf`/`allOf`), distinción `confirmed`/`automatic` vs. `pending_confirmation`/`advisory` y prevención de doble cómputo (`21420` / `21279`).
- **Diplomaturas Intracurriculares en PDF (`diplomaturasUtils.js`):** resumen de progreso de las 6 diplomaturas (Res. HCS 726/24) y hito de Analista Programador/a Universitario/a (`1888 hs`) en planillas PDF vectoriales.
- **Sistema de Novedades (`/novedades` + `WhatsNewModal`)** y **página 404 (`NotFound.jsx`)** con `noindex, nofollow`.
- **Aviso legal y privacidad (`/legal`):** transparencia conforme Ley N° 25.326, marca estudiantil no oficial, consentimiento explícito opt-in para **PostHog Cloud EU** (sin Autocapture, Session Replay ni Heatmaps), medición de tiempo activo estimado y eliminación integral de cuenta (reautenticación Google + Firestore + Firebase Auth).
- **App instalable (PWA):** soporte de instalación en PC/celular, actualización diferida segura (`PwaUpdatePrompt`) y caché progresivo (`runtimeCaching`) para chunks de exportación/PDF.

### Cambiado
- **Simulador de Avance v2:** incorporación de materias en estado `Cursando` en el cuatrimestre actual sin consolidarlas ni duplicarlas, simulación híbrida `17.13 → 17.14` y vista de malla/grafo mejorada.
- **Sincronización transaccional (`syncStateMachine.js`, `dbService.js`):** control optimista `syncRevision`, detección de conflictos, copias de recuperación locales, exportación/importación JSON y saneamiento automático de configuraciones legacy en Firestore.
- **Migración de Analytics:** reemplazo completo de Firebase Analytics/GA4 por **PostHog Cloud EU** detrás de fachada centralizada Zero-PII y exclusión estricta de entornos de test (`VITEST`).
- **Centro de Ayuda y FAQ:** ampliación integral de `FAQSection.jsx` por categorías cubriendo SAWeb, Mi Agenda, Estadísticas, Simulador, Planes, PDF, PWA, Sincronización y Privacidad.

### Corregido
- Correcciones normativas del Plan `17.14` y transición `17.13 → 17.14`: `11419 → 14031` (Res. HCS 836/24), `21240 → 21420`, exclusión de `14028` del título intermedio APU (`1888 hs`), `14026 = 8 h/sem`, diferencia nominal `218 hs` vs. ahorro individual real, regularidad de `5 cuatrimestres` y enlace al RGE oficial.
- Recuperación ante eliminación parcial de cuenta (`firestore_deleted_auth_pending`) evitando recrear el documento en Firestore al recargar o reautenticar.
- Corrección de textos en `ServerError.jsx` para reflejar guardado local y sincronización manual.

### Eliminado
- Retiro de botones, modal (`GuardarSimulacion.jsx`), hook (`cargarSimulacionGuardada`) y textos obsoletos de guardado manual de simulaciones, manteniendo compatibilidad del campo `simulaciones` en sincronización para datos históricos.
- Eliminación de la opción de sesión de 24 horas en `LoginModal` y de `@firebase/analytics`.
