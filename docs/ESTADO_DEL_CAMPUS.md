# Estado de Junior’s Sparks

Actualizado el 27 de noviembre de 2026. Este documento sigue el código y las pruebas de la entrega. Los PDF de EduMaster sirven como inspiración de producto.

## Funciones disponibles

| Área | Alcance de esta versión |
| --- | --- |
| Alumno | Catálogo de siete cursos por página, horarios antes de matricularse, avance por lección, actividades, agenda personal y avisos por curso. Sistemas Digitales y Microcontroladores ESP32 incluye videos de YouTube, preguntas autocorregibles y laboratorio. |
| Docente | Edición de lecciones, sublecciones, videos, teoría, preguntas y evaluación en cursos asignados. Actividades, entregas y asistencia se consultan por curso. Puede crear grupos de estudio o de sus propios cursos. |
| Coordinación | Alta y edición de cursos con instructor, bloque, periodo y horario. Gestión de grupos, agenda por audiencia, incidencias con estado y contacto al instructor. |
| Administración | Administración de cursos, bloques, periodos, solicitudes, grupos y avisos fijados. Panel de modelos con activación, especialidad y acceso por rol. |
| Comunidad y mensajería | Chat de grupos con historial a partir de la membresía actual. Bandeja directa para consultas al instructor, incidencias a Coordinación y mensajes urgentes a Administración. |
| Tutor y motor de IA | Conversaciones separadas, selección automática o manual de especialidad, ejemplos integrados o importados desde JSON y formato de respuesta. El tutor recupera ejemplos. El laboratorio simula las capas, épocas y métricas. |
| Reportes | Matrículas, calificaciones, asistencia y entregas por curso y periodo. Exportación por secciones a CSV, JSON o HTML preparado para imprimir a PDF. |

## Ejecución y persistencia

Ejecutar `npm run dev` desde la carpeta que contiene `package.json`. La URL de Vite permite entrar con los cuatro perfiles de demostración. Este modo guarda datos de prueba en el navegador y permite ensayar solicitud, aprobación y acceso con credenciales de prueba.

El proyecto Supabase de EnterpriseCloud tiene la referencia `wozahbsyjopfremwrmvg`. La integración gestionada está preparada en el código. El proyecto remoto conserva su configuración anterior hasta aplicar la migración y activar el nuevo acceso.

La migración requiere el esquema existente del campus. Antes de activar `VITE_SUPABASE_MANAGED_AUTH=true`, hay que enlazar el primer administrador con una cuenta confirmada de Supabase Auth, configurar el correo y la URL del campus, aplicar la migración y desplegar la función `campus-approve`. La aprobación envía una invitación a `/acceso?activar=1` para que cada usuario defina su contraseña. Los pasos de configuración están en el [README](../README.md#connecting-a-backend).

## Verificación

- `npm run build` y `git diff --check` pasaron. Vite aún informa que el paquete inicial supera los 500 kB antes de compresión.
- Google Chrome a 1440 × 900 y 500 × 900. Confirmé siete cursos en la primera página, dos en la segunda, carga del reproductor integrado y corrección del ejercicio NAND, selección del modelo de analítica, avance de una época, validación de horas de agenda y descarga de un JSON con la sección solicitada.
- En móvil, los encabezados probados de 292–343 px bajaron a 57–109 px. La caja de consulta del tutor quedó visible en la primera pantalla de 500 × 900. Las vistas revisadas respetaron el ancho útil.
- PostgreSQL 17 temporal validó la aplicación de la migración, la configuración de las políticas y las funciones por rol con datos sintéticos. Queda pendiente probar la aplicación completa contra Supabase Auth y confirmar que el correo de invitación llega en el entorno real.
