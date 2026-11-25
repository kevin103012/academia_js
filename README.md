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

## Demo access

Select a profile on the sign-in page to prefill its credentials. All four accounts use `Sparks2026!`.

| Profile | Email |
| --- | --- |
| Estudiante | `estudiante@juniorssparks.example` |
| Docente | `docente@juniorssparks.example` |
| Coordinación | `coordinacion@juniorssparks.example` |
| Administración | `admin@juniorssparks.example` |

The campus includes a student course journey, role-specific views, and a study tutor with prepared local responses. Sessions and changes are stored in the browser. Clear this site’s storage to start the demo over. A deployed copy needs a static host with a single-page-app fallback to `index.html`.
