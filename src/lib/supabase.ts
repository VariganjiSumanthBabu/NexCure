import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { CANONICAL_TABLES, CanonicalTableName, DbProfile, DbHospitalMembership, DbPatient } from './database.types';
import { UserRole } from '../types';

// Read from Vite environment or localStorage
const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const STORAGE_KEY_URL = 'nexcure_supabase_url';
const STORAGE_KEY_ANON = 'nexcure_supabase_anon_key';
const STORAGE_KEY_FORCE_DEMO = 'nexcure_force_demo_mode';

let cachedClient: SupabaseClient | null = null;

export type SupabaseConnectionState =
  | 'demo'              // 1. Demo Data Mode: explicitly active or unconfigured. Local synthetic dataset.
  | 'configured'        // 2. Supabase Configured: URL & client key provided, awaiting connectivity check
  | 'reachable'         // 3. Supabase Reachable: Server responds, but not authenticated or authorized
  | 'auth_required'     // 4. Authentication Required: Database reachable, but Row Level Security restricts clinical tables or unprovisioned
  | 'connected'         // 5. Supabase Connected: Active authenticated session verified AND authorized access to canonical tables confirmed
  | 'error';            // Connection Error: Configuration, network, or schema error

export interface ResolvedUserAccess {
  hasValidRole: boolean;
  role: UserRole | null;
  hospitalId: string | null;
  branchId: string | null;
  patientId: string | null;
  fullName: string | null;
  organizationName: string | null;
  status: 'active' | 'unprovisioned' | 'denied';
  error?: string;
}

export interface ConnectionHealth {
  state: SupabaseConnectionState;
  stateLabel: string;
  url: string | null;
  hasKey: boolean;
  isCustomConfig: boolean;
  configSource: 'environment' | 'manual_browser' | 'none';
  testedAt: string | null;
  message: string;
  diagnosticDetails?: string;

  // The 5 truthful architectural layers (P0.2 & Phase 1 Acceptance)
  isDemoMode: boolean;               // Layer 1: Demo data mode
  isReachable: boolean;              // Layer 2: Supabase reachable
  hasActiveSession: boolean;         // Layer 3: Authenticated user session
  hasAuthorizedAccess: boolean;      // Layer 4: Authorized access to required tables
  persistenceVerified: boolean;      // Layer 5: Verified successful persistence (only true after real verified write succeeds!)

  authenticatedUserEmail?: string | null;
  resolvedAccess?: ResolvedUserAccess;
  tableAccess: Record<string, {
    accessible: boolean;
    rowCount?: number;
    error?: string;
    note?: string;
  }>;
}

/**
 * Checks if a key is a prohibited service-role key by inspecting prefix and base64 JWT payload.
 */
export function isServiceRoleKey(key: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed.includes('service_role')) return true;

  // Inspect JWT payload role claim if key is standard 3-part JWT
  const parts = trimmed.split('.');
  if (parts.length === 3) {
    try {
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decodedJson = atob(payloadBase64);
      const parsed = JSON.parse(decodedJson);
      if (parsed.role === 'service_role') {
        return true;
      }
    } catch {
      // not base64 or not JSON, continue
    }
  }

  return false;
}

export function getStoredSupabaseConfig() {
  const customUrl = localStorage.getItem(STORAGE_KEY_URL);
  const customKey = localStorage.getItem(STORAGE_KEY_ANON);
  const forceDemo = localStorage.getItem(STORAGE_KEY_FORCE_DEMO) === 'true';

  const isCustom = !!(customUrl || customKey);
  const effectiveUrl = (customUrl || ENV_SUPABASE_URL || '').trim();
  const effectiveKey = (customKey || ENV_SUPABASE_ANON_KEY || '').trim();

  let configSource: 'environment' | 'manual_browser' | 'none' = 'none';
  if (isCustom) {
    configSource = 'manual_browser';
  } else if (ENV_SUPABASE_URL && ENV_SUPABASE_ANON_KEY) {
    configSource = 'environment';
  }

  return {
    url: effectiveUrl,
    anonKey: effectiveKey,
    isCustom,
    forceDemo,
    configSource,
  };
}

export function saveSupabaseConfig(url: string, anonKey: string, forceDemo: boolean = false) {
  if (forceDemo) {
    localStorage.setItem(STORAGE_KEY_FORCE_DEMO, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEY_FORCE_DEMO);
  }

  if (url && anonKey) {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_ANON);
  }
  cachedClient = null;
}

export function clearCustomConfig() {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_ANON);
  localStorage.removeItem(STORAGE_KEY_FORCE_DEMO);
  cachedClient = null;
}

/**
 * Returns the application Supabase client with persistent session handling.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const { url, anonKey, forceDemo } = getStoredSupabaseConfig();

  if (forceDemo) {
    return null;
  }

  if (url && anonKey && url.startsWith('http')) {
    // Strictly prevent service-role keys in client code
    if (isServiceRoleKey(anonKey)) {
      console.error('[NexCure Security] Blocked service-role key from client-side initialization.');
      return null;
    }

    try {
      cachedClient = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storage: window.localStorage,
        },
      });
      return cachedClient;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return null;
}

/**
 * Resolves an authenticated user's real application role and hospital scope from database records.
 * Rules (Phase 1 Acceptance Item 2):
 * - Superadmin from platform_role in profiles
 * - Hospital staff from active hospital_memberships (hospital_admin, coordinator, doctor)
 * - Patients from patient linkage in patients (patient_user_id)
 * - If no role/membership, returns unprovisioned / access-denied
 * - Never trusts browser-supplied role or assigns arbitrary role.
 */
export async function resolveAuthenticatedUserAccess(
  client: SupabaseClient,
  userId: string
): Promise<ResolvedUserAccess> {
  try {
    // 1. Check profiles table for profile info and platform_role
    const { data: profileData, error: profileErr } = await client
      .from(CANONICAL_TABLES.PROFILES)
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) {
      console.warn('Profile lookup error:', profileErr.message);
    }

    const profile = profileData as DbProfile | null;
    const fullName = profile?.full_name || null;

    if (profile?.platform_role === 'superadmin') {
      return {
        hasValidRole: true,
        role: 'superadmin',
        hospitalId: null,
        branchId: null,
        patientId: null,
        fullName: fullName || 'Platform Superadmin',
        organizationName: 'NexCure National Platform Governance',
        status: 'active',
      };
    }

    // 2. Check hospital_memberships for active staff assignment
    const { data: membershipData, error: memberErr } = await client
      .from(CANONICAL_TABLES.HOSPITAL_MEMBERSHIPS)
      .select('id, hospital_id, branch_id, role, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (memberErr) {
      console.warn('Membership lookup error:', memberErr.message);
    }

    if (membershipData) {
      const membership = membershipData as DbHospitalMembership;
      let mappedRole: UserRole = 'coordinator';

      if (membership.role === 'hospital_admin') {
        mappedRole = 'hospital_admin';
      } else if (membership.role === 'healthcare_professional' || (membership.role as string) === 'doctor') {
        mappedRole = 'doctor';
      } else if (membership.role === 'care_coordinator' || (membership.role as string) === 'coordinator') {
        mappedRole = 'coordinator';
      }

      // Fetch hospital name if available
      let orgName = 'Affiliated Hospital System';
      if (membership.hospital_id) {
        const { data: hospData } = await client
          .from(CANONICAL_TABLES.HOSPITALS)
          .select('name')
          .eq('id', membership.hospital_id)
          .maybeSingle();
        if (hospData?.name) orgName = hospData.name;
      }

      return {
        hasValidRole: true,
        role: mappedRole,
        hospitalId: membership.hospital_id,
        branchId: membership.branch_id || null,
        patientId: null,
        fullName: fullName || 'Hospital Staff',
        organizationName: orgName,
        status: 'active',
      };
    }

    // 3. Check patients table for linked patient user
    const { data: patientData, error: patientErr } = await client
      .from(CANONICAL_TABLES.PATIENTS)
      .select('id, hospital_id, full_name')
      .eq('patient_user_id', userId)
      .maybeSingle();

    if (patientErr) {
      console.warn('Patient lookup error:', patientErr.message);
    }

    if (patientData) {
      const patient = patientData as DbPatient;
      return {
        hasValidRole: true,
        role: 'patient',
        hospitalId: patient.hospital_id,
        branchId: null,
        patientId: patient.id,
        fullName: patient.full_name || fullName || 'Patient',
        organizationName: 'Patient Recovery Portal',
        status: 'active',
      };
    }

    // 4. Authenticated, but no role/membership found in database
    return {
      hasValidRole: false,
      role: null,
      hospitalId: null,
      branchId: null,
      patientId: null,
      fullName,
      organizationName: null,
      status: 'unprovisioned',
      error: 'Authenticated user has no platform_role in profiles, no active hospital_memberships, and no linked patient record.',
    };
  } catch (err: any) {
    return {
      hasValidRole: false,
      role: null,
      hospitalId: null,
      branchId: null,
      patientId: null,
      fullName: null,
      organizationName: null,
      status: 'denied',
      error: err.message || 'Error resolving user access permissions.',
    };
  }
}

/**
 * Honest, comprehensive connectivity inspection against canonical tables.
 * Discloses the 5 distinct layers:
 * 1. Demo Mode
 * 2. Supabase Reachable
 * 3. Authenticated user session
 * 4. Authorized access to required tables
 * 5. Verified successful persistence
 *
 * Rules:
 * - Do NOT set persistenceVerified: true based solely on SELECT queries.
 * - Do NOT report all required tables as authorized merely because a subset is reachable.
 * - A zero-row result can mean reachable but no rows visible; does NOT prove write permission or full authorization.
 * - Any unexpected schema/query error prevents full connected status.
 * - Until write permission is actually verified through safe authorized operation, persistenceVerified remains false.
 */
export async function testSupabaseConnection(
  customUrl?: string,
  customKey?: string
): Promise<ConnectionHealth> {
  const stored = getStoredSupabaseConfig();
  const targetUrl = (customUrl !== undefined ? customUrl : stored.url).trim();
  const targetKey = (customKey !== undefined ? customKey : stored.anonKey).trim();
  const isForcedDemo = stored.forceDemo && customUrl === undefined;

  const baseResult: ConnectionHealth = {
    state: 'demo',
    stateLabel: 'Demo Mode',
    url: targetUrl || null,
    hasKey: !!targetKey,
    isCustomConfig: stored.isCustom,
    configSource: stored.configSource,
    testedAt: new Date().toISOString(),
    message: 'Demo Mode: Running with explicitly labelled local demonstration records.',
    isDemoMode: true,
    isReachable: false,
    hasActiveSession: false,
    hasAuthorizedAccess: false,
    persistenceVerified: false,
    tableAccess: {},
  };

  // 1. Explicit Demo Mode check or no credentials provided
  if (isForcedDemo || (!targetUrl && !targetKey)) {
    return {
      ...baseResult,
      state: 'demo',
      stateLabel: 'Demo Mode',
      message: 'Demo Mode: Running with explicitly labelled local demonstration records. No Supabase credentials configured.',
      isDemoMode: true,
    };
  }

  // 2. Security Check: Service-role key rejection
  if (isServiceRoleKey(targetKey)) {
    return {
      ...baseResult,
      state: 'error',
      stateLabel: 'Connection Error',
      message: 'Security Guard: Service-role key detected. Only client-safe public/anon keys are permitted in client applications.',
      diagnosticDetails: 'The provided key contains the service-role privilege claim which bypasses Row Level Security and must never be exposed client-side.',
      isDemoMode: true,
    };
  }

  // 3. Incomplete configuration check
  if (!targetUrl || !targetKey) {
    return {
      ...baseResult,
      state: 'configured',
      stateLabel: 'Supabase Configured',
      message: 'Supabase Configured: Missing either the project URL or public anon key. Both are required for connectivity testing.',
      diagnosticDetails: !targetUrl ? 'Project URL is missing.' : 'Public anon key is missing.',
      isDemoMode: true,
    };
  }

  // Validate URL format
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    return {
      ...baseResult,
      state: 'error',
      stateLabel: 'Connection Error',
      message: 'Connection Error: Project URL must begin with https:// or http://',
      diagnosticDetails: `Invalid URL format: ${targetUrl}`,
      isDemoMode: true,
    };
  }

  try {
    // When testing stored config, use the real configured application client so we inspect
    // the user's REAL authenticated session rather than a newly created unauthenticated probe client.
    let clientToUse: SupabaseClient | null = null;
    if (customUrl === undefined && customKey === undefined) {
      clientToUse = getSupabaseClient();
    }

    if (!clientToUse) {
      clientToUse = createClient(targetUrl, targetKey, {
        auth: {
          persistSession: customUrl === undefined && customKey === undefined,
          autoRefreshToken: true,
        },
      });
    }

    // Layer 3: Check real user session
    let hasActiveSession = false;
    let userEmail: string | null = null;
    let userObj: User | null = null;

    try {
      const { data: sessionData, error: sessionErr } = await clientToUse.auth.getSession();
      if (!sessionErr && sessionData?.session?.user) {
        hasActiveSession = true;
        userObj = sessionData.session.user;
        userEmail = sessionData.session.user.email || null;
      }
    } catch {
      hasActiveSession = false;
    }

    // Layer 2 & 4: Probe key canonical tables
    const tableResults: ConnectionHealth['tableAccess'] = {};
    const tablesToProbe: CanonicalTableName[] = [
      CANONICAL_TABLES.HOSPITALS,
      CANONICAL_TABLES.HOSPITAL_BRANCHES,
      CANONICAL_TABLES.PROFILES,
      CANONICAL_TABLES.HOSPITAL_MEMBERSHIPS,
      CANONICAL_TABLES.PATIENTS,
      CANONICAL_TABLES.CARE_TEAM_ASSIGNMENTS,
      CANONICAL_TABLES.CARE_PLANS,
      CANONICAL_TABLES.CARE_PLAN_TASKS,
      CANONICAL_TABLES.APPOINTMENTS,
      CANONICAL_TABLES.MEDICATION_SCHEDULES,
      CANONICAL_TABLES.FOLLOW_UP_GAPS,
      CANONICAL_TABLES.CARE_COORDINATION_EVENTS,
    ];

    let reachableTableCount = 0;
    let rlsForbiddenCount = 0;
    let notFoundCount = 0;
    let unexpectedErrorCount = 0;
    let primaryErrorMessage = '';

    for (const tbl of tablesToProbe) {
      try {
        const { data, error, count } = await clientToUse
          .from(tbl)
          .select('id', { count: 'exact' })
          .limit(1);

        if (error) {
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            tableResults[tbl] = { accessible: false, error: 'Table does not exist in database schema' };
            notFoundCount++;
            if (!primaryErrorMessage) primaryErrorMessage = `Table '${tbl}' is missing in database.`;
          } else if (
            error.code === '42501' ||
            error.message.includes('permission denied') ||
            error.message.includes('violates row-level security policy') ||
            error.code === 'PGRST301'
          ) {
            tableResults[tbl] = { accessible: false, error: 'RLS Permission Denied (Auth/Role Required)' };
            rlsForbiddenCount++;
          } else {
            // Unexpected schema or query error
            tableResults[tbl] = { accessible: false, error: error.message };
            unexpectedErrorCount++;
            if (!primaryErrorMessage) primaryErrorMessage = `Schema/query error on '${tbl}': ${error.message}`;
          }
        } else {
          const rowCount = count ?? (data ? data.length : 0);
          tableResults[tbl] = {
            accessible: true,
            rowCount,
            note: rowCount === 0 ? 'Table reachable (0 rows visible; does not verify write persistence)' : undefined,
          };
          reachableTableCount++;
        }
      } catch (tableErr: any) {
        tableResults[tbl] = { accessible: false, error: tableErr.message || 'Probe failed' };
        unexpectedErrorCount++;
        if (!primaryErrorMessage) primaryErrorMessage = tableErr.message;
      }
    }

    const isReachable = reachableTableCount > 0 || rlsForbiddenCount > 0;

    // A. Schema mismatch or table missing
    if (notFoundCount > 0) {
      return {
        ...baseResult,
        state: 'error',
        stateLabel: 'Schema Mismatch',
        isDemoMode: true,
        isReachable,
        hasActiveSession,
        hasAuthorizedAccess: false,
        persistenceVerified: false,
        authenticatedUserEmail: userEmail,
        message: `Schema Mismatch: The connected project is missing ${notFoundCount} canonical table(s).`,
        diagnosticDetails: primaryErrorMessage,
        tableAccess: tableResults,
      };
    }

    // B. Unexpected query or schema error prevents connected status
    if (unexpectedErrorCount > 0) {
      return {
        ...baseResult,
        state: 'error',
        stateLabel: 'Database Query Error',
        isDemoMode: true,
        isReachable,
        hasActiveSession,
        hasAuthorizedAccess: false,
        persistenceVerified: false,
        authenticatedUserEmail: userEmail,
        message: `Database Query Error: ${primaryErrorMessage}`,
        diagnosticDetails: 'An unexpected database error occurred during table verification.',
        tableAccess: tableResults,
      };
    }

    // C. Database endpoint completely unreachable
    if (!isReachable) {
      return {
        ...baseResult,
        state: 'error',
        stateLabel: 'Connection Error',
        isDemoMode: true,
        isReachable: false,
        hasActiveSession,
        hasAuthorizedAccess: false,
        persistenceVerified: false,
        authenticatedUserEmail: userEmail,
        message: `Connection Error: ${primaryErrorMessage || 'Unable to reach database endpoint.'}`,
        diagnosticDetails: primaryErrorMessage,
        tableAccess: tableResults,
      };
    }

    // D. Reachable, but NO authenticated user session
    if (!hasActiveSession || !userObj) {
      return {
        ...baseResult,
        state: 'auth_required',
        stateLabel: 'Authentication Required',
        isDemoMode: true, // Demo data stays active until authenticated
        isReachable: true,
        hasActiveSession: false,
        hasAuthorizedAccess: false,
        persistenceVerified: false,
        authenticatedUserEmail: null,
        message: 'Authentication Required: Supabase is reachable, but there is no signed-in user session. Clinical tables and persistence require Supabase Authentication.',
        diagnosticDetails: 'Anonymous requests cannot read or write protected patient data under Row-Level Security. Sign in via Supabase Auth or use Demo Mode.',
        tableAccess: tableResults,
      };
    }

    // E. User IS authenticated! Now verify real role/membership in profiles & hospital_memberships
    const accessResolution = await resolveAuthenticatedUserAccess(clientToUse, userObj.id);

    if (!accessResolution.hasValidRole) {
      return {
        ...baseResult,
        state: 'auth_required',
        stateLabel: 'Account Not Provisioned',
        isDemoMode: true,
        isReachable: true,
        hasActiveSession: true,
        hasAuthorizedAccess: false,
        persistenceVerified: false,
        authenticatedUserEmail: userEmail,
        resolvedAccess: accessResolution,
        message: `Account Not Provisioned: Authenticated as ${userEmail}, but no authorized role or membership exists in profiles or hospital_memberships.`,
        diagnosticDetails: accessResolution.error || 'User account lacks active membership or patient record.',
        tableAccess: tableResults,
      };
    }

    // F. User has valid role, but RLS denies access to clinical tables
    if (rlsForbiddenCount > 0) {
      return {
        ...baseResult,
        state: 'auth_required',
        stateLabel: 'RLS Permission Denied',
        isDemoMode: true,
        isReachable: true,
        hasActiveSession: true,
        hasAuthorizedAccess: false,
        persistenceVerified: false,
        authenticatedUserEmail: userEmail,
        resolvedAccess: accessResolution,
        message: `RLS Permission Denied: Authenticated as ${userEmail} (${accessResolution.role}), but access to ${rlsForbiddenCount} table(s) was blocked by Row-Level Security.`,
        diagnosticDetails: primaryErrorMessage || 'User account permissions are insufficient for all required clinical tables.',
        tableAccess: tableResults,
      };
    }

    // G. Authenticated user with verified role and read access
    // CRITICAL: Do NOT set persistenceVerified: true based solely on SELECT queries!
    // persistenceVerified remains false until a real authorized write succeeds.
    return {
      ...baseResult,
      state: 'connected',
      stateLabel: 'Supabase Connected',
      isDemoMode: false, // Live database active
      isReachable: true,
      hasActiveSession: true,
      hasAuthorizedAccess: true,
      persistenceVerified: false, // Unverified until an authorized write executes
      authenticatedUserEmail: userEmail,
      resolvedAccess: accessResolution,
      message: `Supabase Connected: Authenticated as ${userEmail} with verified '${accessResolution.role}' role and database read access.`,
      tableAccess: tableResults,
    };
  } catch (err: any) {
    return {
      ...baseResult,
      state: 'error',
      stateLabel: 'Connection Error',
      isDemoMode: true,
      isReachable: false,
      hasActiveSession: false,
      hasAuthorizedAccess: false,
      persistenceVerified: false,
      message: `Connection Error: ${err.message || 'Network failure'}`,
      diagnosticDetails: err.message,
    };
  }
}

/**
 * Signs in a user to Supabase Auth using email and password.
 */
export async function signInSupabaseUser(email: string, pass: string): Promise<{ success: boolean; error?: string; user?: User }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client is not available or unconfigured.' };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Sign in succeeded but no user was returned.' };
    }

    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Sign in failed.' };
  }
}

/**
 * Signs out the current Supabase session.
 */
export async function signOutSupabaseUser(): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch {
      // ignore
    }
  }
}

/**
 * Accurate Canonical Schema Reference for the 13 existing tables.
 * Discloses the true database tables, relationships, and columns.
 */
export const CANONICAL_SCHEMA_DOCS = [
  {
    table: 'hospitals',
    description: 'Registered hospital institutions and health systems.',
    columns: ['id (uuid)', 'name (text)', 'registration_number (text)', 'status (text)', 'created_at (timestamptz)', 'approved_at (timestamptz)', 'approved_by (text)'],
  },
  {
    table: 'hospital_branches',
    description: 'Clinical facility branches, ambulatory pavilions, and outpatient centers.',
    columns: ['id (uuid)', 'hospital_id (uuid -> hospitals.id)', 'name (text)', 'address (text)', 'city (text)', 'state (text)', 'phone (text)', 'created_at (timestamptz)'],
  },
  {
    table: 'profiles',
    description: 'User accounts, platform roles, and credential metadata.',
    columns: ['id (uuid -> auth.users.id)', 'full_name (text)', 'phone (text)', 'platform_role (text)', 'created_at (timestamptz)', 'updated_at (timestamptz)'],
  },
  {
    table: 'hospital_memberships',
    description: 'Staff affiliation linking users to specific hospitals and facility branches.',
    columns: ['id (uuid)', 'hospital_id (uuid -> hospitals.id)', 'user_id (uuid -> profiles.id)', 'branch_id (uuid -> hospital_branches.id)', 'role (text)', 'status (text)', 'created_at (timestamptz)'],
  },
  {
    table: 'patients',
    description: 'Registered patients enrolled in post-discharge transitional care cohorts.',
    columns: ['id (uuid)', 'hospital_id (uuid -> hospitals.id)', 'branch_id (uuid)', 'patient_user_id (uuid -> auth.users.id)', 'patient_number (text)', 'full_name (text)', 'date_of_birth (date)', 'phone (text)', 'preferred_language (text)', 'created_at (timestamptz)'],
  },
  {
    table: 'care_team_assignments',
    description: 'Primary and secondary clinician/coordinator patient assignments.',
    columns: ['id (uuid)', 'hospital_id (uuid -> hospitals.id)', 'patient_id (uuid -> patients.id)', 'staff_user_id (uuid -> profiles.id)', 'assigned_by (text)', 'created_at (timestamptz)'],
  },
  {
    table: 'care_plans',
    description: 'Personalized recovery plans and clinical continuity pathways.',
    columns: ['id (uuid)', 'hospital_id (uuid -> hospitals.id)', 'patient_id (uuid -> patients.id)', 'title (text)', 'notes (text)', 'status (text)', 'start_date (date)', 'end_date (date)', 'created_at (timestamptz)'],
  },
  {
    table: 'care_plan_tasks',
    description: 'Recovery tasks, vital sign checks, and self-management actions (schema contains status and completed_at).',
    columns: ['id (uuid)', 'hospital_id (uuid)', 'care_plan_id (uuid -> care_plans.id)', 'patient_id (uuid -> patients.id)', 'title (text)', 'description (text)', 'due_at (timestamptz)', 'status (text: pending|in_progress|completed|cancelled)', 'completed_at (timestamptz)', 'created_at (timestamptz)'],
  },
  {
    table: 'appointments',
    description: 'Scheduled post-acute follow-up appointments and telehealth visits.',
    columns: ['id (uuid)', 'hospital_id (uuid)', 'branch_id (uuid)', 'patient_id (uuid -> patients.id)', 'assigned_staff_user_id (uuid)', 'scheduled_at (timestamptz)', 'appointment_type (text)', 'status (text: scheduled|completed|missed|cancelled)', 'notes (text)', 'created_at (timestamptz)'],
  },
  {
    table: 'medication_schedules',
    description: 'Discharge prescriptions, dosing timing, and patient reconciliation records.',
    columns: ['id (uuid)', 'hospital_id (uuid)', 'patient_id (uuid -> patients.id)', 'medication_name (text)', 'instructions (text)', 'schedule_text (text)', 'starts_on (date)', 'ends_on (date)', 'status (text)', 'created_at (timestamptz)'],
  },
  {
    table: 'follow_up_gaps',
    description: 'Rule-engine detected clinical continuity gaps (missed visits, unverified meds, vital lapses).',
    columns: ['id (uuid)', 'hospital_id (uuid)', 'patient_id (uuid -> patients.id)', 'related_appointment_id (uuid)', 'related_task_id (uuid)', 'gap_type (text)', 'severity (text: critical|high|moderate)', 'summary (text)', 'recommended_next_step (text)', 'status (text: unresolved|in_progress|resolved)', 'detected_at (timestamptz)', 'resolved_at (timestamptz)', 'created_at (timestamptz)'],
  },
  {
    table: 'care_coordination_events',
    description: 'Outreach events, coordinator phone calls, SMS reminders, and home visits.',
    columns: ['id (uuid)', 'hospital_id (uuid)', 'patient_id (uuid -> patients.id)', 'event_type (text)', 'summary (text)', 'details (jsonb)', 'created_by (uuid)', 'created_at (timestamptz)'],
  },
  {
    table: 'audit_logs',
    description: 'Immutable audit trail of clinical actions and status modifications.',
    columns: ['id (uuid)', 'hospital_id (uuid)', 'actor_user_id (uuid)', 'action (text)', 'resource_type (text)', 'resource_id (text)', 'details (jsonb)', 'created_at (timestamptz)'],
  },
];
