# NexCure

**A healthcare continuity platform that connects patients, care teams, and hospitals to coordinate recovery and prevent missed follow-ups.**

> **Status:** Hackathon prototype. The repository contains synthetic demonstration data and optional Supabase integration. Do not use real patient information until authentication, authorization, database policies, API security, privacy safeguards, and the intended deployment have been reviewed and tested.

## Overview

NexCure focuses on the period between hospital visits, when patients can miss recovery tasks, follow-up appointments, or coordination steps. It provides role-specific workspaces intended to help patients understand what to do next and help care teams identify and resolve follow-up gaps.

### Main workspaces

- **Patient Portal:** review daily tasks, medication schedules, appointments, and guidance about when to seek help.
- **Care Coordinator:** review follow-up gaps, overdue tasks, missed visits, and coordination history.
- **Healthcare Professional:** review patient information, care plans, and schedules.
- **Hospital Admin:** manage hospital workspace information, branches, staff, and patient-related workflows.
- **Platform Superadmin:** review hospital registrations and approval status.

The application includes a synthetic local dataset for demonstrations. It also contains optional Supabase authentication/data-access code and an Express endpoint for AI-assisted coordination summaries. These code paths do not, by themselves, establish that every live workflow or security control is production-ready.

## Technology stack

- React 19 and TypeScript
- Vite 8
- Tailwind CSS 4
- Lucide React icons
- Supabase JavaScript client for optional authentication and database access
- Express server using TypeScript
- Google Gemini API through `@google/genai`
- Bun dependency lockfile (`bun.lock`)

## Requirements

Install [Bun](https://bun.sh/) for the repository's lockfile-based workflow. Node.js and npm may also work, but the repository does not currently include `package-lock.json`.

## Run locally

1. Clone the repository:

   ```bash
   git clone https://github.com/VariganjiSumanthBabu/NexCure.git
   cd NexCure
   ```

2. Install dependencies using Bun:

   ```bash
   bun install --frozen-lockfile
   ```

3. Optional: create a local environment file from the example:

   **Windows PowerShell**

   ```powershell
   Copy-Item .env.example .env
   ```

   **macOS/Linux**

   ```bash
   cp .env.example .env
   ```

   Fill only the values needed for your setup. Demo Mode can be used without connecting real clinical data.

4. Start the development server:

   ```bash
   bun run dev
   ```

5. Open the local URL printed in the terminal. The configured default port is `3000`.

## Useful commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start Express with Vite development middleware |
| `bun run build` | Build the frontend with Vite |
| `bun run lint` | Run TypeScript checking via `tsc --noEmit` |
| `bun run start` | Start the Express server; production serving requires `NODE_ENV=production` and a built `dist` directory |
| `bun run preview` | Preview the Vite build |

There is no test script or automated test suite defined in `package.json` at the time this README was written.

## Environment variables

The repository includes `.env.example`. Do not commit `.env` or share secret values in issue reports.

| Variable | Used for | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server-side Gemini API requests | Keep server-side; never expose it through a `VITE_*` variable or client bundle. |
| `APP_URL` | Hosted app URL used by the runtime | The exact need depends on the deployment environment. |
| `VITE_SUPABASE_URL` | Supabase project URL | Vite exposes `VITE_*` values to frontend code. |
| `VITE_SUPABASE_ANON_KEY` | Supabase client connection | Use only a client-safe publishable/anon key. This is not a substitute for RLS. Never place a service-role key here. |

Supabase settings may also be stored by the application in browser `localStorage`. Treat that as client configuration, not as a secure secret store. Use a public client key with carefully reviewed Row-Level Security policies.

## Application workflow and architecture

The main runtime flow is:

1. `src/main.tsx` mounts the React application.
2. `src/App.tsx` renders the shared header, role-specific workspace, notices, and configuration/authentication modals.
3. `src/context/AppContext.tsx` holds shared role, session, data, connection, and mutation state.
4. `src/components/navigation/TopBar.tsx` provides role-specific navigation and the Demo Mode persona selector.
5. `src/components/views/` contains the five workspaces.
6. `src/lib/dataService.ts` performs database reads and mutation operations.
7. `src/lib/dataMappers.ts` maps between database row shapes and frontend domain models.
8. `src/lib/supabase.ts` handles client configuration, authentication helpers, role resolution, connection checks, and a schema reference.
9. `src/data/mockData.ts` supplies the local synthetic cohort used in Demo Mode.
10. `server.ts` serves the app and defines `/api/system/status` and `/api/ai/coordinator-summary` endpoints.

### Demo Mode and Live Mode

- **Demo Mode:** uses synthetic records and local in-memory changes for presentation/testing. Those changes are not database persistence.
- **Live Mode:** is intended to use an authenticated Supabase user and database records. Real operation depends on compatible database types/mappers, provisioned roles, and correct RLS policies.

Do not equate a reachable database with verified write persistence. Confirm successful authorized writes and row changes before describing a workflow as saved.

## Supabase data model

The current client code expects the following public tables:

- `hospitals`
- `hospital_branches`
- `profiles`
- `hospital_memberships`
- `patients`
- `care_team_assignments`
- `care_plans`
- `care_plan_tasks`
- `appointments`
- `medication_schedules`
- `follow_up_gaps`
- `care_coordination_events`
- `audit_logs`

The database schema is the source of truth. Keep `src/lib/database.types.ts`, `src/lib/dataMappers.ts`, `src/lib/dataService.ts`, and actual Postgres constraints aligned. In particular, task completion uses `care_plan_tasks.status` and `completed_at`; do not introduce imagined columns such as `completed` or `overdue` into the database.

The repository does not currently include a `supabase/migrations` directory or a checked-in schema migration set. Track future schema changes as reviewed migrations so database state can be reproduced and audited.

## Security, privacy, and clinical-use limitations

NexCure is a prototype, not a certified clinical system. Do not deploy it for real patient care without a security and privacy review.

Before handling real patient data:

1. Audit Row-Level Security policies for all exposed tables and operations, including cross-hospital isolation and patient-to-account linkage.
2. Verify role assignment is driven by trusted database records and cannot be elevated through client-side state.
3. Ensure staff membership and patient scope are enforced server-side/database-side for every operation.
4. Protect `/api/ai/coordinator-summary` with authentication and authorization, strict request validation, payload limits, rate limiting, and appropriate privacy handling before allowing real patient payloads.
5. Remove hard-coded fallback hospital/clinician details from live-data mappers. Unknown data must be shown as unavailable, not represented as verified.
6. Verify model IDs, output validation, failure handling, and safety boundaries for any AI feature.
7. Keep the Gemini key on the server and the Supabase service-role key out of browser code.
8. Add automated tests for login failures, empty live tables, denied reads/writes, cross-hospital access, successful persistence, and endpoint abuse cases.
9. Confirm all demonstration records and clinical examples are synthetic and clearly represented as such.

AI-assisted summaries are intended only to support operational care coordination. They must not be treated as diagnosis, prescription guidance, or a replacement for qualified clinical judgment or emergency services.

## Current known engineering cautions

The project has useful prototype scaffolding, but code inspection of the public `main` branch found areas that require further validation before production use:

- `src/lib/dataService.ts` maps missing hospital data to hard-coded values such as a placeholder license, address, bed capacity, accreditation, and contact email. Those must not be presented as live verified data.
- `src/lib/dataMappers.ts` fills unavailable medication, patient, provider, hospital, and clinical fields with defaults; in live mode, unavailable details should remain unknown rather than be invented.
- `src/lib/database.types.ts` contains enum/type definitions that need to be reconciled with the actual database constraints. Mismatches can cause rejected writes or misleading status mapping.
- The AI summary endpoint in `server.ts` accepts patient-related payloads without an evident authentication/authorization gate in that file. Add appropriate controls before sending real clinical data to it.
- There is no checked-in migration directory, test suite, or CI workflow in the visible repository tree.
- No `LICENSE` file was present when this README was added. Do not assume the repository is open-source licensed until the owner adds a license.

These are implementation cautions, not a claim that every issue has been fully tested in a deployed environment.

## Project structure

```text
.
├── .env.example
├── .gitignore
├── bun.lock
├── index.html
├── metadata.json
├── package.json
├── server.ts
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    ├── components/
    │   ├── brand/NexCureLogo.tsx
    │   ├── modals/
    │   │   ├── RoleAuthModal.tsx
    │   │   └── SupabaseConfigModal.tsx
    │   ├── navigation/
    │   │   ├── EvaluationToolbar.tsx
    │   │   └── TopBar.tsx
    │   └── views/
    │       ├── CareCoordinatorView.tsx
    │       ├── HealthcareProView.tsx
    │       ├── HospitalAdminView.tsx
    │       ├── PatientView.tsx
    │       └── SuperadminView.tsx
    ├── context/AppContext.tsx
    ├── data/mockData.ts
    ├── lib/
    │   ├── dataMappers.ts
    │   ├── dataService.ts
    │   ├── database.types.ts
    │   └── supabase.ts
    └── types/index.ts
```

## License

No repository-level `LICENSE` file was present in the inspected tree. Add an explicit license if you intend to grant reuse, modification, or redistribution rights.
