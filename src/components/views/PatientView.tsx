import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CheckCircle2,
  Circle,
  Pill,
  Calendar,
  AlertTriangle,
  Phone,
  Video,
  Send,
  Heart,
  Clock,
  Check,
  ArrowRight,
} from 'lucide-react';

export const PatientView: React.FC = () => {
  const {
    careTasks,
    toggleTask,
    medications,
    toggleMedication,
    appointments,
    patients,
    selectedPatient,
    carePlans,
    addCoordinationLog,
    isDemoMode,
    enableDemoMode,
    activeTab,
    setActiveTab,
  } = useApp();

  const [messageText, setMessageText] = useState('');
  const [messageSent, setMessageSent] = useState(false);

  // Normalize current tab to patient tabs
  const currentSection: 'today' | 'meds' | 'appointments' | 'redflags' =
    activeTab === 'meds' || activeTab === 'appointments' || activeTab === 'redflags'
      ? activeTab
      : 'today';

  const currentPatient = selectedPatient || (patients.length > 0 ? patients[0] : undefined);
  const activePatientId = currentPatient?.id || (isDemoMode ? 'patient-01' : '');

  // Filter tasks, meds, appointments for active patient
  const patientTasks = careTasks.filter((t) => t.patientId === activePatientId);
  const patientMeds = medications.filter((m) => m.patientId === activePatientId);
  const patientApts = appointments.filter((a) => a.patientId === activePatientId);
  const carePlan = activePatientId ? carePlans[activePatientId] || carePlans['patient-01'] : undefined;

  const completedTasksCount = patientTasks.filter((t) => t.completed).length;
  const progressPercent =
    patientTasks.length > 0 ? Math.round((completedTasksCount / patientTasks.length) * 100) : 0;

  // Real dose counts calculated from active dataset
  const takenDosesCount = patientMeds.reduce(
    (sum, m) => sum + Object.values(m.takenToday || {}).filter(Boolean).length,
    0
  );
  const totalDosesCount = patientMeds.reduce((sum, m) => sum + m.timesOfDay.length, 0);

  // Immediate next action calculation
  const nextPendingTask = patientTasks.find((t) => !t.completed);
  const nextUpcomingAppointment = patientApts.find((a) => a.status === 'scheduled');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activePatientId) return;

    addCoordinationLog({
      patientId: activePatientId,
      coordinatorId: 'user-coord-01',
      coordinatorName: 'Maya Lin, RN',
      actionType: 'phone_call',
      notes: `Patient message: "${messageText.trim()}"`,
      outcome: 'contact_successful',
    });

    setMessageSent(true);
    setMessageText('');
    setTimeout(() => setMessageSent(false), 3000);
  };

  if (!isDemoMode && patients.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 max-w-xl mx-auto my-8">
        <div className="p-3 bg-amber-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-amber-700">
          <Heart className="w-6 h-6 text-[#881337]" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">No Live Patient Records In Database</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          The connected database currently has no records in the canonical{' '}
          <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">patients</code>{' '}
          table. You can switch to Demo Mode to explore the recovery checklist and patient experience.
        </p>
        <button
          onClick={enableDemoMode}
          className="px-4 py-2 bg-[#881337] text-white text-xs font-semibold rounded-lg hover:bg-[#670d28] transition-colors cursor-pointer"
        >
          Switch to Demo Mode
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Patient Welcome Hero */}
      <div className="bg-gradient-to-r from-[#881337] via-[#9F1239] to-[#BE123C] text-white rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-rose-200 font-semibold flex items-center gap-2">
              <span>Day {currentPatient?.daysPostDischarge || 4} Post-Discharge</span>
              <span className="text-rose-300">·</span>
              <span>{currentPatient?.hospitalName || 'Metro General Health'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
              Welcome back, {currentPatient?.name?.split(' ')[0] || 'Eleanor'}
            </h1>
            <p className="text-xs sm:text-sm text-rose-100 mt-1 max-w-xl leading-relaxed">
              Your recovery plan for {currentPatient?.primaryDiagnosis || 'Heart Recovery'}. Your care coordinator Maya Lin, RN and team are monitoring your progress every day.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/20 text-left sm:text-right shrink-0">
            <div className="text-[11px] text-rose-200 font-medium">Transitional Care Coordinator</div>
            <div className="text-sm font-bold text-white mt-0.5">Maya Lin, RN</div>
            <div className="text-[11px] text-rose-100 mt-0.5">Direct Line: (555) 321-4800 Ext 402</div>
          </div>
        </div>

        {/* Recovery Progress Bar */}
        <div className="mt-5 pt-4 border-t border-white/20">
          <div className="flex items-center justify-between text-xs font-medium text-rose-100 mb-2">
            <span>Today's Recovery Routine</span>
            <span className="font-mono tabular-nums">
              {completedTasksCount} of {patientTasks.length} Completed ({progressPercent}%)
            </span>
          </div>
          <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-300 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Immediate Next Action Banner */}
      {nextPendingTask && (
        <div className="bg-white border border-rose-200/80 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-50 text-[#881337] rounded-lg shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                Immediate Next Action
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {nextPendingTask.title}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Due {nextPendingTask.dueTime} · {nextPendingTask.description}
              </div>
            </div>
          </div>
          <button
            onClick={() => toggleTask(nextPendingTask.id)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#881337] hover:bg-[#670d28] rounded-lg transition-colors shrink-0 cursor-pointer shadow-2xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark as Completed</span>
          </button>
        </div>
      )}

      {/* Tab Filter Strip */}
      <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            currentSection === 'today'
              ? 'bg-[#881337] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Today's Checklist ({completedTasksCount}/{patientTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('meds')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            currentSection === 'meds'
              ? 'bg-[#881337] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Medications ({patientMeds.length})
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            currentSection === 'appointments'
              ? 'bg-[#881337] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Upcoming Visits ({patientApts.length})
        </button>
        <button
          onClick={() => setActiveTab('redflags')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            currentSection === 'redflags'
              ? 'bg-[#881337] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          When to Call Care Team
        </button>
      </div>

      {/* Section 1: Today's Routine */}
      {currentSection === 'today' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Today's Recovery Routine</h2>
              <span className="text-xs text-slate-500">Tap items to record completion</span>
            </div>

            <div className="space-y-2.5">
              {patientTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                    task.completed
                      ? 'bg-emerald-50/40 border-emerald-200 text-slate-700'
                      : task.overdue
                      ? 'bg-rose-50/30 border-rose-200 text-slate-900'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <button className="mt-0.5 text-slate-400 hover:text-[#881337] shrink-0">
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-semibold ${
                          task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">Due {task.dueTime}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {task.description}
                    </p>
                    {task.overdue && !task.completed && (
                      <div className="text-[11px] font-semibold text-rose-600 mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Action requested: Please record this reading today</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Direct Coordinator Message */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#881337]" />
                <h3 className="text-sm font-bold text-slate-900">Message Maya Lin, RN</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Have questions about your recovery or medication? Send a note directly to your care coordinator.
              </p>

              <form onSubmit={handleSendMessage} className="space-y-2.5">
                <textarea
                  rows={3}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="e.g. My morning blood pressure was 122/78, feeling well today..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#881337] focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-2 text-xs font-semibold text-white bg-[#881337] hover:bg-[#670d28] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Note to Care Team</span>
                </button>
              </form>

              {messageSent && (
                <div className="p-2 text-xs text-emerald-800 bg-emerald-50 rounded border border-emerald-200 text-center font-medium">
                  Message delivered to Maya Lin, RN.
                </div>
              )}
            </div>

            {/* Direct Support Advice Line */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-600" />
                <span>Care Continuity Hotline</span>
              </div>
              <p className="text-slate-600">
                Metro General Hospital Care Continuity: <br />
                <strong className="text-slate-900 font-mono">+1 (555) 321-4800</strong> (Ext. 402)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Medications */}
      {currentSection === 'meds' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Your Heart Recovery Medications</h2>
              <p className="text-xs text-slate-500">
                Prescribed by Dr. James Wilson, MD · Track each dose as taken
              </p>
            </div>
            {totalDosesCount > 0 && (
              <div className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
                Today: {takenDosesCount} of {totalDosesCount} Doses Recorded
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patientMeds.map((med) => (
              <div
                key={med.id}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-2xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{med.name}</h3>
                    <div className="text-xs font-mono text-[#881337] font-semibold mt-0.5">
                      {med.dosage} · {med.frequency}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-50 text-[#881337]">
                    <Pill className="w-4 h-4" />
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-800">Purpose: </span>
                  {med.purpose}
                </div>

                <p className="text-xs text-slate-500 italic">"{med.instructions}"</p>

                {/* Dose toggles for today */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-semibold uppercase text-slate-500">
                    Today's Doses:
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {med.timesOfDay.map((time) => {
                      const isTaken = !!med.takenToday[time];
                      return (
                        <button
                          key={time}
                          onClick={() => toggleMedication(med.id, time)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isTaken
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          {isTaken ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{time}</span>
                          <span className="text-[10px] opacity-80">
                            {isTaken ? 'Taken' : 'Take Dose'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Upcoming Appointments */}
      {currentSection === 'appointments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Your Scheduled Follow-Ups</h2>
              <p className="text-xs text-slate-500">
                Essential clinical touchpoints to protect your recovery
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {patientApts.map((apt) => {
              const isMissed = apt.status === 'missed';
              const isTelehealth = apt.type === 'telehealth';

              return (
                <div
                  key={apt.id}
                  className={`p-5 rounded-xl border bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isMissed ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-900 text-sm">{apt.department}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-slate-600 font-medium">with {apt.providerName}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span
                        className={`font-semibold uppercase text-[10px] ${
                          isMissed ? 'text-rose-700' : 'text-teal-700'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">{apt.formattedTime}</span>
                      <span>({apt.branchName})</span>
                    </div>

                    {apt.notes && <p className="text-xs text-slate-500 mt-1">{apt.notes}</p>}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isTelehealth && apt.telehealthLink && (
                      <a
                        href={apt.telehealthLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-2xs transition-colors"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Join Telehealth Room</span>
                      </a>
                    )}
                    {isMissed && (
                      <div className="text-xs text-rose-700 font-semibold bg-rose-100 px-3 py-1.5 rounded-lg">
                        Care Coordinator Maya is rescheduling this visit for you.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 4: Red Flags */}
      {currentSection === 'redflags' && carePlan && (
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#881337]">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h2 className="text-base font-bold">When to Call the Hospital Immediately</h2>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              If you notice any of the following symptoms, do not wait for your scheduled appointment. Call Metro General Hospital or emergency services right away:
            </p>

            <ul className="space-y-2 mt-3">
              {carePlan.redFlagSymptoms.map((symptom, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 p-3 bg-white rounded-lg border border-rose-200 text-xs font-semibold text-slate-900"
                >
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-[#881337] flex items-center justify-center shrink-0 font-bold text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{symptom}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Vitals Target Reference */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Your Safe Vital Signs Targets</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {carePlan.vitalLimits.map((v, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-500 text-[11px] font-medium">{v.metric}</div>
                  <div className="text-base font-bold font-mono text-slate-900 mt-1">
                    {v.min} - {v.max}
                  </div>
                  <div className="text-[10px] text-slate-400">{v.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
