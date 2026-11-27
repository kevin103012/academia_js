# Institutional coordination campus
Coordinator-only implementation; reuse the existing Supabase schema. Branch: codex/coordinacion-institucional. Delivery: ask-on-risk; estimated >400 authored lines.
Verification: Node test runner, TypeScript, Vite, role-scoped UI checks and isolated database permission tests. Necessary hosted schema changes are authorized for EnterpriseCloud / Junior's Sparks; preserve existing records.

## Specs
S1. Scope: “todos los cursos de su institución”. Blocks and periods are filters, not authorization boundaries. No change to admin access.
S2. En el dashboard osea el resumen de coordinacion modifiques agregando, Gráficos mas generales, ósea notas promedio de x cursos, cursos mas adquiridos, full estadísticas. quiero algo moderno y llamativo.
S3. Mejorar el apartado de reportes. para poder extraer inforamcion esencial. añadir el botón de exportar, en diferentes formatos, y seleccionar que información quiere exportar, puedes agregar graficos tambien.
S4. En modulo de curso añade el boton de crear el curso y asigna aun instructor en ese curso y otros aspectos somo fechas de duracion y horarios, dentro de cada curso el coordinador puede ver la información básica de clases como actividades realizadas o dejadas por el profesor, dentro de cada curso tambien se vizualicen el promedio de asistencia que tiene el alumno dentro de cada curso.
S5. Agregar el modulo de Mensajeria , han de aparecer reportes, por ejemplo si un instructor no inicio la clase y lo reportan, estos reportes han de llegar al modulo de mensajeria y el coordinador tendrá la tarea de verificar la información comunicándose con el instructor.
S6. Mejora el apartado de actividades como para que se vea algo llamativo y funcional, en base al perfil al coordinador.
S7. En el apartado de comunidad el perfil de coordinador debe poner crear grupos (categoría de cursos), Curso, selecciona bloque/periodo, y asigna un instructor, si es posible mejor el diseño tambien.
S8. En el apartado de calendario podra crear fechas u actividades especiales e importantes para el, también crear fechas u actividades para citar a profesores o alumnos y asi poder controlar a quien le ha de aparecer el aviso u actividad si en caso.
S9. En avisos mejora el diseño, este modulo que sea funcional en base al coordinador como que le avise que reunion o activida tiene que realizar algo asi.
S10. En configuracion agrega que el usuario osea el coordinador pueda editar su perfil, y modificar aspectos como deben aparecer diversas opciones, como cambiar idioma, apariencia, y modificar perfil, el perfil de coordinador va poder ser visto por los demás, para asi fomentar la comunicación.

## Tasks
- T1 [S1,S4] Deployed via authorized connector: migration 20261127094749. Independent verification accepted scoped fixes. Institutional functions deny anonymous callers. Real operator-approved member and period provisioning pending.
- T2 [S4] Implemented course creation, instructor assignment, ISO schedules, activities and per-student course attendance; demo browser and hosted transaction probes passed.
- T3 [S2,S3,S6] Implemented summary, filters, attendance trend, follow-up queue, report field/format choices, course-specific activities. Tests verified projection, dates, correct null/zero and export sanitization. PDF uses browser print/save.
- T4 [S5] Implemented incident states, instructor inquiries, messages, resolution notes and participant intake. Browser demo workflow and hosted synthetic RPC probes passed.
- T5 [S7,S8,S9] Implemented scoped course groups, targeted/personal calendar including individual recipients, derived actionable notices. Hosted audience probes and local UI checks passed.
- T6 [S10] Implemented professional profile, visible field preview, private preferences and Spanish/English/light/dark settings. Demo checks and hosted projection/privacy probes passed.

## Log
L1 (original request):
Haber quiero que crees un plan de guia primero de los cambios que se van a hacer, haber voy a trabajar en el perfil de "Coordinacion", solo con este perfil, los cambios que quiero son:\
-En el dashboard osea el resumen de coordinacion modifiques agregando, Gráficos mas generales, ósea notas promedio de x cursos, cursos mas adquiridos, full estadísticas. quiero algo moderno y llamativo.\
\
-Mejorar el apartado de reportes. para poder extraer inforamcion esencial. añadir el botón de exportar, en diferentes formatos, y seleccionar que información quiere exportar, puedes agregar graficos tambien.\
\
-En modulo de curso añade el boton de crear el curso y asigna aun instructor en ese curso y otros aspectos somo fechas de duracion y horarios, dentro de cada curso el coordinador puede ver la información básica de clases como actividades realizadas o dejadas por el profesor, dentro de cada curso tambien se vizualicen el promedio de asistencia que tiene el alumno dentro de cada curso.\
\
\- Agregar el modulo de Mensajeria , han de aparecer reportes, por ejemplo si un instructor no inicio la clase y lo reportan, estos reportes han de llegar al modulo de mensajeria y el coordinador tendrá la tarea de verificar la información comunicándose con el instructor.\
\
-Mejora el apartado de actividades como para que se vea algo llamativo y funcional, en base al perfil al coordinador.\
\
-En el apartado de comunidad el perfil de coordinador debe poner crear grupos (categoría de cursos), Curso, selecciona bloque/periodo, y asigna un instructor, si es posible mejor el diseño tambien.\
\
-En el apartado de calendario podra crear fechas u actividades especiales e importantes para el, también crear fechas u actividades para citar a profesores o alumnos y asi poder controlar a quien le ha de aparecer el aviso u actividad si en caso.\
\
-En avisos mejora el diseño, este modulo que sea funcional en base al coordinador como que le avise que reunion o activida tiene que realizar algo asi.\
\
-En configuracion agrega que el usuario osea el coordinador pueda editar su perfil, y modificar aspectos como deben aparecer diversas opciones, como cambiar idioma, apariencia, y modificar perfil, el perfil de coordinador va poder ser visto por los demás, para asi fomentar la comunicación.

L2: “**todos los cursos de su institución**, igual que el admin pero yo estoy ahorita trabajando con coordinador pero tenlo en cuenta.”
L3: “empecemos”. Start implementation. No remote schema or data changes authorized in this stage.
L4: Catalog inspection: profiles.institution is text; courses.period_id is mandatory; neither courses nor academic_periods identifies an institution. courses.teacher_id is nullable and ON DELETE SET NULL. Never infer ownership from the instructor, a name or browser state. Existing institutional assignment must be confirmed before enabling live course access.
L5: Repository is an unborn branch; no baseline commit. Do not include unrelated pre-existing untracked files in authored changes.
L6: RED missing course builder; GREEN 2/2 Node tests, TypeScript and Vite production build with configLoader runner. Browser checks with isolated demo accounts: coordinator created a course, missing-day error appeared, 390px form had no horizontal overflow, and the schedule survived reload. Student and admin did not see the creation action. The first teacher navigation probe incorrectly targeted “Cursos”; corrected probe passed through “Gestión de cursos”. No hosted data were queried or changed beyond schema metadata.
L7: Independent verification found no blocker for the local slice. Risk: item 3 (the existing catalog renderer is shared by other roles); optional tools are provided only to the coordinator in local demo mode. Live cross-institution authorization, attendance and HTTP integration were not tested. No baseline for differential Git checks; no self-contained feature commit yet.
L8 (2026-11-27): “los que estan en supabase son de prueba sino me equivoco, pero tomalos en cuenta”. Hosted course provenance is unconfirmed; preserve existing records and do not automatically assign an institution or count them as official data.
L9 (2026-11-27): “aplica todos los cambios de una vez, y usa la base de datos si es necesario agregas o creas tablas, tienes autorizacion”. Supersedes the prior metadata-only limitation for necessary project-scoped changes. Explicit scope is Coordination, not a redesign or grant of administrative rights to other roles.
L10: Confirmed 23 public tables, no direct institution column on courses, and three unrestricted anonymous ALL policies across profiles, courses and course_enrollments. No academic rows were read. The required gpt-6.1-luna explorer launch failed (unknown model); the same assignment also applies to the required parallel writers. Need an allowed substitute; preserve the implementation until mapping can proceed.
L11: “si”. User approved gpt-6.2-sol for the map and writers; the independent verification role is unchanged. Parallel implementation surfaces: institutional academic UI, communication UI, database contracts. Parent owns app shell, local/hosted gateways and scoped integration. No existing records are assumed to be fixtures.
L12: “continua”. Resumed interrupted local writers; preserved work. Corrected institutional privileges and protected managed academic workflows before rollout. Risk: items 1, 2, 3, 5 (schema, access, existing contracts, dependencies).
L13: Release verification: two-institution fictitious fixtures in rollback transactions succeeded before and after migration. The Data API denies private schema exposure (406) and anonymous identity (401). Exactly seven authenticated-only RPCs; no client membership in the privileged runtime. Existing unmapped courses untouched. Security advisor still reports warnings on legacy definer functions; no wholesale hardening of unrelated demo/legacy data.
L14: 19/19 local tests, TypeScript and Vite production build (runner) passed. Chrome production preview rendered all nine modules, no page errors or horizontal overflow at 390px. Checked CSV, XLSX and print path, date range/trend unit tests, schedule, reporting, targeted event, group, preferences. Earlier dev-server browser check hit stale Vite optimized dependencies; production preview passed. Large lazy XLSX chunk produces a build warning.
L15: No existing Auth UUID, course or period was assigned by guesswork. Operator must bind approved profiles and periods using the database guide before exercising a real signed-in user end-to-end; institutional data never falls back to the browser demo.
L16: Local commits: 6f01ddc specification and contracts; 87d7b9b T1 database and authorization probes; 9530683 T2/T3 academic features; 3936c27 T4/T5/T6 communication features; b400b5d T1–T6 campus integration, demo isolation and testing. The UI is a local production preview; no push or frontend publication. Native receipt not issued at this point (pre-existing untracked inventory); independent verification and functional checks are recorded above.
