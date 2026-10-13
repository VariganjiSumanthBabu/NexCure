export type UserRole =
  | 'superadmin'
  | 'hospital_admin'
  | 'doctor'
  | 'coordinator'
  | 'patient';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatarUrl?: string;
  hospitalId?: string;
  hospitalName?: string;
  branchId?: string;
  branchName?: string;
  department?: string;
  phone?: string;
  organization?: string;
}

export type HospitalStatus = 'pending' | 'approved' | 'under_review' | 'suspended';

export interface Hospital {
  id: string;
  name: string;
  registrationNumber: string;
  status: HospitalStatus;
  licenseNumber: string;
  address: string;
  city: string;
  state: string;
  bedCapacity: number;
  activePatientsCount: number;
  branchesCount: number;
  accreditedBody: string;
  primaryContactName: string;
  primaryContactEmail: string;
  appliedAt: string;
  approvedAt?: string;
}

export interface HospitalBranch {
  id: string;
  hospitalId: string;
  name: string;
  facilityType: 'Main Campus' | 'Ambulatory Care' | 'Post-Acute Rehab' | 'Regional Outpatient';
  address: string;
  phone: string;
  leadCoordinator: string;
  activeCensus: number;
}

export type RiskTier = 'low' | 'moderate' | 'high';

export interface Patient {
  id: string;
  mrn: string; // Medical Record Number
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  hospitalId: string;
  hospitalName: string;
  branchId: string;
  branchName: string;
  physicianId: string;
  physicianName: string;
  coordinatorId: string;
  coordinatorName: string;
  primaryDiagnosis: string;
  surgeryOrProcedure?: string;
  dischargeDate: string;
  daysPostDischarge: number;
  riskTier: RiskTier;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  keyVitals?: {
    bloodPressure?: string;
    heartRate?: number;
    weightLbs?: number;
    glucoseMgDl?: number;
    oxygenSat?: number;
    lastRecorded?: string;
  };
}

export interface CareTask {
  id: string;
  patientId: string;
  title: string;
  category: 'vital_log' | 'wound_check' | 'medication_confirmation' | 'mobility' | 'dietary' | 'symptom_report';
  description: string;
  dueDate: string;
  dueTime: string;
  completed: boolean;
  completedAt?: string;
  overdue: boolean;
}

export interface MedicationSchedule {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  timesOfDay: string[];
  instructions: string;
  purpose: string;
  takenToday: Record<string, boolean>; // e.g. { "08:00 AM": true, "08:00 PM": false }
  adherenceRate: number; // percentage e.g. 94
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'missed' | 'cancelled';
export type AppointmentType = 'in_person_clinic' | 'telehealth' | 'diagnostic_lab' | 'rehabilitation';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  department: string;
  hospitalName: string;
  branchName: string;
  dateTime: string;
  formattedTime: string;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  telehealthLink?: string;
  clinicRoom?: string;
}

export type GapSeverity = 'critical' | 'high' | 'moderate';
export type GapStatus = 'unresolved' | 'in_progress' | 'resolved';

export interface FollowUpGap {
  id: string;
  ruleId: string;
  ruleName: string;
  patientId: string;
  patientName: string;
  age: number;
  primaryDiagnosis: string;
  daysPostDischarge: number;
  triggerReason: string;
  clinicalRationale: string;
  severity: GapSeverity;
  status: GapStatus;
  detectedAt: string;
  assignedCoordinatorName: string;
  recommendedAction: string;
  resolutionNotes?: string;
  resolvedAt?: string;
}

export interface CoordinationLog {
  id: string;
  patientId: string;
  gapId?: string;
  coordinatorId: string;
  coordinatorName: string;
  actionType: 'phone_call' | 'sms_reminder' | 'telehealth_booked' | 'home_visit_dispatched' | 'physician_escalation';
  notes: string;
  outcome: 'contact_successful' | 'voicemail_left' | 'appointment_secured' | 'escalation_pending' | 'resolved';
  timestamp: string;
}

export interface CarePlan {
  id: string;
  patientId: string;
  patientName: string;
  physicianName: string;
  targetRecoveryWeeks: number;
  recoveryMilestones: {
    day: number;
    title: string;
    description: string;
    completed: boolean;
  }[];
  vitalLimits: {
    metric: string;
    min: number;
    max: number;
    unit: string;
  }[];
  redFlagSymptoms: string[];
  followUpScheduleGuidelines: string;
}
