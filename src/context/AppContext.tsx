import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserRole,
  UserProfile,
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
  INITIAL_HOSPITALS,
  INITIAL_BRANCHES,
  INITIAL_PATIENTS,
  INITIAL_CARE_TASKS,
  INITIAL_MEDICATIONS,
  INITIAL_APPOINTMENTS,
  INITIAL_FOLLOW_UP_GAPS,
  INITIAL_COORDINATION_LOGS,
  INITIAL_CARE_PLANS,
  INITIAL_STAFF,
  DEMO_USERS,
} from '../data/mockData';
import {
  testSupabaseConnection,
  saveSupabaseConfig,
  clearCustomConfig,
  signOutSupabaseUser,
  ConnectionHealth,
  SupabaseConnectionState,
} from '../lib/supabase';
import { DataService, isSyntheticId } from '../lib/dataService';

interface AppContextType {
  // Role & Session State
  currentRole: UserRole;
  currentUser: UserProfile;
  switchRole: (role: UserRole) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAccountUnprovisioned: boolean;
  unprovisionedError?: string;

  // Cohort Data State
  hospitals: Hospital[];
  updateHospitalStatus: (id: string, status: HospitalStatus) => Promise<boolean>;
  addHospital: (newHosp: Omit<Hospital, 'id' | 'appliedAt'>) => Promise<boolean>;
  branches: HospitalBranch[];
  addBranch: (newBranch: Omit<HospitalBranch, 'id'>) => Promise<boolean>;
  staff: typeof INITIAL_STAFF;
  addStaff: (member: (typeof INITIAL_STAFF)[0]) => Promise<boolean>;
  patients: Patient[];
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  selectedPatient: Patient;
  followUpGaps: FollowUpGap[];
  resolveGap: (id: string, resolutionNotes: string) => Promise<boolean>;
  updateGapStatus: (id: string, status: GapStatus) => Promise<boolean>;
  careTasks: CareTask[];
  toggleTask: (id: string) => Promise<boolean>;
  addTask: (newTask: Omit<CareTask, 'id'>) => Promise<boolean>;
  medications: MedicationSchedule[];
  toggleMedication: (id: string, time: string) => Promise<boolean>;
  appointments: Appointment[];
  rescheduleAppointment: (id: string, newDateTime: string, notes?: string) => Promise<boolean>;
  addAppointment: (newApt: Omit<Appointment, 'id'>) => Promise<boolean>;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => Promise<boolean>;
  coordinationLogs: CoordinationLog[];
  addCoordinationLog: (log: Omit<CoordinationLog, 'id' | 'timestamp'>) => Promise<boolean>;
  carePlans: Record<string, CarePlan>;
  updateCarePlan: (patientId: string, plan: CarePlan) => Promise<boolean>;

  // Truthful Database & Integrity State
  connectionHealth: ConnectionHealth;
  connectionState: SupabaseConnectionState;
  isDemoMode: boolean;
  activeDataSource: 'demo' | 'live';
  showDbModal: boolean;
  setShowDbModal: (show: boolean) => void;

  // Actions
  checkConnection: () => Promise<void>;
  enableDemoMode: () => Promise<void>;
  resetToEnvConfig: () => Promise<void>;
  signOut: () => Promise<void>;

  // Notice & Diagnostic messages
  lastDatabaseError: string | null;
  lastDatabaseNotice: string | null;
  clearDatabaseMessages: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getDefaultTabForRole = (role: UserRole): string => {
    switch (role) {
      case 'coordinator':
        return 'overview';
      case 'patient':
        return 'today';
      case 'doctor':
        return 'roster';
      case 'hospital_admin':
        return 'workspace';
      case 'superadmin':
        return 'registrations';
      default:
        return 'overview';
    }
  };

  const [currentRole, setCurrentRole] = useState<UserRole>('coordinator');
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_USERS.coordinator);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isAccountUnprovisioned, setIsAccountUnprovisioned] = useState<boolean>(false);
  const [unprovisionedError, setUnprovisionedError] = useState<string | undefined>(undefined);

  // Entities
  const [hospitals, setHospitals] = useState<Hospital[]>(INITIAL_HOSPITALS);
  const [branches, setBranches] = useState<HospitalBranch[]>(INITIAL_BRANCHES);
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('patient-01');
  const [followUpGaps, setFollowUpGaps] = useState<FollowUpGap[]>(INITIAL_FOLLOW_UP_GAPS);
  const [careTasks, setCareTasks] = useState<CareTask[]>(INITIAL_CARE_TASKS);
  const [medications, setMedications] = useState<MedicationSchedule[]>(INITIAL_MEDICATIONS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [coordinationLogs, setCoordinationLogs] = useState<CoordinationLog[]>(INITIAL_COORDINATION_LOGS);
  const [staff, setStaff] = useState(INITIAL_STAFF);
  const [carePlans, setCarePlans] = useState<Record<string, CarePlan>>(INITIAL_CARE_PLANS);

  // Diagnostic notifications
  const [lastDatabaseError, setLastDatabaseError] = useState<string | null>(null);
  const [lastDatabaseNotice, setLastDatabaseNotice] = useState<string | null>(null);

  // Modal visibility
  const [showDbModal, setShowDbModal] = useState<boolean>(false);

  // Initial connection health state (Layer 1 Demo Mode)
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    state: 'demo',
    stateLabel: 'Demo Mode',
    url: null,
    hasKey: false,
    isCustomConfig: false,
    configSource: 'none',
    testedAt: null,
    message: 'Demo Mode: Running with explicitly labelled local demonstration records.',
    isDemoMode: true,
    isReachable: false,
    hasActiveSession: false,
    hasAuthorizedAccess: false,
    persistenceVerified: false,
    tableAccess: {},
  });

  const connectionState = connectionHealth.state;
  const isDemoMode = connectionHealth.isDemoMode;
  const activeDataSource: 'demo' | 'live' = !isDemoMode && connectionState === 'connected' ? 'live' : 'demo';

  const clearDatabaseMessages = () => {
    setLastDatabaseError(null);
    setLastDatabaseNotice(null);
  };

  /**
   * Comprehensive connection check with fail-closed security and real role resolution.
   */
  const checkConnection = useCallback(async () => {
    const health = await testSupabaseConnection();
    setConnectionHealth(health);

    if (health.state === 'connected' && !health.isDemoMode && health.resolvedAccess?.hasValidRole) {
      // Verified Live Mode with authenticated user & valid role/membership
      setIsAccountUnprovisioned(false);
      setUnprovisionedError(undefined);

      const resolved = health.resolvedAccess;
      const resolvedRole = resolved.role || 'coordinator';
      setCurrentRole(resolvedRole);
      setActiveTab(getDefaultTabForRole(resolvedRole));
      setCurrentUser({
        id: health.authenticatedUserEmail || 'live-user',
        name: resolved.fullName || health.authenticatedUserEmail || 'Authenticated Staff',
        email: health.authenticatedUserEmail || '',
        role: resolvedRole,
        title: resolvedRole === 'superadmin' ? 'Chief Medical & Compliance Officer' : resolvedRole === 'hospital_admin' ? 'Hospital Administrator' : resolvedRole === 'doctor' ? 'Healthcare Professional' : resolvedRole === 'patient' ? 'Patient Recovery' : 'Care Coordinator',
        department: 'Clinical Continuity Department',
        organization: resolved.organizationName || 'Affiliated Health System',
        hospitalId: resolved.hospitalId || undefined,
        branchId: resolved.branchId || undefined,
      });

      setLastDatabaseNotice(`Connected to live Supabase project as ${health.authenticatedUserEmail} (${resolvedRole}).`);
      setLastDatabaseError(null);

      // Fetch live records from canonical tables
      const [hospRes, branchRes, patRes, taskRes, gapRes, aptRes, medRes] = await Promise.all([
        DataService.getHospitals(true, INITIAL_HOSPITALS),
        DataService.getHospitalBranches(true, INITIAL_BRANCHES),
        DataService.getPatients(true, INITIAL_PATIENTS),
        DataService.getCareTasks(true, INITIAL_CARE_TASKS),
        DataService.getFollowUpGaps(true, INITIAL_FOLLOW_UP_GAPS),
        DataService.getAppointments(true, INITIAL_APPOINTMENTS),
        DataService.getMedications(true, INITIAL_MEDICATIONS),
      ]);

      if (hospRes.success && hospRes.data) setHospitals(hospRes.data);
      if (branchRes.success && branchRes.data) setBranches(branchRes.data);
      if (patRes.success && patRes.data) {
        setPatients(patRes.data);
        if (patRes.data.length > 0) {
          setSelectedPatientId(patRes.data[0].id);
        }
      }
      if (taskRes.success && taskRes.data) setCareTasks(taskRes.data);
      if (gapRes.success && gapRes.data) setFollowUpGaps(gapRes.data);
      if (aptRes.success && aptRes.data) setAppointments(aptRes.data);
      if (medRes.success && medRes.data) setMedications(medRes.data);
    } else if (health.state === 'auth_required' && health.hasActiveSession && health.resolvedAccess && !health.resolvedAccess.hasValidRole) {
      // Authenticated but account is unprovisioned in profiles/hospital_memberships
      setIsAccountUnprovisioned(true);
      setUnprovisionedError(health.message);
      setLastDatabaseError(health.message);
      setLastDatabaseNotice(null);
    } else {
      // Demo mode, auth required (no session), error, or reachable
      setIsAccountUnprovisioned(false);
      setUnprovisionedError(undefined);

      // Load clean demonstration fixtures for safe prototype presentation
      setHospitals(INITIAL_HOSPITALS);
      setBranches(INITIAL_BRANCHES);
      setPatients(INITIAL_PATIENTS);
      setCareTasks(INITIAL_CARE_TASKS);
      setFollowUpGaps(INITIAL_FOLLOW_UP_GAPS);
      setAppointments(INITIAL_APPOINTMENTS);
      setMedications(INITIAL_MEDICATIONS);
      setSelectedPatientId('patient-01');

      if (health.state === 'error') {
        setLastDatabaseError(health.message);
      } else if (health.state === 'auth_required') {
        setLastDatabaseError('Supabase is reachable, but sign-in is required for Row-Level Security tables. Running with demonstration records.');
      }
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const enableDemoMode = async () => {
    saveSupabaseConfig('', '', true);
    setIsAccountUnprovisioned(false);
    setUnprovisionedError(undefined);
    setCurrentRole('coordinator');
    setCurrentUser(DEMO_USERS.coordinator);
    setActiveTab('overview');
    await checkConnection();
    setLastDatabaseNotice('Demo Mode active: Using explicitly labelled local demonstration records.');
    setLastDatabaseError(null);
  };

  const resetToEnvConfig = async () => {
    clearCustomConfig();
    setIsAccountUnprovisioned(false);
    setUnprovisionedError(undefined);
    await checkConnection();
  };

  const signOut = async () => {
    await signOutSupabaseUser();
    await enableDemoMode();
  };

  /**
   * Switch persona (Phase 1 Acceptance Item 2):
   * Persona switching is enabled ONLY when Demo Mode is explicitly active.
   * In Live Mode, the user's role is governed exclusively by their database records.
   */
  const switchRole = (role: UserRole) => {
    if (!isDemoMode) {
      setLastDatabaseError('Role switching is disabled in Live Mode. Your active role is governed by database profile and hospital memberships.');
      return;
    }

    setCurrentRole(role);
    setActiveTab(getDefaultTabForRole(role));
    if (DEMO_USERS[role]) {
      setCurrentUser(DEMO_USERS[role]);
    }
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  // Helper to mark persistence verified once a real authorized write succeeds
  const markPersistenceVerified = () => {
    setConnectionHealth((prev) => ({
      ...prev,
      persistenceVerified: true,
    }));
  };

  // ==========================================
  // MUTATIONS (FAIL-CLOSED IN LIVE MODE, FULL DEMO MODE)
  // ==========================================

  const updateHospitalStatus = async (id: string, status: HospitalStatus): Promise<boolean> => {
    const isLive = !isDemoMode;
    const res = await DataService.updateHospitalStatus(id, status, isLive);

    if (res.success && res.data) {
      setHospitals((prev) =>
        prev.map((h) =>
          h.id === id
            ? {
                ...h,
                status: res.data!.status,
                approvedAt: res.data!.approvedAt || h.approvedAt,
              }
            : h
        )
      );

      if (res.persistedToDatabase) {
        markPersistenceVerified();
        setLastDatabaseNotice(`Hospital status updated and persisted to table "hospitals".`);
        setLastDatabaseError(null);
      } else {
        setLastDatabaseNotice(`Hospital status updated in local demonstration session (Demo mode · not written to database).`);
        setLastDatabaseError(null);
      }
      return true;
    } else {
      // PRESERVE previous state on failure, show honest error
      setLastDatabaseError(res.error || 'Failed to update hospital status.');
      return false;
    }
  };

  const addHospital = async (newHosp: Omit<Hospital, 'id' | 'appliedAt'>): Promise<boolean> => {
    const isLive = !isDemoMode;
    const res = await DataService.createHospital(newHosp, isLive);

    if (res.success && res.data) {
      setHospitals((prev) => [res.data!, ...prev]);
      if (res.persistedToDatabase) {
        markPersistenceVerified();
        setLastDatabaseNotice('Hospital registration persisted to live database table "hospitals".');
        setLastDatabaseError(null);
      } else {
        setLastDatabaseNotice('Hospital added to local demonstration session (Demo mode · not written to database).');
        setLastDatabaseError(null);
      }
      return true;
    } else {
      setLastDatabaseError(res.error || 'Failed to register hospital in database.');
      return false;
    }
  };

  const addBranch = async (newBranch: Omit<HospitalBranch, 'id'>): Promise<boolean> => {
    const isLive = !isDemoMode;
    const res = await DataService.createBranch(newBranch, isLive);

    if (res.success && res.data) {
      setBranches((prev) => [...prev, res.data!]);
      if (res.persistedToDatabase) {
        markPersistenceVerified();
        setLastDatabaseNotice('Branch successfully persisted to live database table "hospital_branches".');
        setLastDatabaseError(null);
      } else {
        setLastDatabaseNotice('Branch recorded in local demonstration session (Demo mode · not written to database).');
        setLastDatabaseError(null);
      }
      return true;
    } else {
      setLastDatabaseError(res.error || 'Failed to create branch in database.');
      return false;
    }
  };

  const addStaff = async (member: (typeof INITIAL_STAFF)[0]): Promise<boolean> => {
    if (!isDemoMode) {
      // Live staff provisioning requires live hospital_memberships write endpoint
      setLastDatabaseError('Live staff provisioning requires verified write permissions to "hospital_memberships" (not configured in this deployment).');
      return false;
    }

    setStaff((prev) => [...prev, member]);
    setLastDatabaseNotice('Staff member added to local demonstration session (Demo mode · not written to database).');
    setLastDatabaseError(null);
    return true;
  };

  const resolveGap = async (id: string, resolutionNotes: string): Promise<boolean> => {
    const isLive = !isDemoMode;
    const res = await DataService.resolveFollowUpGap(id, resolutionNotes, isLive);

    if (res.success) {
      setFollowUpGaps((prev) =>
        prev.map((g) =>
          g.id === id
            ? {
                ...g,
                status: 'resolved',
                resolvedAt: res.data?.resolvedAt || new Date().toLocaleString(),
                resolutionNotes: res.data?.resolutionNotes || resolutionNotes,
              }
            : g
        )
      );

      if (res.persistedToDatabase) {
        markPersistenceVerified();
        setLastDatabaseNotice('Gap resolution persisted to database table "follow_up_gaps".');
        setLastDatabaseError(null);
      } else {
        setLastDatabaseNotice('Gap resolved in demonstration session (Demo mode · not written to database).');
        setLastDatabaseError(null);
      }
      return true;
    } else {
      setLastDatabaseError(res.error || 'Failed to update gap status in database.');
      return false;
    }
  };

  const updateGapStatus = async (id: string, status: GapStatus): Promise<boolean> => {
    const isLive = !isDemoMode;
    const res = await DataService.updateGapStatus(id, status, isLive);

    if (res.success) {
      setFollowUpGaps((prev) =>
        prev.map((g) => (g.id === id ? { ...g, status } : g))
      );
      if (res.persistedToDatabase) {
        markPersistenceVerified();
        setLastDatabaseNotice('Gap status persisted to database.');
        setLastDatabaseError(null);
      } else {
        setLastDatabaseNotice('Gap status updated in demonstration session (Demo mode · not written to database).');
        setLastDatabaseError(null);
      }
      return true;
    } else {
      setLastDatabaseError(res.error || 'Failed to update gap status.');
      return false;
    }
  };

  /**
   * Toggle care plan task (P0.1)
   */
  const toggleTask = async (id: string): Promise<boolean> => {
    const task = careTasks.find((t) => t.id === id);
    if (!task) return false;

    const isLive = !isDemoMode;
    const res = await DataService.toggleCareTask(id, task.completed, isLive);

    if (res.success && res.data) {
      setCareTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                completed: res.data!.completed,
                completedAt: res.data!.completedAt,
                overdue: res.data!.completed ? false : t.overdue,
              }
            : t
        )
      );

      if (res.persistedToDatabase) {
        markPersistenceVerified();
        setLastDatabaseNotice('Task completion persisted to database table "care_plan_tasks".');
        setLastDatabaseError(null);
      } else {
        setLastDatabaseNotice('Task updated in local demonstration session (Demo mode · not written to database).');
        setLastDatabaseError(null);
      }
      return true;
    } else {
      // PRESERVE previous state on failure, do not mutate careTasks
      setLastDatabaseError(res.error || 'Failed to update task.');
      return false;
    }
  };

  const addTask = async (newTask: Omit<CareTask, 'id'>): Promise<boolean> => {
    const isLive = !isDemoMode;
    const res = await DataService.createCareTask(newTask, isLive);

    if (res.success && res.data) {
      setCareTasks((prev) => [res.data!, ...prev]);
      if (res.persistedToDatabase) {
        markPersistenceVerified();
        setLastDatabaseNotice('Care task created and persisted to table "care_plan_tasks".');
        setLastDatabaseError(null);
      } else {
        setLastDatabaseNotice('Care task added to local demonstration session (Demo mode · not written to database).');
        setLastDatabaseError(null);
      }
      return true;
    } else {
      setLastDatabaseError(res.error || 'Failed to create care task.');
      return false;
    }
  };

  const toggleMedication = async (id: string, time: string): Promise<boolean> => {
    if (!isDemoMode) {
      setLastDatabaseError('Medication schedule tracking in Live Mode requires verified write permissions to "medication_schedules" (not configured in this deployment).');
      return false;
    }

    setMedications((prev) =>
      prev.map((med) => {
        if (med.id !== id) return med;
        const currentTaken = !!med.takenToday[time];
        const updatedTaken = {
          ...med.takenToday,
          [time]: !currentTaken,
        };
        const totalDoses = med.timesOfDay.length;
        const takenDoses = Object.values(updatedTaken).filter(Boolean).length;
        const adherenceRate = Math.round((takenDoses / totalDoses) * 100);

        return {
          ...med,
          takenToday: updatedTaken,
          adherenceRate,
        };
      })
    );

    setLastDatabaseNotice('Medication logged in local demonstration session (Demo mode · not written to database).');
    setLastDatabaseError(null);
    return true;
  };

  const rescheduleAppointment = async (
    id: string,
    newDateTime: string,
    notes?: string
  ): Promise<boolean> => {
    const isLive = !isDemoMode;
    const res = await DataService.rescheduleAppointment(id, newDateTime, notes, isLive);

    if (res.success && res.data) {
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === id
            ? {
                ...apt,
                dateTime: res.data!.dateTime,
                formattedTime: res.data!.formattedTime,
                status: 'scheduled',
                notes: notes ? `${apt.notes ? apt.notes + ' | ' : ''}${notes}` : apt.notes,
              }
            : apt
        )
      );

      if (res.persistedToDatabase) {
        markPersistenceVerified();
        setLastDatabaseNotice('Appointment rescheduled and persisted to table "appointments".');
        setLastDatabaseError(null);
      } else {
        setLastDatabaseNotice('Appointment rescheduled in demo session (Demo mode · not written to database).');
        setLastDatabaseError(null);
      }
      return true;
    } else {
      setLastDatabaseError(res.error || 'Failed to reschedule appointment in database.');
      return false;
    }
  };

  const updateAppointmentStatus = async (
    id: string,
    status: Appointment['status']
  ): Promise<boolean> => {
    const isLive = !isDemoMode;
    const res = await DataService.updateAppointmentStatus(id, status, isLive);

    if (res.success) {
      setAppointments((prev) =>
        prev.map((apt) => (apt.id === id ? { ...apt, status } : apt))
      );

      if (res.persistedToDatabase) {
        markPersistenceVerified();
        setLastDatabaseNotice('Appointment status persisted to table "appointments".');
        setLastDatabaseError(null);
      } else {
        setLastDatabaseNotice('Appointment status updated in demo session (Demo mode · not written to database).');
        setLastDatabaseError(null);
      }
      return true;
    } else {
      setLastDatabaseError(res.error || 'Failed to update appointment status.');
      return false;
    }
  };

  const addAppointment = async (newApt: Omit<Appointment, 'id'>): Promise<boolean> => {
    if (!isDemoMode && isSyntheticId(newApt.patientId)) {
      setLastDatabaseError('Cannot create live appointment: Patient is a demonstration fixture.');
      return false;
    }

    if (!isDemoMode) {
      setLastDatabaseError('Live appointment creation requires verified appointment scheduling endpoint (not configured in this deployment).');
      return false;
    }

    const created: Appointment = {
      ...newApt,
      id: `apt-${Date.now()}`,
    };
    setAppointments((prev) => [...prev, created]);
    setLastDatabaseNotice('Appointment scheduled in demo session (Demo mode · not written to database).');
    setLastDatabaseError(null);
    return true;
  };

  const addCoordinationLog = async (
    log: Omit<CoordinationLog, 'id' | 'timestamp'>
  ): Promise<boolean> => {
    const isLive = !isDemoMode;
    const res = await DataService.logCoordinationEvent(log, isLive);

    if (res.success && res.data) {
      setCoordinationLogs((prev) => [res.data!, ...prev]);
      if (res.persistedToDatabase) {
        markPersistenceVerified();
        setLastDatabaseNotice('Event persisted to table "care_coordination_events".');
        setLastDatabaseError(null);
      } else {
        setLastDatabaseNotice('Event logged in demo session (Demo mode · not written to database).');
        setLastDatabaseError(null);
      }
      return true;
    } else {
      setLastDatabaseError(res.error || 'Failed to log event in database.');
      return false;
    }
  };

  const updateCarePlan = async (patientId: string, plan: CarePlan): Promise<boolean> => {
    if (!isDemoMode) {
      setLastDatabaseError('Live care plan modifications require an authorized "care_plans" write endpoint (not configured in this deployment).');
      return false;
    }

    setCarePlans((prev) => ({
      ...prev,
      [patientId]: plan,
    }));
    setLastDatabaseNotice('Care plan updated in local demonstration session (Demo mode · not written to database).');
    setLastDatabaseError(null);
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        currentUser,
        switchRole,
        activeTab,
        setActiveTab,
        isAccountUnprovisioned,
        unprovisionedError,
        hospitals,
        updateHospitalStatus,
        addHospital,
        branches,
        addBranch,
        staff,
        addStaff,
        patients,
        selectedPatientId,
        setSelectedPatientId,
        selectedPatient,
        followUpGaps,
        resolveGap,
        updateGapStatus,
        careTasks,
        toggleTask,
        addTask,
        medications,
        toggleMedication,
        appointments,
        rescheduleAppointment,
        addAppointment,
        updateAppointmentStatus,
        coordinationLogs,
        addCoordinationLog,
        carePlans,
        updateCarePlan,
        connectionHealth,
        connectionState,
        isDemoMode,
        activeDataSource,
        showDbModal,
        setShowDbModal,
        checkConnection,
        enableDemoMode,
        resetToEnvConfig,
        signOut,
        lastDatabaseError,
        lastDatabaseNotice,
        clearDatabaseMessages,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
