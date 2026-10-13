import {
  Hospital,
  HospitalBranch,
  Patient,
  CareTask,
  MedicationSchedule,
  Appointment,
  FollowUpGap,
  CoordinationLog,
  CarePlan,
} from '../types';
import {
  DbHospital,
  DbHospitalBranch,
  DbPatient,
  DbCarePlanTask,
  DbMedicationSchedule,
  DbAppointment,
  DbFollowUpGap,
  DbCareCoordinationEvent,
  DbCarePlan,
} from './database.types';

// ==========================================
// 1. Hospital Branch Mappers
// ==========================================

export function mapDbBranchToBranch(db: DbHospitalBranch): HospitalBranch {
  return {
    id: db.id,
    hospitalId: db.hospital_id,
    name: db.name,
    facilityType: 'Ambulatory Care',
    address: [db.address, db.city, db.state].filter(Boolean).join(', ') || 'Address unlisted',
    phone: db.phone || '',
    leadCoordinator: 'Assigned Lead',
    activeCensus: 0,
  };
}

export function mapBranchToDbBranch(branch: HospitalBranch): Partial<DbHospitalBranch> {
  return {
    id: branch.id.startsWith('branch-') ? undefined : branch.id,
    hospital_id: branch.hospitalId,
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
  };
}

// ==========================================
// 2. Care Plan Task Mappers (Uses real status & completed_at)
// ==========================================

export function mapDbTaskToTask(db: DbCarePlanTask): CareTask {
  const isCompleted = db.status === 'completed';
  const isOverdue =
    !isCompleted &&
    Boolean(db.due_at && new Date(db.due_at).getTime() < Date.now());

  let dueDate = new Date().toISOString().split('T')[0];
  let dueTime = '09:00 AM';

  if (db.due_at) {
    try {
      const parsedDate = new Date(db.due_at);
      dueDate = parsedDate.toISOString().split('T')[0];
      dueTime = parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      // keep fallback
    }
  }

  return {
    id: db.id,
    patientId: db.patient_id,
    title: db.title,
    category: 'vital_log',
    description: db.description || '',
    dueDate,
    dueTime,
    completed: isCompleted,
    completedAt: db.completed_at || undefined,
    overdue: isOverdue,
  };
}

export function mapTaskToDbTask(task: CareTask, hospitalId?: string): Partial<DbCarePlanTask> {
  let dueAtIso: string | null = null;
  if (task.dueDate) {
    try {
      dueAtIso = new Date(`${task.dueDate}T12:00:00Z`).toISOString();
    } catch {
      dueAtIso = null;
    }
  }

  return {
    id: task.id.startsWith('task-') ? undefined : task.id,
    hospital_id: hospitalId || null,
    patient_id: task.patientId,
    title: task.title,
    description: task.description || null,
    due_at: dueAtIso,
    status: task.completed ? 'completed' : 'pending',
    completed_at: task.completed ? (task.completedAt ? new Date(task.completedAt).toISOString() : new Date().toISOString()) : null,
  };
}

// ==========================================
// 3. Medication Schedule Mappers
// ==========================================

export function mapDbMedicationToSchedule(db: DbMedicationSchedule): MedicationSchedule {
  return {
    id: db.id,
    patientId: db.patient_id,
    name: db.medication_name,
    dosage: 'Standard dose',
    frequency: db.schedule_text || 'Daily as directed',
    timesOfDay: ['08:00 AM'],
    instructions: db.instructions || 'Take as directed by your physician',
    purpose: 'Post-discharge prescription',
    takenToday: {},
    adherenceRate: 100,
  };
}

export function mapScheduleToDbMedication(med: MedicationSchedule, hospitalId?: string): Partial<DbMedicationSchedule> {
  return {
    id: med.id.startsWith('med-') ? undefined : med.id,
    hospital_id: hospitalId || null,
    patient_id: med.patientId,
    medication_name: med.name,
    instructions: `${med.dosage} - ${med.instructions}`,
    schedule_text: med.frequency,
    status: 'active',
  };
}

// ==========================================
// 4. Follow-Up Gap Mappers
// ==========================================

export function mapDbGapToGap(
  db: DbFollowUpGap,
  patientMeta?: { name: string; age: number; diagnosis: string; daysPostDischarge: number }
): FollowUpGap {
  return {
    id: db.id,
    ruleId: db.gap_type,
    ruleName: db.summary,
    patientId: db.patient_id,
    patientName: patientMeta?.name || 'Assigned Patient',
    age: patientMeta?.age || 65,
    primaryDiagnosis: patientMeta?.diagnosis || 'Post-Acute Recovery',
    daysPostDischarge: patientMeta?.daysPostDischarge || 3,
    triggerReason: db.summary,
    clinicalRationale: 'Protocol-based gap detected in recovery continuity.',
    severity: db.severity,
    status: db.status,
    detectedAt: db.detected_at ? new Date(db.detected_at).toLocaleString() : new Date().toLocaleString(),
    assignedCoordinatorName: db.assigned_to ? 'Assigned Staff' : 'Care Team',
    recommendedAction: db.recommended_next_step,
    resolutionNotes: undefined,
    resolvedAt: db.resolved_at ? new Date(db.resolved_at).toLocaleString() : undefined,
  };
}

export function mapGapToDbGap(gap: FollowUpGap, hospitalId?: string): Partial<DbFollowUpGap> {
  return {
    id: gap.id.startsWith('gap-') ? undefined : gap.id,
    hospital_id: hospitalId || null,
    patient_id: gap.patientId,
    gap_type: gap.ruleId,
    summary: gap.ruleName,
    severity: gap.severity,
    status: gap.status,
    recommended_next_step: gap.recommendedAction,
    detected_at: gap.detectedAt ? new Date(gap.detectedAt).toISOString() : new Date().toISOString(),
    resolved_at: gap.resolvedAt ? new Date(gap.resolvedAt).toISOString() : null,
  };
}

// ==========================================
// 5. Coordination Event Mappers
// ==========================================

export function mapDbEventToCoordinationLog(db: DbCareCoordinationEvent, coordinatorName?: string): CoordinationLog {
  const details = (db.details as Record<string, any>) || {};
  return {
    id: db.id,
    patientId: db.patient_id,
    gapId: details.gap_id || undefined,
    coordinatorId: db.created_by || 'unassigned',
    coordinatorName: coordinatorName || 'Maya Lin, RN',
    actionType: (db.event_type as CoordinationLog['actionType']) || 'phone_call',
    notes: db.summary || details.notes || 'Care coordination event',
    outcome: (details.outcome as CoordinationLog['outcome']) || 'contact_successful',
    timestamp: new Date(db.created_at).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

export function mapCoordinationLogToDbEvent(log: CoordinationLog, hospitalId?: string): Partial<DbCareCoordinationEvent> {
  return {
    id: log.id.startsWith('log-') ? undefined : log.id,
    hospital_id: hospitalId || null,
    patient_id: log.patientId,
    event_type: log.actionType,
    summary: log.notes.slice(0, 200),
    details: {
      gap_id: log.gapId,
      full_notes: log.notes,
      outcome: log.outcome,
      coordinator_name: log.coordinatorName,
    },
  };
}

// ==========================================
// 6. Appointment Mappers
// ==========================================

export function mapDbAppointmentToAppointment(
  db: DbAppointment,
  meta?: { patientName?: string; providerName?: string; hospitalName?: string; branchName?: string }
): Appointment {
  return {
    id: db.id,
    patientId: db.patient_id,
    patientName: meta?.patientName || 'Assigned Patient',
    providerId: db.assigned_staff_user_id || 'user-doc-01',
    providerName: meta?.providerName || 'Attending Physician',
    department: 'Outpatient Care',
    hospitalName: meta?.hospitalName || 'Metro General Health System',
    branchName: meta?.branchName || 'Main Campus',
    dateTime: db.scheduled_at,
    formattedTime: new Date(db.scheduled_at).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    type: (db.appointment_type as Appointment['type']) || 'in_person_clinic',
    status: (db.status as Appointment['status']) || 'scheduled',
    notes: db.notes || undefined,
  };
}

export function mapAppointmentToDbAppointment(apt: Appointment, hospitalId?: string): Partial<DbAppointment> {
  return {
    id: apt.id.startsWith('apt-') ? undefined : apt.id,
    hospital_id: hospitalId || null,
    patient_id: apt.patientId,
    scheduled_at: apt.dateTime,
    appointment_type: apt.type,
    status: apt.status,
    notes: apt.notes || null,
  };
}

// ==========================================
// 7. Patient Mappers
// ==========================================

export function mapDbPatientToPatient(
  db: DbPatient,
  meta?: { hospitalName?: string; branchName?: string; physicianName?: string; coordinatorName?: string }
): Patient {
  let calculatedAge = 60;
  if (db.date_of_birth) {
    const birthYear = new Date(db.date_of_birth).getFullYear();
    if (!isNaN(birthYear)) {
      calculatedAge = Math.max(1, new Date().getFullYear() - birthYear);
    }
  }

  return {
    id: db.id,
    mrn: db.patient_number,
    name: db.full_name,
    age: calculatedAge,
    gender: 'Not specified',
    phone: db.phone || '',
    email: '',
    hospitalId: db.hospital_id,
    hospitalName: meta?.hospitalName || 'Metro General Health System',
    branchId: db.branch_id || 'branch-01',
    branchName: meta?.branchName || 'Main Campus',
    physicianId: 'user-doc-01',
    physicianName: meta?.physicianName || 'Dr. James Wilson, MD',
    coordinatorId: 'user-coord-01',
    coordinatorName: meta?.coordinatorName || 'Maya Lin, RN',
    primaryDiagnosis: 'Clinical Continuity Follow-Up',
    dischargeDate: new Date(db.created_at).toISOString().split('T')[0],
    daysPostDischarge: 3,
    riskTier: 'moderate',
    emergencyContact: {
      name: 'Primary Contact',
      relation: 'Family',
      phone: db.phone || '',
    },
  };
}
