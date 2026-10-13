/**
 * Canonical Database Types for NexCure
 *
 * Source of truth: The 13 existing tables in the connected Supabase project (twllcsdjzndtkmtxjosb):
 * - hospitals
 * - hospital_branches
 * - profiles
 * - hospital_memberships
 * - patients
 * - care_team_assignments
 * - care_plans
 * - care_plan_tasks
 * - appointments
 * - medication_schedules
 * - follow_up_gaps
 * - care_coordination_events
 * - audit_logs
 *
 * Verified against live database inspection (NexCure Audit Report v2).
 * Note: Never fabricate columns or invent tables.
 */

export interface DbHospital {
  id: string;
  name: string;
  registration_number: string;
  status: 'pending' | 'approved' | 'under_review' | 'suspended';
  created_at: string;
  approved_at?: string | null;
  approved_by?: string | null;
}

export interface DbHospitalBranch {
  id: string;
  hospital_id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  created_at: string;
}

export interface DbProfile {
  id: string;
  full_name: string;
  phone?: string | null;
  platform_role?: 'superadmin' | 'hospital_admin' | 'doctor' | 'coordinator' | 'patient' | null;
  created_at: string;
  updated_at?: string | null;
}

export interface DbHospitalMembership {
  id: string;
  hospital_id: string;
  user_id: string;
  branch_id?: string | null;
  role: 'hospital_admin' | 'healthcare_professional' | 'care_coordinator';
  status: 'active' | 'suspended' | 'invited';
  created_at: string;
}

export interface DbPatient {
  id: string;
  hospital_id: string;
  branch_id?: string | null;
  patient_user_id?: string | null;
  patient_number: string;
  full_name: string;
  date_of_birth: string;
  phone?: string | null;
  preferred_language?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface DbCareTeamAssignment {
  id: string;
  hospital_id: string;
  patient_id: string;
  staff_user_id: string;
  assigned_by?: string | null;
  created_at: string;
}

export interface DbCarePlan {
  id: string;
  hospital_id: string;
  patient_id: string;
  title: string;
  notes?: string | null;
  status: 'active' | 'completed' | 'revised' | 'draft';
  start_date?: string | null;
  end_date?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface DbCarePlanTask {
  id: string;
  hospital_id?: string | null;
  care_plan_id?: string | null;
  patient_id: string;
  title: string;
  description?: string | null;
  due_at?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completed_at?: string | null;
  created_at: string;
}

export interface DbAppointment {
  id: string;
  hospital_id?: string | null;
  branch_id?: string | null;
  patient_id: string;
  assigned_staff_user_id?: string | null;
  scheduled_at: string;
  appointment_type: 'in_person_clinic' | 'telehealth' | 'diagnostic_lab' | 'rehabilitation';
  notes?: string | null;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  created_by?: string | null;
  created_at: string;
}

export interface DbMedicationSchedule {
  id: string;
  hospital_id?: string | null;
  patient_id: string;
  medication_name: string;
  instructions?: string | null;
  schedule_text?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  status?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface DbFollowUpGap {
  id: string;
  hospital_id?: string | null;
  patient_id: string;
  related_appointment_id?: string | null;
  related_task_id?: string | null;
  gap_type: string;
  severity: 'critical' | 'high' | 'moderate';
  summary: string;
  recommended_next_step: string;
  status: 'unresolved' | 'in_progress' | 'resolved';
  detected_at: string;
  resolved_at?: string | null;
  assigned_to?: string | null;
  created_at: string;
}

export interface DbCareCoordinationEvent {
  id: string;
  hospital_id?: string | null;
  patient_id: string;
  event_type: 'phone_call' | 'sms_reminder' | 'telehealth_booked' | 'home_visit_dispatched' | 'physician_escalation';
  summary: string;
  details?: Record<string, unknown> | null;
  created_by?: string | null;
  created_at: string;
}

export interface DbAuditLog {
  id: string;
  hospital_id?: string | null;
  actor_user_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export const CANONICAL_TABLES = {
  HOSPITALS: 'hospitals',
  HOSPITAL_BRANCHES: 'hospital_branches',
  PROFILES: 'profiles',
  HOSPITAL_MEMBERSHIPS: 'hospital_memberships',
  PATIENTS: 'patients',
  CARE_TEAM_ASSIGNMENTS: 'care_team_assignments',
  CARE_PLANS: 'care_plans',
  CARE_PLAN_TASKS: 'care_plan_tasks',
  APPOINTMENTS: 'appointments',
  MEDICATION_SCHEDULES: 'medication_schedules',
  FOLLOW_UP_GAPS: 'follow_up_gaps',
  CARE_COORDINATION_EVENTS: 'care_coordination_events',
  AUDIT_LOGS: 'audit_logs',
} as const;

export type CanonicalTableName = (typeof CANONICAL_TABLES)[keyof typeof CANONICAL_TABLES];
