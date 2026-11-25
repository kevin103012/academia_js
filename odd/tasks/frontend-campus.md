# Junior’s Sparks frontend

Objective: deliver a runnable, browser-local academic campus. Delivery: local workspace. Verification: TypeScript, Vite and browser checks. The workspace has no Git repository.

## Specs

- S1. “react + vite + ts + tailwind css” and “solo el fronted pero todo con funcionalidad”. Use the PDFs in `docs/` to identify educational roles and workflows. Keep demo state in the browser.
- S2. “Junior's Sparks con el logo de la imagen que te pase” and “sigue la proporción de los colores que te pase en imagen 60, 30, 10.” Use the supplied brand asset, antique ivory as the main surface, piano black as the secondary surface and surf turquoise for accents.
- S3. “la lading page tiene que tener un Layout Hero full bleed”, “un apartado de iniciar secion unos usuarios de prueba” and “google icons o lucide icons”. Provide public landing, a sign-in route, four role accounts, Lucide and accessible loading motion.
- S4. “utiliza las herramientas disponibles, para visualizar lo que esta desarrollando y corregir si hay algun tipo de error.” Verify the rendered application and the principal demo flows in a browser.

## Tasks

- T1 · S1 · Delegated documentation review · Complete. Both PDFs yielded the student course flow and educator, coordination and administration views.
- T2 · S2/S3 · Inline app setup and design · Complete. Desktop and mobile captures show the supplied logo and branded hero. Sign-in rejected invalid credentials and opened all four profiles.
- T3 · S1/S3 · Delegated portal, learning and tutor · Complete. The browser finished 3/3 lessons, received 100% on the assessment, issued a certificate, recovered it after reload and downloaded the file. Tutor feedback persisted and the report exported to CSV.
- T4 · S4 · Inline integration checks · Complete. TypeScript and Vite passed. Browser readback confirmed that the mobile sign-in and report fit their client area at a 320px viewport.

## Log

L1. “Créame un proyecto en react + vite + ts + tailwind css, analiza la documentación que esta dentro de la carpeta docs, solo el fronted pero todo con funcionalidad, tienes la documentación como base y la guía de todo eso, pero la paginas web va a tener de nombre Junior's Sparks con el logo de la imagen que te pase, también quiero que uses los estos colores que te pase en imagen. quiero que que tenga un lading page un apartado de iniciar secion unos usuarios de prueba un y la lading page tiene que tener un Layout Hero full bleed, que los iconos sean de google icons o lucide icons, imágenes si las requieres las puedes sacar de Pinterest, para apartados de carga utiliza animaciones como las de lottie o otras fuentes. sigue la proporción de los colores que te pase en imagen 60, 30, 10.”

L2. “utiliza las herramientas disponibles, para visualizar lo que esta desarrollando y corregir si hay algun tipo de error.”

L3. Replaced a mobile heading break that concatenated words, removed the duplicate certificate action and fixed a 15px desktop-scrollbar overflow at the narrow viewport. The hero photograph was generated for the mock campus. The logo was cropped from the supplied image.

L4. Improved body-text contrast and made keyboard focus scroll immediately. The final Vite build passed. The Taste layout preset remains open in round 2 with 35 design findings, including its full-screen section, copy and container conventions. The requested edge-to-edge composition is preserved.
