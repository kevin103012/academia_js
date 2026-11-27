# Junior’s Sparks

Junior’s Sparks is a Spanish-language educational campus demo built with React, Vite, TypeScript, Tailwind CSS, and Lucide. The source material is the pair of EduMaster AI Enterprise PDFs in `docs/`.

## Run locally

Use Node.js 22.12 or newer.

```sh
npm install
npm run dev
```

Open the URL shown by Vite. The public landing page is `/`, sign-in is `/acceso`, and the campus is `/campus`. Run `npm run build` for a type-checked production build in `dist/`.

## Project structure

```text
src/
  app/          App shell and top-level providers
  components/   Shared UI primitives (Brand, LoadingMark, SegmentedControl)
  config/       Environment flags (env.apiUrl, env.useMocks)
  context/      AuthContext and WorkspaceContext state containers
  data/         Mock seeds and local catalog/tutor datasets
  features/     Domain views (campus, activities, community, learning, management, tutor)
  hooks/        Custom hooks (useAuth, useWorkspace, useDocumentTitle)
  pages/        Route pages (landing, sign-in, campus)
  routes/       React Router config, path constants, and ProtectedRoute
  services/     Service interfaces + localStorage/HTTP adapters and apiClient
  styles/       Global, tonal design system, and feature stylesheets
  types/        Shared TypeScript domain contracts
  utils/        Date, ID, CSV export, and text helpers
```

## Connecting a backend

The frontend separates UI state from data persistence via typed service interfaces in `src/services/` (`AuthService`, `WorkspaceService`, `LearningService`, `TutorService`):

1. Copy `.env.example` to `.env` and set `VITE_API_URL` (for example, `http://localhost:8000/api`). When `VITE_API_URL` is non-empty, `env.useMocks` becomes `false`.
2. Implement or adjust the `http*Service` adapter for each module you migrate in `src/services/<module>/`, using `apiClient` (`src/services/http/apiClient.ts`) and keeping the exported service interface unchanged.
3. Migrate module by module (auth, workspace, learning, tutor) without touching UI components or hooks.

## Institutional Coordination (Supabase)

The institutional entry is `/institucion`, also linked from the sign-in page. It uses Supabase Auth and a separate session from the local demo; it never falls back to demo data or the legacy bulk workspace API. Keep `VITE_API_URL` for the unrelated legacy adapter. For the institutional portal, set the project URL and **publishable** key from Supabase in `.env.local` using the two `VITE_COORD_SUPABASE_*` variables in `.env.example`. Never use a secret, service-role key, or database password in Vite.

Coordinator screens cover overview, configurable reports (CSV, genuine XLSX, printable PDF), courses, activities, incident messaging, groups, targeted calendar, notices and profile preferences. Student and instructor recipients use the same institutional entry to see authorized invitations and exchange incident messages. Institutional courses have explicit ownership independent of the assigned instructor.

Before using real accounts, follow the deployment and **explicit membership/period provisioning** instructions in [the database guide](database/coordination/README.md). A valid Auth account without an approved institutional membership does not open the panel. Existing courses are not silently reassigned or counted.

Run `npm test` for the deterministic tests; `npm run build` type-checks and builds the frontend. In restricted environments where esbuild cannot read the default config path, use `npm run build -- --configLoader runner`.

## Demo access

In browser-local mode, sign in as **Coordinación** to try the same nine sections with example data. Changes stay in the browser. Global demo attendance records without a course ID are not converted into per-course percentages. This demo is not a proof of server permissions.

Run `node --experimental-strip-types --test tests/coordination-courses.test.mjs` to check course form validation on Node 22.

Select a profile on the sign-in page to prefill its credentials. All four accounts use `Sparks2026!`.

| Profile | Email |
| --- | --- |
| Estudiante | `estudiante@juniorssparks.example` |
| Docente | `docente@juniorssparks.example` |
| Coordinación | `coordinacion@juniorssparks.example` |
| Administración | `admin@juniorssparks.example` |

The campus includes a student course journey, role-specific views, and a study tutor with prepared local responses. Sessions and changes are stored in the browser. Clear this site’s storage to start the demo over. A deployed copy needs a static host with a single-page-app fallback to `index.html`.
