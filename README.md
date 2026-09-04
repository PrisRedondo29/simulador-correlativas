# 🎓 Simulador de Plan de Estudios y Correlatividades — UNLu

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![HeroUI](https://img.shields.io/badge/HeroUI-2.8-000000?style=for-the-badge&logo=nextui&logoColor=white)](https://heroui.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

> **Plataforma web interactiva para la gestión, simulación predictiva y visualización de trayectorias académicas basada en Grafos Acíclicos Dirigidos (DAG).**

Diseñada inicialmente para la carrera de **Licenciatura en Sistemas de Información** (Planes 17.13 y 17.14) de la **Universidad Nacional de Luján (UNLu)**, con una arquitectura de datos desacoplada y escalable a otras carreras universitarias.

---

## 📌 ¿Por qué nace este proyecto?

Planificar una carrera universitaria suele ser complejo: los planes de estudio en PDF estáticos dificultan entender qué materias se habilitan al regularizar o rendir un final, qué impacto tiene desaprobar una materia en el camino crítico de graduación o cómo afecta una transición institucional entre planes de estudio.

Este proyecto transforma un plan de estudios estático en un **Sistema de Soporte a la Toma de Decisiones (Decision Support System - DSS)**: un "GPS académico" que calcula dependencias en tiempo real, proyecta escenarios futuros de cursada y guía al estudiante con total claridad.

---

## 🚀 Módulos y Funcionalidades Principales

### 1. 🧭 Simulador Predictivo de Cursada
* **Proyección temporal cuatrimestre a cuatrimestre:** Permite simular qué materias cursar y aprobar a futuro, estimando la fecha de graduación y la obtención del **Título Intermedio (Analista Universitario en Sistemas)**.
* **Múltiples vistas interactivas:** Vista de **Malla Curricular**, vista de **Grafo de Red** y vista de **Lista detallada**.
* **Gestión de cupos y restricciones:** Validación de carga horaria máxima y correlatividades requeridas por cuatrimestre.

### 2. 🔄 Motor de Transición de Planes y Equivalencias
* **Homologación automática:** Evalúa el avance actual en el Plan 17.13 y proyecta la equivalencia directa e indirecta en el nuevo Plan 17.14 (según la **Resolución HCS N° 89/2025**).
* **Análisis de impacto:** Muestra materias acreditadas automáticamente, materias con integración curricular pendiente y materias nuevas a cursar.

### 3. 🕸️ Red de Materias (Visualizador de Grafos)
* **Visualización topológica interactiva:** Construida con `@xyflow/react` (React Flow), permite navegar el mapa completo de la carrera con zoom, paneo y resaltado dinámico de dependencias directas e indirectas (aristas de entrada y salida).

### 4. 📊 Gestión Integral del Progreso Académico
* **Control de estados en tiempo real:** *Pendiente*, *Cursando*, *Regular*, *Aprobada* (con registro de notas y fechas).
* **Métricas y analítica:** Cálculo automático de promedio con/sin aplazos, porcentaje de avance de la carrera y horas acumuladas.

### 5. ☁️ Sincronización en la Nube y Exportación de Reportes
* **Autenticación y guardado:** Soporte para modo invitado (almacenamiento local en `localStorage`) y sincronización en la nube con **Firebase Auth** y **Cloud Firestore**.
* **Exportación profesional:** Generación de reportes y mapas de simulación en formato **PDF** e importación/exportación de copias de seguridad en formato **JSON**.

---

## 🧠 Arquitectura Técnica y Desafíos de Ingeniería

### 1. Modelado con Grafos Acíclicos Dirigidos (DAG)
El régimen de correlatividades universitarias se modela formalmente como un **Grafo Acíclico Dirigido (DAG)**, donde:
* Cada **nodo** $V$ es una asignatura con metadatos (código, año, cuatrimestre, carga horaria semanal/total, condición de optativa o tesis).
* Cada **arista dirigida** $E = (u, v)$ representa una restricción de precedencia (la materia $u$ es prerrequisito para habilitar $v$).

### 2. Motor de Propagación en Cascada y Resolución de Dependencias
Al modificar el estado de una materia, el sistema ejecuta algoritmos recursivos de propagación:
* **Habilitación / Desbloqueo:** Evalúa si el conjunto de prerrequisitos de los nodos adyacentes se satisface para transicionar su estado a *Disponible*.
* **Bloqueo en Cascada:** Si una materia aprobada o regular se revierte a pendiente, el sistema rastrea recursivamente todos los nodos descendientes dependientes y bloquea los estados incompatibles.
* **Inmutabilidad y Rendimiento:** Se implementó un patrón de **borrador mutable en memoria** que recopila todas las mutaciones en un único paso antes de invocar un único `setState` en React, evitando re-renderizados innecesarios y condiciones de carrera.

### 3. Transformación y Mapeo Inter-Grafos
El motor de equivalencias implementa un sistema de reglas de transformación que mapea subgrafos del Plan 17.13 hacia el Plan 17.14:
* Mapeos $1 \to 1$ (equivalencia directa).
* Mapeos $N \to 1$ (requiere múltiples materias del plan origen para acreditar una del plan destino).
* Mapeos condicionales y materias optativas/talleres.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend Core** | [React 19](https://react.dev/), [Vite 7](https://vitejs.dev/) |
| **Lenguajes** | JavaScript (ESModules), HTML5, CSS3 |
| **Estilos & UI Kit** | [Tailwind CSS v4](https://tailwindcss.com/), [HeroUI (v2.8)](https://heroui.com/), [Lucide Icons](https://lucide.dev/), FontAwesome |
| **Animaciones & Visualización** | [Framer Motion](https://www.framer.com/motion/), [@xyflow/react (React Flow)](https://reactflow.dev/), React Zoom Pan Pinch |
| **Backend as a Service (BaaS)** | [Firebase](https://firebase.google.com/) (Authentication & Cloud Firestore) |
| **Generación de Reportes** | [jsPDF](https://github.com/parallax/jsPDF), [html2canvas](https://html2canvas.hertzen.com/), html-to-image |
| **Comunicación & Feedback** | EmailJS |

---

## 📁 Estructura del Proyecto

```text
simulador-correlativas/
├── src/
│   ├── components/       # Componentes modulares (Simulador, Progreso, Equivalencias, Auth, UI)
│   ├── context/          # Contextos globales de React (Auth, Tema, Estado)
│   ├── data/             # Planes de estudio y reglas de equivalencias en JSON desacoplado
│   │   ├── sistemas.json     # Catálogo de materias de Lic. en Sistemas (Planes 17.13 y 17.14)
│   │   ├── equivalencias.json# Mapeo de reglas de homologación inter-plan
│   │   └── optativasData.json# Catálogo de materias optativas
│   ├── hooks/            # Custom hooks para lógica desacoplada (useSimulador, usePlanData, etc.)
│   ├── pages/            # Vistas principales (Simulador, Progreso, RedDeMaterias, Transición, etc.)
│   ├── services/         # Servicios de integración con Firebase, Storage y Analytics
│   └── utils/            # Algoritmos puros (resolución de DAG, proyecciones, cálculos de promedio)
├── public/               # Recursos estáticos
├── package.json          # Dependencias y scripts del proyecto
└── vite.config.js        # Configuración del empaquetador Vite
```

---

## ⚙️ Instalación y Ejecución Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/PrisRedondo29/simulador-correlativas.git
   cd simulador-correlativas
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Crea un archivo `.env` en la raíz del proyecto tomando como referencia las credenciales de tu proyecto de Firebase:
   ```env
   VITE_FIREBASE_API_KEY=tu_api_key
   VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
   VITE_FIREBASE_PROJECT_ID=tu_project_id
   VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
   VITE_FIREBASE_APP_ID=tu_app_id
   ```

4. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:5173](http://localhost:5173) en tu navegador para ver la aplicación.

---

## 🌟 Extensibilidad a Nuevas Carreras

El diseño de la aplicación desacopla completamente el motor algorítmico de los datos académicos. Para incorporar una nueva carrera (por ejemplo, *Ingeniería Civil* o *Licenciatura en Administración*):

1. Crear un archivo JSON en `src/data/nombre_carrera.json` siguiendo el esquema estándar (`codigo`, `nombre`, `anio`, `cuatrimestre`, `correlativas`, `horas`).
2. Registrar la carrera en `src/data/plansData.js`.
3. El motor de grafos, las vistas y los algoritmos de simulación se adaptarán automáticamente sin requerir cambios en el core de la lógica.

---

## 👩‍💻 Autora & Créditos

Desarrollado con dedicación por **Priscila Redondo** para la comunidad universitaria de la **Universidad Nacional de Luján (UNLu)**.
