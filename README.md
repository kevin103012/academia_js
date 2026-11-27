# Junior’s Sparks

Junior’s Sparks is a Spanish-language educational campus demo built with React, Vite, TypeScript, Tailwind CSS, and Lucide. The source material is the pair of EduMaster AI Enterprise PDFs in `docs/`.

See the [current campus status](docs/ESTADO_DEL_CAMPUS.md) for implemented modules, browser verification, and Supabase activation status.

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

The demo runs entirely in the browser. Configuration and example-based tutor responses work locally. The neural laboratory simulates the layer progression and metrics.

For the existing Supabase project, coordinate the following steps before enabling managed access. The migration replaces the legacy public access policies and requires real Supabase Auth sessions.

1. Create or invite the first administrator in Supabase Auth. From an administrative database session, link the confirmed Auth UUID to the existing administrator profile through `profiles.auth_user_id`. Keep the existing profile ID so its references are preserved. Set the profile email to the verified Auth email. Link any other existing profiles that need to keep their records in the same way.
2. Apply the migration in `supabase/migrations/` to the existing campus schema. It is an upgrade for that schema and expects its tables to exist.
3. Configure Supabase Auth email delivery and allow the redirect `<campus URL>/acceso?activar=1`. Deploy the `campus-approve` Edge Function and set its `CAMPUS_SITE_URL` secret to the frontend origin.
4. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_MANAGED_AUTH=true` in the frontend environment, then rebuild and deploy the campus. Review one registration, approval and invite redemption using a controlled test address.

## Demo access

Select a profile on the sign-in page to prefill its credentials. All four accounts use `Sparks2026!`.

| Profile | Email |
| --- | --- |
| Estudiante | `estudiante@juniorssparks.example` |
| Docente | `docente@juniorssparks.example` |
| Coordinación | `coordinacion@juniorssparks.example` |
| Administración | `admin@juniorssparks.example` |

The demo access request appears in the administration view. Approving a demo request shows a temporary credential in the same browser. Campus messages in the demo are also shared among the demo profiles on that browser. A deployed copy needs a static host with a single-page-app fallback to `index.html`.
