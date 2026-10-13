import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Patient, CarePlan } from '../../types';
import {
  Calendar,
  Plus,
} from 'lucide-react';

export const HealthcareProView: React.FC = () => {
  const {
    patients,
    appointments,
    carePlans,
    updateCarePlan,
    updateAppointmentStatus,
    setSelectedPatientId,
    activeTab,
    setActiveTab,
  } = useApp();

  const currentTab: 'roster' | 'careplans' | 'schedule' =
    activeTab === 'careplans' || activeTab === 'schedule' ? activeTab : 'roster';

  const [selectedPatientForPlan, setSelectedPatientForPlan] = useState<Patient>(patients[0] || {} as Patient);
  const [editingPlanModal, setEditingPlanModal] = useState<boolean>(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState<string>('');
  const [newMilestoneDay, setNewMilestoneDay] = useState<number>(14);

  const doctorPatients = patients;
  const doctorAppointments = appointments;

  const activeCarePlan =
    carePlans[selectedPatientForPlan?.id] || carePlans['patient-01'];

  // Calculate actual average days post-discharge from loaded cohort
  const avgDaysPostDischarge =
    doctorPatients.length > 0
      ? (doctorPatients.reduce((sum, p) => sum + (p.daysPostDischarge || 0), 0) / doctorPatients.length).toFixed(1)
      : '0';

  const highRiskPatientsCount = doctorPatients.filter((p) => p.riskTier === 'high').length;

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim() || !activeCarePlan || !selectedPatientForPlan) return;

    const updatedPlan: CarePlan = {
      ...activeCarePlan,
      recoveryMilestones: [
        ...activeCarePlan.recoveryMilestones,
        {
          day: newMilestoneDay,
          title: newMilestoneTitle.trim(),
          description: `Custom recovery milestone ordered by Dr. James Wilson.`,
          completed: false,
        },
      ].sort((a, b) => a.day - b.day),
    };

    updateCarePlan(selectedPatientForPlan.id, updatedPlan);
    setNewMilestoneTitle('');
    setEditingPlanModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Clinician Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Clinical Patient Roster
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
            <span className="font-semibold text-sky-800">Dr. James Wilson, MD, FACC</span>
            <span aria-hidden="true">·</span>
            <span>Cardiovascular Medicine & Post-Acute Care</span>
            <span aria-hidden="true">·</span>
            <span>Metro General Health System</span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              currentTab === 'roster'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assigned Patients ({doctorPatients.length})
          </button>
          <button
            onClick={() => setActiveTab('careplans')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              currentTab === 'careplans'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Care Plans & Protocols
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              currentTab === 'schedule'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Clinical Schedule ({doctorAppointments.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Assigned Patients Roster */}
      {currentTab === 'roster' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Assigned Post-Acute Caseload
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {doctorPatients.length} Patients
              </div>
              <div className="text-xs text-slate-500 mt-1">Active continuity cohort</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                High Risk Post-Discharge
              </div>
              <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
                {highRiskPatientsCount} Patients
              </div>
              <div className="text-xs text-slate-500 mt-1">Priority tracking cohort</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Average Days Post-Discharge
              </div>
              <div className="text-2xl font-bold font-mono text-teal-700 mt-1">
                {avgDaysPostDischarge} Days
              </div>
              <div className="text-xs text-slate-500 mt-1">Calculated from active cohort</div>
            </div>
          </div>

          {/* Patient Cards Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Patient Cohort Roster</h2>
              <span className="text-xs text-slate-500">Sorted by clinical priority</span>
            </div>

            <div className="divide-y divide-slate-100">
              {doctorPatients.map((patient) => {
                const isHighRisk = patient.riskTier === 'high';
                const isModerate = patient.riskTier === 'moderate';

                return (
                  <div
                    key={patient.id}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-900 text-sm">{patient.name}</span>
                        <span className="text-slate-400 font-mono">({patient.mrn})</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span
                          className={`font-semibold uppercase text-[10px] ${
                            isHighRisk
                              ? 'text-rose-700'
                              : isModerate
                              ? 'text-amber-700'
                              : 'text-teal-700'
                          }`}
                        >
                          {patient.riskTier} Risk
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-slate-500">
                          {patient.age}y {patient.gender}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700">
                        <strong className="font-semibold text-slate-800">Diagnosis: </strong>
                        {patient.primaryDiagnosis}
                        {patient.surgeryOrProcedure && (
                          <span className="text-slate-500 italic">
                            {' '}— {patient.surgeryOrProcedure}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>Discharged: {patient.dischargeDate} (Day {patient.daysPostDischarge})</span>
                        <span>Coordinator: {patient.coordinatorName}</span>
                      </div>
                    </div>

                    {/* Vitals Summary */}
                    <div className="flex items-center gap-4 text-xs font-mono">
                      {patient.keyVitals && (
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-right space-y-0.5">
                          {patient.keyVitals.bloodPressure && (
                            <div>BP: <strong className="text-slate-900">{patient.keyVitals.bloodPressure}</strong></div>
                          )}
                          {patient.keyVitals.weightLbs && (
                            <div>Weight: <strong className="text-slate-900">{patient.keyVitals.weightLbs} lbs</strong></div>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setSelectedPatientForPlan(patient);
                          setSelectedPatientId(patient.id);
                          setActiveTab('careplans');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors border border-sky-200 shrink-0 cursor-pointer"
                      >
                        View Care Plan
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Care Plans Manager */}
      {currentTab === 'careplans' && (
        <div className="space-y-4">
          {/* Patient Selector Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Selected Patient:</span>
            {doctorPatients.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPatientForPlan(p)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedPatientForPlan?.id === p.id
                    ? 'bg-[#881337] text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {p.name} ({p.primaryDiagnosis.split(' ')[0]})
              </button>
            ))}
          </div>

          {activeCarePlan ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    Post-Acute Clinical Protocol
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                    Care Continuity Plan for {selectedPatientForPlan?.name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Primary Attending: {activeCarePlan.physicianName} · Recovery Window: {activeCarePlan.targetRecoveryWeeks} Weeks
                  </p>
                </div>

                <button
                  onClick={() => setEditingPlanModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Clinical Milestone</span>
                </button>
              </div>

              {/* Recovery Milestones Timeline */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Post-Discharge Milestones (Days 1–30)
                </h3>
                <div className="space-y-2">
                  {activeCarePlan.recoveryMilestones.map((milestone, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-lg border flex items-start justify-between gap-3 text-xs ${
                        milestone.completed
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-mono font-bold text-slate-500 mt-0.5">
                          Day {milestone.day}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">{milestone.title}</div>
                          <p className="text-slate-600 mt-0.5">{milestone.description}</p>
                        </div>
                      </div>

                      <span
                        className={`font-semibold shrink-0 text-[11px] ${
                          milestone.completed ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {milestone.completed ? 'Achieved' : 'Scheduled'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vital Threshold Limits */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Safety Vital Sign Limits (Threshold Exceeded = Alert)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {activeCarePlan.vitalLimits.map((v, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="text-slate-500 text-[11px] font-medium">{v.metric}</div>
                      <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                        {v.min} - {v.max}
                      </div>
                      <div className="text-[10px] text-slate-400">{v.unit}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Red Flag Symptoms */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Critical Warning Symptoms
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {activeCarePlan.redFlagSymptoms.map((rf, i) => (
                    <li key={i} className="p-2.5 rounded bg-rose-50 text-rose-900 border border-rose-100">
                      • {rf}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
              No active care plan found for this patient.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Clinical Schedule */}
      {currentTab === 'schedule' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Follow-up Clinical Schedule</h2>
              <span className="text-xs text-slate-500">In-person & Telehealth visits</span>
            </div>

            <div className="divide-y divide-slate-100">
              {doctorAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{apt.patientName}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-slate-600 font-medium">{apt.department}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span
                        className={`font-semibold uppercase text-[10px] ${
                          apt.status === 'completed'
                            ? 'text-emerald-700'
                            : apt.status === 'missed'
                            ? 'text-rose-700'
                            : 'text-sky-700'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </div>

                    <div className="text-slate-500 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{apt.formattedTime}</span>
                      <span>({apt.type.replace('_', ' ')})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {apt.status === 'scheduled' && (
                      <button
                        onClick={() => updateAppointmentStatus(apt.id, 'completed')}
                        className="px-3 py-1.5 font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {editingPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Add Clinical Recovery Milestone</h3>
            <form onSubmit={handleAddMilestone} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Post-Discharge Day
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={newMilestoneDay}
                  onChange={(e) => setNewMilestoneDay(parseInt(e.target.value, 10))}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Milestone Title & Clinical Objective
                </label>
                <input
                  type="text"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  placeholder="e.g. Echocardiogram LVEF reassessment"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlanModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg cursor-pointer"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
