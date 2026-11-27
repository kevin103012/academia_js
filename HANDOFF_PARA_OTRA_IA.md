# Handoff Técnico Completo — Junior’s Sparks (para continuación por otra IA)

> **Estado actualizado al 27 de noviembre de 2026.** Ver [Estado de Junior’s Sparks](docs/ESTADO_DEL_CAMPUS.md) para la implementación, las pruebas y la activación pendiente en Supabase. Los apartados siguientes conservan el contexto histórico de la entrega anterior.

---

## 1. Arquitectura General y Stack

- **Ruta del proyecto React:** `Junior's Sparks/` (carpeta interna que contiene `package.json`, `.env`, `src/`).
- **Stack (`package.json`):**
  - `react` `^19.2.0`, `react-dom` `^19.2.0`
  - `typescript` `~5.9.3` (`strict`, `verbatimModuleSyntax: true`)
  - `vite` `^7.2.2`, `react-router` `^7.18.6`
  - `tailwindcss` `^4.1.17` (`@tailwindcss/vite`), `lucide-react` `^0.545.0`
  - `@supabase/supabase-js` `^2.119.2`
- **Decisión de arquitectura:** **100% React + Supabase** (sin backend Node/NestJS intermedio). Toda persistencia opera vía `@supabase/supabase-js` + caché local en `localStore`.
- **Supabase conectado:**
  - **Project ID / Ref:** `wozahbsyjopfremwrmvg` (`Junior's Sparks`, región `us-west-2`)
  - **URL:** `https://wozahbsyjopfremwrmvg.supabase.co`
  - **Configuración cliente:** `.env` define `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con `VITE_API_URL=` vacío.
  - **ATENCIÓN CRÍTICA (`src/config/env.ts`):**
    - `env.hasSupabase` es `true` porque ambas variables están presentes.
    - **`env.useMocks` es `!this.apiUrl && !this.hasSupabase`, por lo tanto devuelve `false`.**
    - **Nunca uses `env.useMocks ? localService : httpService`** en ningún servicio nuevo o existente: cuando `hasSupabase === true` y `apiUrl === ''`, `env.useMocks` manda el tráfico a `httpService` (provocando `404` contra Vite). Usa siempre `env.hasSupabase ? supabaseService : env.apiUrl ? httpService : localService`. (Nota: `src/services/tutor/tutorService.ts` en su línea 122 todavía usa `env.useMocks`; debe migrarse a Supabase en Fase 4).

---

## 2. Esquema Actual en Supabase (`public`)

Todas las tablas ya existen en Postgres con RLS habilitado y políticas SPA configuradas:

1. **Identidad, Accesos y Perfiles:** `profiles`, `access_requests`
2. **Académico y Cursos:** `academic_periods`, `courses`, `course_schedules`, `course_lessons`, `course_enrollments`, `course_attendance`
3. **Actividades:** `course_activities`, `activity_submissions`
4. **IA y Tutor:** `ai_models`, `ai_guardrails`, `tutor_sessions`, `tutor_messages`
5. **Comunidad, Mensajería, Agenda y Avisos:** `community_groups`, `community_memberships`, `community_messages`, `direct_threads`, `direct_messages`, `calendar_events`, `notices`
6. **Personalización y Auditoría:** `custom_themes`, `audit_logs`
7. **Funciones RPC en `public`:**
   - `authenticate_campus_user`
   - `submit_access_request`
   - `approve_access_request`
   - `reject_access_request`

**Precauciones importantes de esquema verificadas:**
- En `public.courses`: `category` tiene `CHECK` estricto (`'matematica' | 'hardware' | 'frameworks' | 'algoritmos'`) y `period_id` es `FOREIGN KEY` hacia `academic_periods(id)`.
- En `public.course_lessons`: `video_url`, `video_title`, `video_duration_sec`, `reading`, `theory_blocks`, `exercise`, `key_steps` y `questions` son **`NOT NULL`**. Nunca enviar `null` en `video_url` ni `video_title` (enviar `''`).
- En `public.course_attendance`: existe `UNIQUE (course_id, student_id, session_date)` y `status` permite `'Presente' | 'Tardanza' | 'Ausente' | 'Justificada'`.
- Cualquier llamada a `supabase.from(...).upsert(...)` dentro de `Promise.all(tasks)` **no lanza excepción** cuando Postgres devuelve error 400; siempre inspeccionar `res.error` en cada respuesta.

---

## 3. Reglas Obligatorias de Diseño Visual y Formularios

Seguir estrictamente estas reglas en todo módulo nuevo o rediseñado:

1. **Cero espacio horizontal muerto:** Ningún formulario o panel principal se limita a `max-width: 760px` dejando huecos vacíos a la derecha. Todo contenedor raíz dentro de `.p-main-content` usa el 100% del ancho disponible (`padding: 30px clamp(10px, 1.3vw, 18px) 38px`).
2. **Formularios en 2 Zonas (`.p-form-workbench` en `src/styles/portal.css`):**
   - Columna izquierda (`1.35fr`): metadatos agrupados en `.p-form-row`, `.p-form-row-asymmetric` o `.p-form-grid-3`.
   - Columna derecha (`1fr` con `.p-form-col--stretch` + `.p-form-label-grow`): `<textarea>` largo que crece proporcionalmente al alto del formulario.
   - Para barras cortas de 2-3 campos + botón usar `.p-form-inline-bar`.
3. **Geometría:** Inputs, selects y textareas usan `border-radius: 10px` y `min-height: 40px`. Botones primarios usan `.p-button.p-button-primary` para alto contraste. Pills (`9999px`) solo en botones, badges y buscadores.
4. **Autocrítica visual obligatoria:** Después de editar vistas, verificar el build y auditar en navegador real a `1440×900` y `500px` (`scrollWidth <= innerWidth`), revisando capturas para detectar campos recortados o columnas desequilibradas.
5. **Idioma:** Identificadores, tipos y lógica en inglés; etiquetas UI para el usuario final en español neutro profesional.

---

## 4. Qué Ya Está Completado (Fases 1, 2 y 3)

### Fase 1 — Base de Datos, Auth Real y Navegación
- Conexión Supabase JS en `src/services/supabase/supabaseClient.ts` y carga/guardado de workspace en `src/services/workspace/workspaceService.ts`.
- Flujo **"Cambio Grande"** en `src/pages/sign-in/SignInPage.tsx`, `src/services/auth/authService.ts` y `src/features/management/ManageView.tsx`: registro público de solicitud → queda `pending` → Admin aprueba y emite credenciales temporales → login real vía `authenticate_campus_user`.
- Se eliminó **Asistencia** como módulo independiente en `src/features/campus/navigation.ts` (quedando embebida dentro de cada curso).

### Fase 2 — Identidad, Dashboard, Temas, Idioma, Perfiles y Formularios
- Nuevo logotipo vectorial modular: `src/components/ui/SparksLogo.tsx` (`SparksEmblem`, `SparksWordmark`).
- Dashboard (`src/features/campus/home/HomeView.tsx`): márgenes ajustados, métricas y secciones inferiores sin cajas innecesarias, y **tarjeta de enlace a Comunidad** mostrando el mensaje más reciente.
- Temas en `src/types/theme.ts`, `src/styles/tonal.css`, `src/services/theme/themeService.ts` y `src/features/settings/SettingsView.tsx`: incluye `original`, `zafiro`, `porcelana`, **`gta-vi`**, **`minecraft`**, **`tokyo-night`**, además de creación de temas personalizados persistidos en `custom_themes`.
- Selector de idioma funcional (`es`, `en`, `pt`) en `src/utils/i18n.ts` + `SettingsView.tsx`.
- **Perfil público del estudiante y directorio** en `src/services/profile/profileService.ts` + `SettingsView.tsx` (redes sociales, institución, bio, actividades extracurriculares, cursos en progreso/finalizados).
- Refactor de formularios a `.p-form-workbench` en `ManageView.tsx`, `CalendarView.tsx`, `NoticesView.tsx`, `ActivityView.tsx` y `SettingsView.tsx`.

### Fase 3 — Cursos Funcionales, Edición Docente, Asistencia Embebida y Rediseño de Actividades
- **Catálogo (`src/features/learning/Learning.tsx`, `src/data/workspaceSeed.ts`, `src/data/learningCatalog.ts`):**
  - 10 cursos en Supabase (9 en seed base al sumarse `redes-cyber` y `sql-cloud`).
  - **Paginación estricta de máximo 7 cursos por página** (`COURSES_PER_PAGE = 7`) con botones numéricos (`1`, `2`, `Anterior`, `Siguiente`).
  - Vista previa pre-inscripción con fechas (`startDate` → `endDate`), horario (`scheduleSummary`), duración (`durationWeeks`), próxima evaluación (`nextEvaluationDate`), método de evaluación (`evaluationMethod`) y promedio de asistencia.
- **Curso funcional + Video + Ejercicios (`src/features/learning/CourseDetail.tsx`, `LessonVideoStage.tsx`, `LessonWorkbench.tsx`):**
  - Paso 1: Reproductor de video por lección (`LessonVideoStage.tsx`, soporta URL YouTube/MP4 o cápsula interactiva) con seguimiento `watchedVideos` persistido en `course_enrollments.watched_video_lesson_ids`.
  - Paso 2: Teoría, sublecciones (`lesson.sublessons`), comprobación rápida del tema (`lesson.exercises`) y laboratorio interactivo (`LessonWorkbench.tsx`).
- **Edición Docente (`src/features/learning/CourseTeacherEditor.tsx` y `src/services/learning/learningService.ts`):**
  - Docente y Admin editan/agregan lecciones, sublecciones, videos, teoría, consignas de laboratorio y fecha/método de evaluación (persistido en `public.course_lessons` y `public.courses`).
  - Docente tiene bloqueado crear o eliminar cursos en `ManageView.tsx`; Coordinación sí tiene acceso a `Gestión de cursos` (`navigation.ts`) para crear cursos, asignar docente, horario, duración y evaluación (con selector `<select>` de `Periodo`).
- **Asistencia embebida (`src/features/learning/CourseAttendancePanel.tsx`):**
  - Pestaña **Asistencia** dentro de cada curso: promedio `%` del curso visible para personal académico, marcado por fecha (`Presente`, `Tardanza`, `Ausente`, `Justificada`) sincronizado con `course_attendance`, e historial personal para alumnos.
- **Rediseño completo de Actividades por curso (`src/features/activities/ActivityView.tsx`):**
  - Arriba: selector horizontal de **cursos a cargo** (ej. al docente solo le cargan sus cursos asignados).
  - Al elegir curso: cargan sus actividades + editor `.p-form-workbench` dentro del curso (crear/modificar).
  - Al elegir actividad: detalle completo + padrón cruzado de **todos los alumnos** (`Todos`, `Realizaron`, `Sin realizar`) mostrando quién entregó/calificación en línea y quién no la realizó.

---

## 5. Alcance histórico de las fases 4, 5 y 6

### Fase 4 — Motor de IA y Tutor de Estudio
**Archivos involucrados:**
- `src/features/ai/AiControlView.tsx`, `NeuralTrainingSubmodule.tsx`, `TrainedModelsSubmodule.tsx`, `ModelAccessSubmodule.tsx`, `src/styles/ai.css`, `src/data/aiSeed.ts`, `src/types/ai.ts`, `src/services/ai/aiService.ts`
- `src/features/tutor/Tutor.tsx`, `src/services/tutor/tutorService.ts`, `src/styles/tutor.css`, `src/types/tutor.ts`, `src/features/campus/navigation.ts`

**Requerimientos exactos pendientes:**
1. **Entrenamiento neuronal (`NeuralTrainingSubmodule.tsx`):**
   - Cambiar la animación de entrenamiento para que avance **capa por capa** (primero la primera fila/capa de entrada, luego la segunda capa, tercera y salida secuencialmente).
   - Selector real de **INPUT** (datos de entrenamiento según el área: p. ej. repositorio de ejercicios matemáticos, ejercicios de programación, información estadística para coordinación, etc.) y selector de **formato de salida** (OUTPUT), persistiendo en `ai_guardrails` / `ai_models`.
2. **Modelos entrenados (`TrainedModelsSubmodule.tsx` + `ModelAccessSubmodule.tsx`):**
   - Rediseñar tarjetas/vista evitando sobrecarga de información innecesaria.
   - Controles claros para **activar / desactivar** modelos y definir **quién tiene acceso y para qué área** está dirigido cada modelo.
3. **Tutor de estudio (`Tutor.tsx` + `tutorService.ts` + `navigation.ts`):**
   - **Migrar `tutorService.ts` de `env.useMocks` a Supabase** usando las tablas existentes `public.tutor_sessions` y `public.tutor_messages`!
   - Permitir **múltiples sesiones de conversación** (crear nueva sesión, cambiar entre historial de sesiones, elegir tema/especialidad y que el sistema **cambie automáticamente de modelo** según lo elegido y el área activa).
   - Habilitar **Tutor de estudio también para el rol `admin`** en `src/features/campus/navigation.ts` (y permitir probar los distintos modelos por dominio).

### Fase 5 — Comunidad, Mensajería, Calendario y Avisos
**Archivos involucrados:**
- `src/features/community/CommunityView.tsx`, `DiscoverCommunitiesSubmodule.tsx`, `MyCommunitiesSubmodule.tsx`, `src/services/community/communityService.ts`, `src/styles/community.css`
- `src/features/community/CalendarView.tsx`, `src/features/community/NoticesView.tsx`
- *(Nuevo módulo requerido)*: Mensajería directa y reportes de incidencias conectado a `public.direct_threads` y `public.direct_messages` + `src/features/campus/navigation.ts` + `CampusShell.tsx`.

**Requerimientos exactos pendientes:**
1. **Comunidad:**
   - Mejorar diseño visual general en `DiscoverCommunitiesSubmodule.tsx` y `MyCommunitiesSubmodule.tsx`.
   - Verificar/reforzar que **al unirse a un grupo nunca aparezcan mensajes anteriores al `joined_at`** tanto en UI local como en recarga desde Supabase.
   - Permitir que **Docente** cree y administre grupos de estudio y grupos por curso/periodo; **Coordinación** cree grupos por categoría de cursos/bloque/periodo y asigne docente; **Admin** cree, elimine y asigne.
2. **Módulo de Mensajería (nuevo en `navigation.ts` y `CampusShell.tsx`, usando tablas `direct_threads` y `direct_messages`):**
   - **Alumno / Docente:** mensajería directa personal 1:1 (ej. alumno ↔ instructor de un curso determinado).
   - **Coordinación:** bandeja de **reportes de incidencias** (ej. reporte de que un instructor no inició clase) con hilo para comunicarse directamente con el instructor y verificar la información.
   - **Administrador:** mensajes urgentes y reportes del sistema.
3. **Calendario (`CalendarView.tsx`):**
   - Permitir que **todos los roles** (incluidos alumnos y docentes) citen/guarden actividades usando `.p-form-workbench`: **título, categoría, lugar, hora de inicio y hora de fin**.
   - Añadir un apartado visible de **"Actividades cercanas"** (próximos días/horas ordenados cronológicamente).
   - Permitir a **Coordinación y Admin** crear fechas/actividades especiales y controlar el **público objetivo (`audience`)** al que le aparece el aviso/actividad.
4. **Avisos (`NoticesView.tsx`):**
   - Separar visualmente **Avisos de tus cursos** vs. **Avisos generales**.
   - Para **Admin**: opción destacada de **avisos persistentes / sistémicos** (`system_persistent` / `isPinned`).

### Fase 6 — Gráficos Generales y Exportación Personalizada de Reportes
**Archivos involucrados:**
- `src/features/management/ReportsView.tsx`, `src/utils/csv.ts`, `src/services/` (o view `public.v_course_analytics` en Supabase).

**Requerimientos exactos pendientes:**
1. **Gráficos estadísticos generales en `ReportsView.tsx` (Coordinación y Admin):**
   - Notas promedio por curso.
   - Cursos más adquiridos (matrículas).
   - Promedio de asistencia por curso y resumen global (usando SVGs propios limpios sin depender de librerías pesadas o con diseño acorde a `tonal.css`).
2. **Exportación personalizable multi-formato:**
   - Panel/modal para **seleccionar qué información/bloques exportar** (ej. resumen ejecutivo, rendimiento por curso, asistencia, entregas pendientes, auditoría).
   - Botones/selector para descargar en **múltiples formatos**: `CSV`, `JSON` y `HTML/Imprimible (PDF vía print)`.

---

## 6. Comandos de Trabajo y Verificación (Windows PowerShell)

```powershell
# Directorio del paquete React (anidado dentro de la raíz del repo):
Set-Location "Junior's Sparks"

# Desarrollo local:
npm run dev

# Validación obligatoria de tipos y build tras cada cambio:
npm run build   # ejecuta: tsc --noEmit && vite build
```

**Notas de entorno (PowerShell):**
- No usar `&&` en PowerShell 5.1; usar `; if ($?) { ... }`.
- Nunca hacer `DELETE` masivos por `execute_sql` si dispara confirmación automática; en scripts usar REST PostgREST si hiciera falta.
