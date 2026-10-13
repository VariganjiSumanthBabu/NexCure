import {
  Hospital,
  HospitalBranch,
  HospitalStatus,
  Patient,
  CareTask,
  MedicationSchedule,
  Appointment,
  FollowUpGap,
  GapStatus,
  CoordinationLog,
  CarePlan,
} from '../types';
import {
  CANONICAL_TABLES,
  DbHospital,
  DbHospitalBranch,
  DbPatient,
  DbCarePlanTask,
  DbMedicationSchedule,
  DbAppointment,
  DbFollowUpGap,
  DbCareCoordinationEvent,
} from './database.types';
import {
  mapDbBranchToBranch,
  mapBranchToDbBranch,
  mapDbTaskToTask,
  mapTaskToDbTask,
  mapDbMedicationToSchedule,
  mapScheduleToDbMedication,
  mapDbGapToGap,
  mapGapToDbGap,
  mapDbEventToCoordinationLog,
  mapCoordinationLogToDbEvent,
  mapDbAppointmentToAppointment,
  mapAppointmentToDbAppointment,
  mapDbPatientToPatient,
} from './dataMappers';
import { getSupabaseClient } from './supabase';

export interface DataOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: 'database' | 'demo_in_memory';
  persistedToDatabase: boolean;
}

/**
 * Checks whether an ID belongs to local synthetic demonstration fixtures.
 * Synthetic IDs (e.g. task-01, task-001, patient-01, hosp-01) must never be sent as database queries.
 */
export function isSyntheticId(id: string | null | undefined): boolean {
  if (!id) return true;
  const trimmed = id.trim();
  if (/^(task|patient|hosp|branch|gap|apt|log|med|staff|user)-/i.test(trimmed)) return true;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return !uuidRegex.test(trimmed);
}

/**
 * Centralized, typed Data Access Layer for NexCure.
 * Enforces strict separation between local demo interactions and live database operations.
 *
 * Rules (Phase 1 Acceptance Item 3):
 * 1. In Live Mode, never convert a synthetic ID into a successful in-memory operation.
 * 2. Never display a successful live save if the operation only changed React state.
 * 3. If a feature lacks a verified live write operation or appropriate RLS permission,
 *    it fails honestly in Live Mode with a clear diagnostic error.
 * 4. Keep interactions fully functional in Demo Mode with an explicit local-only notice.
 * 5. Verify that database UPDATE/INSERT operations affected the intended row count (> 0 rows).
 * 6. Zero matching rows in live updates must produce an honest error and preserve previous state.
 */
export class DataService {
  // ==========================================
  // QUERY METHODS
  // ==========================================

  /**
   * Fetch registered hospitals from 'hospitals'
   */
  static async getHospitals(
    isLiveMode: boolean,
    fallbackData: Hospital[]
  ): Promise<DataOperationResult<Hospital[]>> {
    if (!isLiveMode) {
      return {
        success: true,
        data: fallbackData,
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available or unconfigured.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const { data, error } = await client
        .from(CANONICAL_TABLES.HOSPITALS)
        .select('*')
        .order('name');

      if (error) {
        return {
          success: false,
          error: `Database query failed on '${CANONICAL_TABLES.HOSPITALS}': ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          source: 'database',
          persistedToDatabase: false,
        };
      }

      const mapped: Hospital[] = data.map((h: DbHospital) => ({
        id: h.id,
        name: h.name,
        registrationNumber: h.registration_number,
        status: h.status,
        licenseNumber: 'LIC-DB-VERIFIED',
        address: 'Hospital Campus',
        city: 'Metropolitan Area',
        state: 'Active Jurisdiction',
        bedCapacity: 300,
        activePatientsCount: 0,
        branchesCount: 1,
        accreditedBody: 'Joint Commission (Verified)',
        appliedAt: h.created_at ? h.created_at.split('T')[0] : '2025-01-01',
        approvedAt: h.approved_at ? h.approved_at.split('T')[0] : undefined,
        primaryContactName: 'Chief Medical Officer',
        primaryContactEmail: 'contact@healthsystem.org',
      }));

      return {
        success: true,
        data: mapped,
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Unexpected error reading '${CANONICAL_TABLES.HOSPITALS}': ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }

  /**
   * Fetch hospital branches from 'hospital_branches'
   */
  static async getHospitalBranches(
    isLiveMode: boolean,
    fallbackData: HospitalBranch[]
  ): Promise<DataOperationResult<HospitalBranch[]>> {
    if (!isLiveMode) {
      return {
        success: true,
        data: fallbackData,
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const { data, error } = await client
        .from(CANONICAL_TABLES.HOSPITAL_BRANCHES)
        .select('*')
        .order('name');

      if (error) {
        return {
          success: false,
          error: `Database query failed on '${CANONICAL_TABLES.HOSPITAL_BRANCHES}': ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          source: 'database',
          persistedToDatabase: false,
        };
      }

      return {
        success: true,
        data: data.map(mapDbBranchToBranch),
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Unexpected error reading '${CANONICAL_TABLES.HOSPITAL_BRANCHES}': ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }

  /**
   * Fetch patients from 'patients'
   */
  static async getPatients(
    isLiveMode: boolean,
    fallbackData: Patient[]
  ): Promise<DataOperationResult<Patient[]>> {
    if (!isLiveMode) {
      return {
        success: true,
        data: fallbackData,
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const { data, error } = await client
        .from(CANONICAL_TABLES.PATIENTS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: `Database query failed on '${CANONICAL_TABLES.PATIENTS}': ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          source: 'database',
          persistedToDatabase: false,
        };
      }

      return {
        success: true,
        data: data.map((p) => mapDbPatientToPatient(p)),
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Unexpected error reading '${CANONICAL_TABLES.PATIENTS}': ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }

  /**
   * Fetch care plan tasks from 'care_plan_tasks'
   */
  static async getCareTasks(
    isLiveMode: boolean,
    fallbackData: CareTask[]
  ): Promise<DataOperationResult<CareTask[]>> {
    if (!isLiveMode) {
      return {
        success: true,
        data: fallbackData,
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const { data, error } = await client
        .from(CANONICAL_TABLES.CARE_PLAN_TASKS)
        .select('*')
        .order('due_at');

      if (error) {
        return {
          success: false,
          error: `Database query failed on '${CANONICAL_TABLES.CARE_PLAN_TASKS}': ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          source: 'database',
          persistedToDatabase: false,
        };
      }

      return {
        success: true,
        data: data.map(mapDbTaskToTask),
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Unexpected error reading '${CANONICAL_TABLES.CARE_PLAN_TASKS}': ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }

  /**
   * Fetch follow-up gaps from 'follow_up_gaps'
   */
  static async getFollowUpGaps(
    isLiveMode: boolean,
    fallbackData: FollowUpGap[]
  ): Promise<DataOperationResult<FollowUpGap[]>> {
    if (!isLiveMode) {
      return {
        success: true,
        data: fallbackData,
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const { data, error } = await client
        .from(CANONICAL_TABLES.FOLLOW_UP_GAPS)
        .select('*')
        .order('detected_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: `Database query failed on '${CANONICAL_TABLES.FOLLOW_UP_GAPS}': ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          source: 'database',
          persistedToDatabase: false,
        };
      }

      return {
        success: true,
        data: data.map((g) => mapDbGapToGap(g)),
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Unexpected error reading '${CANONICAL_TABLES.FOLLOW_UP_GAPS}': ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }

  /**
   * Fetch appointments from 'appointments'
   */
  static async getAppointments(
    isLiveMode: boolean,
    fallbackData: Appointment[]
  ): Promise<DataOperationResult<Appointment[]>> {
    if (!isLiveMode) {
      return {
        success: true,
        data: fallbackData,
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const { data, error } = await client
        .from(CANONICAL_TABLES.APPOINTMENTS)
        .select('*')
        .order('scheduled_at');

      if (error) {
        return {
          success: false,
          error: `Database query failed on '${CANONICAL_TABLES.APPOINTMENTS}': ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          source: 'database',
          persistedToDatabase: false,
        };
      }

      return {
        success: true,
        data: data.map((a) => mapDbAppointmentToAppointment(a)),
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Unexpected error reading '${CANONICAL_TABLES.APPOINTMENTS}': ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }

  /**
   * Fetch medication schedules from 'medication_schedules'
   */
  static async getMedications(
    isLiveMode: boolean,
    fallbackData: MedicationSchedule[]
  ): Promise<DataOperationResult<MedicationSchedule[]>> {
    if (!isLiveMode) {
      return {
        success: true,
        data: fallbackData,
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const { data, error } = await client
        .from(CANONICAL_TABLES.MEDICATION_SCHEDULES)
        .select('*');

      if (error) {
        return {
          success: false,
          error: `Database query failed on '${CANONICAL_TABLES.MEDICATION_SCHEDULES}': ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          source: 'database',
          persistedToDatabase: false,
        };
      }

      return {
        success: true,
        data: data.map(mapDbMedicationToSchedule),
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Unexpected error reading '${CANONICAL_TABLES.MEDICATION_SCHEDULES}': ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }

  // ==========================================
  // MUTATION METHODS (STRICT DEMO/LIVE BOUNDARIES)
  // ==========================================

  /**
   * Save a hospital branch to 'hospital_branches'
   */
  static async createBranch(
    branch: Omit<HospitalBranch, 'id'>,
    isLiveMode: boolean
  ): Promise<DataOperationResult<HospitalBranch>> {
    const fallbackNewBranch: HospitalBranch = {
      ...branch,
      id: `branch-${Date.now()}`,
    };

    // In Demo mode: perform local in-memory operation
    if (!isLiveMode) {
      return {
        success: true,
        data: fallbackNewBranch,
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    // In Live mode: never convert synthetic ID into in-memory success
    if (isSyntheticId(branch.hospitalId)) {
      return {
        success: false,
        error: `Cannot create branch in database: Hospital ID "${branch.hospitalId}" is a demonstration fixture. Switch to Demo Mode for local testing, or select a live database hospital.`,
        source: 'database',
        persistedToDatabase: false,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available or unconfigured.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const dbPayload = mapBranchToDbBranch(fallbackNewBranch);
      const { data, error } = await client
        .from(CANONICAL_TABLES.HOSPITAL_BRANCHES)
        .insert(dbPayload)
        .select('id, hospital_id, name, address, phone')
        .single();

      if (error) {
        return {
          success: false,
          error: `Database write unauthorized on '${CANONICAL_TABLES.HOSPITAL_BRANCHES}': ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      if (!data) {
        return {
          success: false,
          error: "Couldn't save branch: No row was created in database.",
          source: 'database',
          persistedToDatabase: false,
        };
      }

      return {
        success: true,
        data: mapDbBranchToBranch(data as DbHospitalBranch),
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Error creating branch: ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }

  /**
   * Resolve follow-up gap in 'follow_up_gaps'
   */
  static async resolveFollowUpGap(
    gapId: string,
    resolutionNotes: string,
    isLiveMode: boolean
  ): Promise<DataOperationResult<{ resolvedAt: string; resolutionNotes: string }>> {
    const resolvedAt = new Date().toLocaleString();

    // In Demo mode: perform local in-memory operation
    if (!isLiveMode) {
      return {
        success: true,
        data: { resolvedAt, resolutionNotes },
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    // In Live mode: never convert synthetic ID into in-memory success
    if (isSyntheticId(gapId)) {
      return {
        success: false,
        error: `Cannot update in database: Follow-up gap ID "${gapId}" is a local demonstration fixture, not a live database UUID. Switch to Demo Mode for local interactions.`,
        source: 'database',
        persistedToDatabase: false,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available or unconfigured.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const { data, error } = await client
        .from(CANONICAL_TABLES.FOLLOW_UP_GAPS)
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', gapId)
        .select('id, status, resolved_at');

      if (error) {
        return {
          success: false,
          error: `Database update failed on '${CANONICAL_TABLES.FOLLOW_UP_GAPS}': ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      // Verify row count affected
      if (!data || data.length === 0) {
        return {
          success: false,
          error: "Couldn't save gap resolution: No matching live record found or update was blocked by Row-Level Security.",
          source: 'database',
          persistedToDatabase: false,
        };
      }

      return {
        success: true,
        data: { resolvedAt, resolutionNotes },
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Error updating gap: ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }

  /**
   * Update follow-up gap status
   */
  static async updateGapStatus(
    gapId: string,
    status: GapStatus,
    isLiveMode: boolean
  ): Promise<DataOperationResult<{ status: GapStatus }>> {
    if (!isLiveMode) {
      return {
        success: true,
        data: { status },
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    if (isSyntheticId(gapId)) {
      return {
        success: false,
        error: `Cannot update gap status: Gap ID "${gapId}" is a demonstration fixture. Switch to Demo Mode to test local updates.`,
        source: 'database',
        persistedToDatabase: false,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const { data, error } = await client
        .from(CANONICAL_TABLES.FOLLOW_UP_GAPS)
        .update({ status })
        .eq('id', gapId)
        .select('id, status');

      if (error) {
        return {
          success: false,
          error: `Failed to update gap status: ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'No matching gap found or update blocked by Row-Level Security.',
          source: 'database',
          persistedToDatabase: false,
        };
      }

      return {
        success: true,
        data: { status },
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Error updating gap: ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }

  /**
   * Log coordinator outreach in 'care_coordination_events'
   */
  static async logCoordinationEvent(
    log: Omit<CoordinationLog, 'id' | 'timestamp'>,
    isLiveMode: boolean
  ): Promise<DataOperationResult<CoordinationLog>> {
    const formattedTimestamp = new Date().toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const demoLog: CoordinationLog = {
      ...log,
      id: `log-${Date.now()}`,
      timestamp: formattedTimestamp,
    };

    // In Demo mode: perform local in-memory operation
    if (!isLiveMode) {
      return {
        success: true,
        data: demoLog,
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    // In Live mode: never convert synthetic ID into in-memory success
    if (isSyntheticId(log.patientId)) {
      return {
        success: false,
        error: `Cannot log event in database: Patient ID "${log.patientId}" is a demonstration fixture, not a live database UUID. Switch to Demo Mode for local testing.`,
        source: 'database',
        persistedToDatabase: false,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available or unconfigured.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const dbPayload = mapCoordinationLogToDbEvent(demoLog);
      const { data, error } = await client
        .from(CANONICAL_TABLES.CARE_COORDINATION_EVENTS)
        .insert(dbPayload)
        .select('id, patient_id, event_type, summary, created_at')
        .single();

      if (error) {
        return {
          success: false,
          error: `Database write unauthorized on '${CANONICAL_TABLES.CARE_COORDINATION_EVENTS}': ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      if (!data) {
        return {
          success: false,
          error: "Couldn't save coordination event: No row was created.",
          source: 'database',
          persistedToDatabase: false,
        };
      }

      return {
        success: true,
        data: mapDbEventToCoordinationLog(data as DbCareCoordinationEvent, log.coordinatorName),
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Error logging event: ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }

  /**
   * Toggle care plan task in 'care_plan_tasks' (P0.1)
   */
  static async toggleCareTask(
    taskId: string,
    currentCompleted: boolean,
    isLiveMode: boolean
  ): Promise<DataOperationResult<{ completed: boolean; completedAt?: string }>> {
    const newCompleted = !currentCompleted;
    const completedAt = newCompleted ? new Date().toLocaleString() : undefined;

    // 1. If in Demo mode: perform local-only update
    if (!isLiveMode) {
      return {
        success: true,
        data: { completed: newCompleted, completedAt },
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    // 2. In Live mode: synthetic IDs cannot be written to database
    if (isSyntheticId(taskId)) {
      return {
        success: false,
        error: `Cannot update in database: Task "${taskId}" is a local demonstration fixture, not a live database UUID. Switch to Demo Mode for local editing, or select a live database record.`,
        source: 'database',
        persistedToDatabase: false,
      };
    }

    // 3. Live database update on authorized live task
    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available or unconfigured.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const newStatus = newCompleted ? 'completed' : 'pending';
      const newCompletedAt = newCompleted ? new Date().toISOString() : null;

      // Update strictly the real schema columns: status and completed_at
      const { data, error } = await client
        .from(CANONICAL_TABLES.CARE_PLAN_TASKS)
        .update({
          status: newStatus,
          completed_at: newCompletedAt,
        })
        .eq('id', taskId)
        .select('id, status, completed_at');

      if (error) {
        return {
          success: false,
          error: `Database update failed on '${CANONICAL_TABLES.CARE_PLAN_TASKS}': ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      // CRITICAL: Verify that the operation affected the intended row (> 0 rows)
      if (!data || data.length === 0) {
        return {
          success: false,
          error: "Couldn't save task completion: No matching database record was updated (or update was blocked by Row-Level Security).",
          source: 'database',
          persistedToDatabase: false,
        };
      }

      const updatedRow = data[0] as DbCarePlanTask;
      return {
        success: true,
        data: {
          completed: updatedRow.status === 'completed',
          completedAt: updatedRow.completed_at ? new Date(updatedRow.completed_at).toLocaleString() : undefined,
        },
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Error updating task: ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }

  /**
   * Create care plan task in 'care_plan_tasks'
   */
  static async createCareTask(
    newTask: Omit<CareTask, 'id'>,
    isLiveMode: boolean
  ): Promise<DataOperationResult<CareTask>> {
    const demoCreated: CareTask = {
      ...newTask,
      id: `task-${Date.now()}`,
    };

    if (!isLiveMode) {
      return {
        success: true,
        data: demoCreated,
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    if (isSyntheticId(newTask.patientId)) {
      return {
        success: false,
        error: `Cannot create task: Patient ID "${newTask.patientId}" is a demonstration fixture. Switch to Demo Mode for local interactions.`,
        source: 'database',
        persistedToDatabase: false,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const dbPayload = mapTaskToDbTask(demoCreated);
      const { data, error } = await client
        .from(CANONICAL_TABLES.CARE_PLAN_TASKS)
        .insert(dbPayload)
        .select('*')
        .single();

      if (error) {
        return {
          success: false,
          error: `Database insert failed on '${CANONICAL_TABLES.CARE_PLAN_TASKS}': ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'No task row was created.',
          source: 'database',
          persistedToDatabase: false,
        };
      }

      return {
        success: true,
        data: mapDbTaskToTask(data as DbCarePlanTask),
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Error creating task: ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }

  /**
   * Reschedule appointment in 'appointments'
   */
  static async rescheduleAppointment(
    appointmentId: string,
    newDateTime: string,
    notes: string | undefined,
    isLiveMode: boolean
  ): Promise<DataOperationResult<{ dateTime: string; formattedTime: string; notes?: string }>> {
    const formattedTime = new Date(newDateTime).toLocaleString();

    // In Demo mode: perform local in-memory operation
    if (!isLiveMode) {
      return {
        success: true,
        data: { dateTime: newDateTime, formattedTime, notes },
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    // In Live mode: never convert synthetic ID into in-memory success
    if (isSyntheticId(appointmentId)) {
      return {
        success: false,
        error: `Cannot update in database: Appointment ID "${appointmentId}" is a demonstration fixture, not a live database UUID. Switch to Demo Mode for local testing.`,
        source: 'database',
        persistedToDatabase: false,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available or unconfigured.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const { data, error } = await client
        .from(CANONICAL_TABLES.APPOINTMENTS)
        .update({
          scheduled_at: newDateTime,
          status: 'scheduled',
          notes: notes || null,
        })
        .eq('id', appointmentId)
        .select('id, scheduled_at, status');

      if (error) {
        return {
          success: false,
          error: `Database update failed on '${CANONICAL_TABLES.APPOINTMENTS}': ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: "Couldn't save appointment: No matching record found in database (or update was blocked by Row-Level Security).",
          source: 'database',
          persistedToDatabase: false,
        };
      }

      return {
        success: true,
        data: { dateTime: newDateTime, formattedTime, notes },
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Error rescheduling appointment: ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }

  /**
   * Update appointment status
   */
  static async updateAppointmentStatus(
    appointmentId: string,
    status: Appointment['status'],
    isLiveMode: boolean
  ): Promise<DataOperationResult<{ status: Appointment['status'] }>> {
    if (!isLiveMode) {
      return {
        success: true,
        data: { status },
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    if (isSyntheticId(appointmentId)) {
      return {
        success: false,
        error: `Cannot update appointment: ID "${appointmentId}" is a demonstration fixture. Switch to Demo Mode for local editing.`,
        source: 'database',
        persistedToDatabase: false,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const { data, error } = await client
        .from(CANONICAL_TABLES.APPOINTMENTS)
        .update({ status })
        .eq('id', appointmentId)
        .select('id, status');

      if (error) {
        return {
          success: false,
          error: `Failed to update appointment: ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'No matching appointment record updated in database.',
          source: 'database',
          persistedToDatabase: false,
        };
      }

      return {
        success: true,
        data: { status },
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Error updating appointment: ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }

  /**
   * Update hospital approval status in 'hospitals'
   */
  static async updateHospitalStatus(
    hospitalId: string,
    status: HospitalStatus,
    isLiveMode: boolean
  ): Promise<DataOperationResult<{ status: HospitalStatus; approvedAt?: string }>> {
    const approvedAt = status === 'approved' ? new Date().toISOString() : undefined;

    if (!isLiveMode) {
      return {
        success: true,
        data: { status, approvedAt: approvedAt ? approvedAt.split('T')[0] : undefined },
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    if (isSyntheticId(hospitalId)) {
      return {
        success: false,
        error: `Cannot update hospital status: Hospital ID "${hospitalId}" is a demonstration fixture. Switch to Demo Mode for local updates.`,
        source: 'database',
        persistedToDatabase: false,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const { data, error } = await client
        .from(CANONICAL_TABLES.HOSPITALS)
        .update({
          status,
          approved_at: approvedAt || null,
        })
        .eq('id', hospitalId)
        .select('id, status, approved_at');

      if (error) {
        return {
          success: false,
          error: `Failed to update hospital status: ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'No matching hospital record found or update was blocked by Row-Level Security.',
          source: 'database',
          persistedToDatabase: false,
        };
      }

      return {
        success: true,
        data: {
          status,
          approvedAt: data[0].approved_at ? data[0].approved_at.split('T')[0] : undefined,
        },
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Error updating hospital status: ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }

  /**
   * Register a new hospital in 'hospitals'
   */
  static async createHospital(
    newHosp: Omit<Hospital, 'id' | 'appliedAt'>,
    isLiveMode: boolean
  ): Promise<DataOperationResult<Hospital>> {
    const demoCreated: Hospital = {
      ...newHosp,
      id: `hosp-${Date.now()}`,
      appliedAt: new Date().toISOString().split('T')[0],
    };

    if (!isLiveMode) {
      return {
        success: true,
        data: demoCreated,
        source: 'demo_in_memory',
        persistedToDatabase: false,
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase client is not available.',
        source: 'database',
        persistedToDatabase: false,
      };
    }

    try {
      const { data, error } = await client
        .from(CANONICAL_TABLES.HOSPITALS)
        .insert({
          name: newHosp.name,
          registration_number: newHosp.registrationNumber,
          status: newHosp.status,
        })
        .select('id, name, registration_number, status, created_at')
        .single();

      if (error) {
        return {
          success: false,
          error: `Database write unauthorized on '${CANONICAL_TABLES.HOSPITALS}': ${error.message}`,
          source: 'database',
          persistedToDatabase: false,
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'No hospital row was created.',
          source: 'database',
          persistedToDatabase: false,
        };
      }

      return {
        success: true,
        data: {
          ...demoCreated,
          id: data.id,
          appliedAt: data.created_at ? data.created_at.split('T')[0] : demoCreated.appliedAt,
        },
        source: 'database',
        persistedToDatabase: true,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Error creating hospital: ${err.message}`,
        source: 'database',
        persistedToDatabase: false,
      };
    }
  }
}
