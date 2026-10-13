# NexCure Repository Audit

**Repository:** `VariganjiSumanthBabu/NexCure`  
**Branch inspected:** `main`  
**Inspected Git tree SHA:** `69c08f353a9a453203d3889538f4352bb001889a`  
**Audit scope:** Entire tracked tree returned by the GitHub API (29 files including `bun.lock`), main runtime workflow, configuration, UI role views, mappers, Supabase access layer, and Express AI endpoint.  
**Limitations:** This was a source review through the connected GitHub integration. It did not execute the project locally, exercise a deployed browser session, or run SQL against the live Supabase project during this repository review. The GitHub connector granted read-only permission, so no repository write was made.

## Executive summary

NexCure is a React/TypeScript single-page application with five role-specific workspaces, an in-memory demonstration dataset, Supabase client/auth/data-access code, and an Express endpoint for Gemini-assisted coordination summaries.

The inspected `main` tree contains 29 files and no `README.md`, `LICENSE`, Supabase migration directory, test suite, or CI workflow. The connected GitHub integration reports `push: false`; the attempt to create `README.md` was rejected with HTTP 403, so the README has been prepared as a downloadable file but has not been committed to GitHub.

The general workflow is understandable:

`src/main.tsx` → `src/App.tsx` → `AppContext` → role view → `DataService`/mappers → Supabase.

AI summaries follow a separate path:

`CareCoordinatorView` → `POST /api/ai/coordinator-summary` → Express `server.ts` → Gemini API or fallback response.

The code contains useful safeguards, including synthetic-ID rejection in live writes and explicit Demo Mode concepts. However, source inspection found several important unresolved discrepancies. The project should be treated as a hackathon prototype, not production-ready clinical software.

## Priority findings

### P0: AI endpoint lacks visible authentication and authorization

**File:** `server.ts`, route `POST /api/ai/coordinator-summary`.

The route accepts a client-supplied patient object, gaps, overdue tasks, and missed appointments. The inspected handler has no visible authentication/session verification, role authorization, tenant/hospital scope check, or rate limiting. It sends these payload fields to Gemini when configured. This endpoint should not receive real patient data until access control, validation, payload limits, privacy safeguards, rate limiting, and audit/abuse handling are implemented.

The fallback response also embeds made-up clinical context and fixed dialogue details (e.g. example hospital/clinician names) and states a causal readmission-prevention claim. A fallback must be explicitly operational, neutral, and grounded only in validated request facts; it should not fabricate patient facts or outcomes.

### P0: Live data mapping fabricates hospital attributes

**File:** `src/lib/dataService.ts`, `getHospitals()` mapping (approximately lines 130-147).

The database has no columns for several frontend hospital properties, yet the mapper fills them with fixed values, including a fake license label, generic address/city/state, bed capacity `300`, accreditation text, a fixed contact role, and a generic contact email. This can make live records look institutionally verified when those attributes were never fetched. Use nullable/optional fields and display “Not provided” / unavailable, or retrieve real values from supported fields; do not manufacture values.

### P0: Domain-to-database enum/status mismatches remain

**Files:** `src/lib/database.types.ts`, `src/lib/dataMappers.ts`, `src/lib/dataService.ts`, `src/types/index.ts`.

The client types do not consistently match the database constraints previously inspected for NexCure. Examples to reconcile against live Postgres schema:

- `hospitals.status` client type includes `under_review`, while the current database constraint previously inspected allowed `pending`, `approved`, `rejected`, and `suspended`.
- `profiles.platform_role` client type permits roles beyond the database's `user` / `superadmin` profile-role constraint. Hospital staff roles should come from `hospital_memberships`, not unsupported profile-role values.
- `care_plans.status` client type includes `revised` while the table constraint previously inspected uses `draft`, `active`, `completed`, and `cancelled`.
- `care_plan_tasks.status` client type includes `cancelled`, while the actual table constraint previously inspected uses `pending`, `in_progress`, `completed`, and `skipped`.
- `appointments.status` client type omits `confirmed`, despite the actual table's available status values including it.
- `follow_up_gaps.status` frontend/domain values (`unresolved`, `in_progress`, `resolved`) do not directly match the database status values (`open`, `in_review`, `resolved`, `dismissed`) from the existing database migration.
- `follow_up_gaps.severity` in the database uses `low`, `medium`, `high`; the frontend uses `critical`, `high`, `moderate`.
- The mapper writes frontend `gap.ruleId` to `gap_type`, even though the database `gap_type` check expects the supported values (`missed_appointment`, `overdue_task`, `medication_followup`, `no_contact`, `other`). A rule identifier such as `RULE-CHF-02` will not satisfy that constraint.

The database schema must be re-inspected and used as the source of truth before allowing writes. Translate UI presentation values to/from valid database values explicitly; do not silently send incompatible strings.

### P0: Live patient mapper invents clinical and identity fields

**File:** `src/lib/dataMappers.ts`, `mapDbPatientToPatient()`.

The canonical patients table does not include several fields the UI model expects. The mapper currently fills them with hard-coded assumptions such as a generic hospital, branch ID, doctor/coordinator names and IDs, a made-up primary diagnosis, an emergency contact relationship, a fixed `daysPostDischarge`, and a discharge date derived from `created_at`. `created_at` is not a discharge date. The medication mapper likewise uses fixed standard dosage, purpose, one daily time, and 100% adherence. The appointment mapper defaults missing provider/hospital/branch information to named example entities. In live mode these defaults can be misleading. Separate genuinely stored fields from demo fixture attributes, and represent absent live fields as unknown/unavailable.

### P1: Connection probe does not include `audit_logs`

**File:** `src/lib/supabase.ts`, `tablesToProbe` list (approximately lines 439-453).

The comments and schema manager describe all 13 canonical application tables, but the probe array includes only 12: it omits `audit_logs`. The health indicator therefore cannot truthfully claim all 13 tables were inspected. This should either probe all required tables with permission-aware semantics or explicitly say which tables were checked. Note that an RLS-denied `SELECT` on a table can be expected for some roles; distinguish “table exists but this role cannot read it” from missing schema.

### P1: Role resolver assumes at most one active membership

**File:** `src/lib/supabase.ts`, `resolveAuthenticatedUserAccess()`.

It queries `hospital_memberships` using `.maybeSingle()`. Users may legitimately have multiple active memberships across hospitals/branches. The code currently cannot present a secure organization chooser or unambiguously establish scope for such users. Support an explicit selected organization constrained by the authenticated user's active memberships, and validate the selected membership server/database-side.

The current resolver only verifies that a role/membership row exists. This UI resolution is not a substitute for RLS policies; every table read/write still needs database-enforced authorization.

### P1: Demo Mode/error transitions need runtime testing

**File:** `src/lib/supabase.ts`, connection return branches; `src/context/AppContext.tsx`.

Several connection error, unprovisioned, and RLS branches return `isDemoMode: true`. This may intentionally keep the demo cohort available, but it risks conflating “explicitly selected Demo Mode” with “Live Mode failed and the UI fell back to demo.” The state model should separately represent selected data mode and live connection status. In live mode, a denied query must not silently display local mock records as if they were live.

### P1: Live data reads remain incomplete for some domain features

**Files:** `src/lib/dataService.ts`, `src/context/AppContext.tsx`, role views.

The frontend domain models contain fields that have no equivalent in the current schema (medication dose time/taken state, patient diagnosis/discharge date, branch lead/census, provider names, care-plan milestones). Some of the current mappers fill these with defaults. Before using those views with real database rows, decide which fields are required, adjust the reviewed schema/migrations if justified, or show unavailable state. Do not derive discharge date from record creation date or claim daily medication adherence from data the schema does not store.

### P1: No automated test suite, CI workflow, or migration history visible

**Files/tree:** `package.json`, tracked repository tree.

`package.json` defines build and TypeScript-check commands but no test command. The repository tree has no visible `supabase/migrations` directory or GitHub Actions workflow. Add tests for role scoping, status mappings, live/demo boundaries, error handling, and the AI endpoint before production use. Check in reviewed, ordered database migrations so schema changes are reproducible.

### P2: Project/package metadata is still generic

**File:** `package.json`.

The package name is `react-example`, version `0.0.0`. This does not break the app but should be normalized before release. `clean` uses `rm -rf`, which is Unix-style and won't work as written in standard Windows PowerShell; either document it as Unix-only or replace it with a cross-platform cleanup tool/script.

### P2: Role views and shared state are large and coupled

**Files:** `src/components/views/CareCoordinatorView.tsx` (~1,240 lines), `src/context/AppContext.tsx` (~740 lines), `src/lib/dataService.ts` (~1,400 lines), other role views.

The monolithic components increase the risk of inconsistent behavior and make testing difficult. Refactor only after workflows are stable, extracting focused components/hooks and typed service methods without changing the existing user-visible behavior unexpectedly.

### P2: No repository-level license

**File/tree:** no `LICENSE` file was present. The source includes a license comment in `App.tsx`, but this is not a repository-wide license grant. Add an explicit license only if the repository owner intends to permit reuse/redistribution.

## File-by-file inventory

This section accounts for every file in the inspected `main` tree, including generated/dependency configuration files.

| File | Purpose | Audit notes |
| --- | --- | --- |
| `.env.example` | Environment variable template | Correctly distinguishes server Gemini key from optional Supabase client values. Keep placeholders; never add real secrets. |
| `.gitignore` | Ignore local/build artifacts and env files | Correctly ignores `.env*` while retaining `.env.example`. |
| `bun.lock` | Dependency lockfile | Large generated lockfile; preserve with dependency updates and test `bun install --frozen-lockfile`. |
| `index.html` | HTML shell, metadata and web font | Uses external Google Fonts, so the font request depends on network access. Title/description are configured. |
| `metadata.json` | AI Studio app metadata/capabilities | Names the app and records a server-side Gemini capability. Keep aligned with actual behavior. |
| `package.json` | Scripts and dependencies | `react-example`/`0.0.0` metadata should be normalized; no test script; `clean` is Unix-specific. |
| `server.ts` | Express server, status API, AI summary endpoint, Vite middleware/static hosting | Critical endpoint security concerns described above; fallback includes fabricated contextual claims. |
| `tsconfig.json` | TypeScript compiler settings | `strict` is not explicitly enabled; consider enabling in a dedicated cleanup pass after fixing existing diagnostics. |
| `vite.config.ts` | Vite/React/Tailwind configuration and alias | HMR and file-watch behavior are tied to `DISABLE_HMR`; validate expected behavior in local and AI Studio runtime. |
| `src/App.tsx` | Application shell, role selection, auth/database modals, global notices | Central UI and access-denied view; technical wording can be simplified. Must avoid implying UI-role selection grants live access. |
| `src/main.tsx` | React bootstrap | Mounts `App` and global CSS. No `StrictMode` or React error boundary is present. |
| `src/index.css` | Tailwind import and global design tokens | Contains maroon/teal/rose/blue tokens and custom scrollbar styles. Styling itself is small. |
| `src/components/brand/NexCureLogo.tsx` | Inline SVG brand mark and wordmark | Self-contained vector mark. Ensure accessible labeling/contrast when used in every variant. |
| `src/components/modals/RoleAuthModal.tsx` | Demo persona selector and Supabase login form | Has explicit Demo/Live branches and real `signInWithPassword`; still requires runtime tests for failed login, role resolution, and mode transition. |
| `src/components/modals/SupabaseConfigModal.tsx` | Supabase URL/public-key settings and schema/health display | Stores user-entered configuration in browser localStorage; only client-safe public keys may be used. Avoid describing this as secure secret storage. |
| `src/components/navigation/EvaluationToolbar.tsx` | Legacy toolbar component | Currently returns `null`; remove once references are confirmed unused to reduce dead code. |
| `src/components/navigation/TopBar.tsx` | Shared header, role-specific navigation, demo persona selector, data source indicator | Large combined component; some role labels are more technical than necessary. Confirm every selected tab maps to a real view section. |
| `src/components/views/CareCoordinatorView.tsx` | Main coordinator workflow, gap/task lists, outreach/reschedule and AI brief | Core demo workflow; very large component. Has a hard-coded default reschedule date (`2026-10-16T10:30`) and sends patient-like data to the unauthenticated AI endpoint. |
| `src/components/views/PatientView.tsx` | Patient checklist, medication view, appointments, messages and safety guidance | Some data fields are absent from the DB schema; messaging currently records a coordination event rather than demonstrating a real external message channel. Review patient-to-account scoping and all fallbacks. |
| `src/components/views/HealthcareProView.tsx` | Healthcare professional workspace | Role view depends on shared context and the current domain model; test assigned-patient filtering and eliminate default/fabricated live metadata. |
| `src/components/views/HospitalAdminView.tsx` | Hospital overview, branches, cohorts and staff | Uses hospital attributes not stored in the canonical schema; ensure live mode never presents fallback license/capacity/contact details as real. |
| `src/components/views/SuperadminView.tsx` | Hospital registration and approval workspace | Contains a fallback license value (`LIC-TEMP-001`) on creation. Ensure registration/approval writes are privileged, persistent and audit logged in Live Mode. |
| `src/context/AppContext.tsx` | Shared application data, role/session, connection state, mutations and notices | Starts from demo arrays and coordinates multiple mutations. Large coupling; thoroughly test that errors or mode switching cannot leak demo rows into live mode. |
| `src/data/mockData.ts` | Synthetic personas, hospitals, branches, patients, tasks, medications, appointments, gaps, logs and care plans | Large fixture dataset. Keep it confined to explicit Demo Mode and label it as fictional. Contains strong clinical-sounding statistical assertions that should be sourced or reworded as illustrative demo rationale. |
| `src/lib/dataMappers.ts` | DB-to-UI and UI-to-DB transformations | Critical fabricated defaults and enum mismatches described above. Must be aligned to real schema and avoid invented identity/clinical values. |
| `src/lib/dataService.ts` | Centralized Supabase reads and writes with demo/live result objects | Good intent around synthetic ID guards and affected-row checks. Hospital mapping creates fake verification data; task creation currently calls `mapTaskToDbTask(demoCreated)` without a hospital ID or care-plan ID. That mapper writes `hospital_id: null` and does not supply `care_plan_id`, while the inspected database defines both columns as NOT NULL. Live task creation will fail until the creation workflow supplies valid authorized IDs or the schema/workflow is deliberately redesigned. Review every mutation against actual RLS and constraints. |
| `src/lib/database.types.ts` | Canonical table/type model | Several status/role enums are inconsistent with the actual database constraints previously inspected. Prefer generated Supabase types or a verified schema snapshot. |
| `src/lib/supabase.ts` | Client configuration, key guard, auth helpers, access resolution, health probe and schema documentation | Probe list claims 13 tables but omits `audit_logs`; `.maybeSingle()` cannot represent multiple active memberships; Demo Mode and connection-error state should be kept distinct. |
| `src/types/index.ts` | Frontend domain types for roles, patients, tasks, meds, appointments, gaps and plans | Contains rich fields beyond the real DB schema. Clearly separate demo presentation properties from stored live data; normalize status types at explicit mapper boundaries. |

## Workflow trace

### Demo workflow

1. The app defaults context state from `src/data/mockData.ts`.
2. `TopBar` exposes a compact role selector in Demo Mode.
3. Role selection updates `AppContext.currentRole` and the active tab.
4. `src/App.tsx` mounts the matching role workspace.
5. Workspace actions call `AppContext` mutation functions.
6. The context calls `DataService` in Demo Mode; those changes should remain in-memory only.

### Live workflow (intended)

1. The user supplies the Supabase URL and client-safe anon/publishable key or uses environment values.
2. `src/lib/supabase.ts` creates a browser client.
3. `RoleAuthModal.tsx` calls `signInSupabaseUser()` / Supabase Auth.
4. `resolveAuthenticatedUserAccess()` checks `profiles`, `hospital_memberships`, and `patients` to resolve a role and organization.
5. `AppContext` calls `DataService`, which queries canonical tables and maps rows to domain models.
6. Mutation handlers must obey actual RLS and database constraints and update React state only after verified persistence.

The client-side role resolution is for application UX. Security enforcement must remain in RLS and trusted backend operations.

### AI-summary workflow

1. `CareCoordinatorView` posts patient/gap/task/appointment objects to `/api/ai/coordinator-summary`.
2. `server.ts` uses Gemini if `GEMINI_API_KEY` is configured, otherwise returns a deterministic fallback summary.
3. Results are shown in the coordinator AI brief UI.

The endpoint needs authentication, authorization, validation and privacy controls before any real clinical payload is permitted.

## Validation status

This audit did not run `bun install`, `bun run lint`, `bun run build`, the live browser app, or security tests against a running environment. Therefore, this report makes source-level findings only and does not claim build, runtime, or production-readiness verification.

## Recommended remediation order

1. Secure the AI endpoint and remove fabricated fallback statements.
2. Align every enum/type and mapper with the live Postgres schema; stop fabricating hospital/patient/medication/provider attributes.
3. Implement reviewed RLS and trusted role/hospital-scope checks; test cross-hospital access and denied operations.
4. Separate explicit Demo Mode selection from Live Mode connectivity/auth failures.
5. Add automated tests for data mappers, mutation outcomes, auth/role resolution and endpoint security.
6. Add ordered Supabase migrations and CI checks.
7. Refactor large views and simplify UX once functional correctness is tested.
