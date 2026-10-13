import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FollowUpGap, Patient, Appointment } from '../../types';
import {
  AlertTriangle,
  PhoneCall,
  MessageSquare,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  Users,
  Check,
  FileText,
  CalendarClock,
} from 'lucide-react';

export const CareCoordinatorView: React.FC = () => {
  const {
    followUpGaps,
    resolveGap,
    updateGapStatus,
    patients,
    careTasks,
    toggleTask,
    appointments,
    coordinationLogs,
    addCoordinationLog,
    rescheduleAppointment,
    isDemoMode,
    activeTab,
    setActiveTab,
  } = useApp();

  // Normalize current active tab
  const currentTab: 'overview' | 'gaps' | 'tasks' | 'appointments' | 'logs' =
    activeTab === 'gaps' || activeTab === 'tasks' || activeTab === 'appointments' || activeTab === 'logs'
      ? activeTab
      : 'overview';

  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Resolution modal state
  const [resolvingGapId, setResolvingGapId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  // Quick outreach action modal
  const [outreachModalGap, setOutreachModalGap] = useState<FollowUpGap | null>(null);
  const [outreachActionType, setOutreachActionType] = useState<
    'phone_call' | 'sms_reminder' | 'telehealth_booked' | 'home_visit_dispatched' | 'physician_escalation'
  >('phone_call');
  const [outreachNotes, setOutreachNotes] = useState<string>('');
  const [outreachOutcome, setOutreachOutcome] = useState<
    'contact_successful' | 'voicemail_left' | 'appointment_secured' | 'escalation_pending' | 'resolved'
  >('contact_successful');

  // Reschedule appointment modal state (replaces window.prompt for robust iFrame UX)
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('2026-10-16T10:30');
  const [rescheduleNote, setRescheduleNote] = useState<string>('Rescheduled by Care Coordinator');

  // AI Continuity Brief Modal state
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiData, setAiData] = useState<{
    summary: string;
    priorityLevel: string;
    suggestedNextSteps: string[];
    coordinatorTalkingPoints: string[];
    modelUsed?: string;
  } | null>(null);
  const [aiBriefModalOpen, setAiBriefModalOpen] = useState<boolean>(false);
  const [briefPatient, setBriefPatient] = useState<Patient | null>(null);

  // Operational metrics calculated strictly from active dataset
  const overdueTasksList = careTasks.filter((t) => t.overdue && !t.completed);
  const missedAppointmentsList = appointments.filter((a) => a.status === 'missed');
  const unresolvedGaps = followUpGaps.filter((g) => g.status !== 'resolved');
  const unresolvedGapsCount = unresolvedGaps.length;

  const criticalGapsCount = unresolvedGaps.filter((g) => g.severity === 'critical').length;
  const highGapsCount = unresolvedGaps.filter((g) => g.severity === 'high').length;
  const moderateGapsCount = unresolvedGaps.filter((g) => g.severity === 'moderate').length;

  const patientIdsNeedingOutreach = new Set([
    ...unresolvedGaps.map((g) => g.patientId),
    ...overdueTasksList.map((t) => t.patientId),
    ...missedAppointmentsList.map((a) => a.patientId),
  ]);
  const patientsNeedingOutreachCount = patientIdsNeedingOutreach.size;

  // Filtered gaps
  const filteredGaps = followUpGaps.filter((g) => {
    if (filterSeverity !== 'all' && g.severity !== filterSeverity) return false;
    if (filterStatus === 'unresolved' && g.status === 'resolved') return false;
    if (filterStatus !== 'all' && filterStatus !== 'unresolved' && g.status !== filterStatus) return false;
    return true;
  });

  // Trigger AI Continuity Synthesis
  const handleGenerateAiBrief = async (gap: FollowUpGap) => {
    const patient = patients.find((p) => p.id === gap.patientId) || {
      name: gap.patientName,
      age: gap.age,
      primaryDiagnosis: gap.primaryDiagnosis,
      daysPostDischarge: gap.daysPostDischarge,
      riskTier: gap.severity === 'critical' ? 'high' : 'moderate',
    };

    setBriefPatient(patient as Patient);
    setAiBriefModalOpen(true);
    setAiLoading(true);
    setAiData(null);

    const patientGaps = followUpGaps.filter((g) => g.patientId === gap.patientId);
    const patientOverdue = careTasks.filter((t) => t.patientId === gap.patientId && t.overdue);
    const patientMissed = appointments.filter((a) => a.patientId === gap.patientId && a.status === 'missed');

    try {
      const res = await fetch('/api/ai/coordinator-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient,
          gaps: patientGaps,
          overdueTasks: patientOverdue,
          missedAppointments: patientMissed,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate summary');
      const data = await res.json();
      setAiData(data);
    } catch {
      // Deterministic continuity fallback
      setAiData({
        summary: `Patient ${patient.name} (${patient.age}y) is ${gap.daysPostDischarge} days post-discharge. Flagged under ${gap.ruleName}. Direct contact recommended to verify clinical recovery.`,
        priorityLevel: gap.severity === 'critical' ? 'Urgent' : 'High Attention',
        suggestedNextSteps: [
          'Verify patient current symptom stability and equipment access.',
          'Review reason for missed items and assist in scheduling immediate review.',
          'Confirm caregiver support and medication supply status.',
        ],
        coordinatorTalkingPoints: [
          `"Hello ${patient.name}, this is your transitional care coordinator from Metro General."`,
          `"I wanted to check in because our system flagged that your recent follow-up log hasn't been completed."`,
          `"Are you feeling short of breath, in pain, or having trouble reaching your clinic?"`,
        ],
        modelUsed: 'deterministic rule-engine',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const submitOutreachLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outreachModalGap) return;

    addCoordinationLog({
      patientId: outreachModalGap.patientId,
      gapId: outreachModalGap.id,
      coordinatorId: 'user-coord-01',
      coordinatorName: 'Maya Lin, RN',
      actionType: outreachActionType,
      notes: outreachNotes || `Coordinator executed ${outreachActionType.replace('_', ' ')} regarding ${outreachModalGap.ruleName}`,
      outcome: outreachOutcome,
    });

    if (outreachOutcome === 'resolved' || outreachOutcome === 'appointment_secured') {
      updateGapStatus(outreachModalGap.id, 'in_progress');
    }

    setOutreachModalGap(null);
    setOutreachNotes('');
  };

  const confirmResolveGap = () => {
    if (!resolvingGapId) return;
    resolveGap(resolvingGapId, resolutionNotes || 'Resolved following coordinator review and clinical action.');
    setResolvingGapId(null);
    setResolutionNotes('');
  };

  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingApt) return;
    rescheduleAppointment(reschedulingApt.id, rescheduleDate, rescheduleNote);
    setReschedulingApt(null);
  };

  // Reusable Gap Card Renderer
  const renderGapCard = (gap: FollowUpGap) => {
    const isCritical = gap.severity === 'critical';
    const isHigh = gap.severity === 'high';
    const isResolved = gap.status === 'resolved';

    return (
      <div
        key={gap.id}
        className={`p-5 bg-white rounded-xl border transition-all ${
          isResolved
            ? 'border-slate-200 opacity-70 bg-slate-50/50'
            : isCritical
            ? 'border-rose-300 ring-1 ring-rose-200/60 shadow-xs'
            : isHigh
            ? 'border-amber-300 shadow-xs'
            : 'border-slate-200'
        }`}
      >
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span
              className={
                isCritical
                  ? 'text-rose-700'
                  : isHigh
                  ? 'text-amber-700'
                  : 'text-teal-700'
              }
            >
              {gap.ruleId}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-slate-900 font-bold">{gap.ruleName}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
              {gap.severity}
            </span>
            <span aria-hidden="true">·</span>
            <span
              className={
                isResolved
                  ? 'text-emerald-700 font-medium'
                  : gap.status === 'in_progress'
                  ? 'text-amber-700 font-medium'
                  : 'text-rose-700 font-semibold'
              }
            >
              {gap.status.replace('_', ' ')}
            </span>
            <span aria-hidden="true">·</span>
            <span>{gap.detectedAt}</span>
          </div>
        </div>

        {/* Patient Context Bar */}
        <div className="flex items-center gap-2 text-xs text-slate-600 mt-2 pb-2 border-b border-slate-100 flex-wrap">
          <span className="font-bold text-slate-900 text-sm">{gap.patientName}</span>
          <span>({gap.age} yrs)</span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-700 font-medium">{gap.primaryDiagnosis}</span>
          <span aria-hidden="true">·</span>
          <span className="text-[#881337] font-semibold">
            Day {gap.daysPostDischarge} post-discharge
          </span>
        </div>

        {/* Trigger & Explainable Clinical Rationale */}
        <div className="mt-3 space-y-2 text-xs">
          <div>
            <span className="font-semibold text-slate-700">Trigger Event: </span>
            <span className="text-slate-800">{gap.triggerReason}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-100 leading-relaxed">
            <span className="font-semibold text-slate-900">Clinical Protocol Rationale: </span>
            {gap.clinicalRationale}
          </div>
        </div>

        {/* Recommended Action */}
        <div className="mt-3 text-xs text-slate-700">
          <span className="font-semibold text-[#881337]">Protocol Action: </span>
          <span>{gap.recommendedAction}</span>
        </div>

        {/* Resolved Note if present */}
        {gap.resolutionNotes && (
          <div className="mt-2 text-xs text-emerald-800 bg-emerald-50/70 p-2 rounded border border-emerald-100">
            <span className="font-semibold">Resolution Outcome: </span>
            {gap.resolutionNotes} (at {gap.resolvedAt})
          </div>
        )}

        {/* Coordinator Action Buttons */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={() => handleGenerateAiBrief(gap)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#881337] bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E15B7C]" />
            <span>AI Continuity Brief & Call Script</span>
          </button>

          <div className="flex items-center gap-1.5 flex-wrap">
            {!isResolved && (
              <>
                <button
                  onClick={() => {
                    setOutreachModalGap(gap);
                    setOutreachActionType('phone_call');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <PhoneCall className="w-3 h-3 text-slate-500" />
                  <span>Log Call</span>
                </button>

                <button
                  onClick={() => {
                    setOutreachModalGap(gap);
                    setOutreachActionType('sms_reminder');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3 h-3 text-slate-500" />
                  <span>Send SMS</span>
                </button>

                <button
                  onClick={() => {
                    setResolvingGapId(gap.id);
                    setResolutionNotes('');
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolve Gap</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Care Continuity Hub
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
            <span className="font-medium text-[#881337]">“Health Doesn’t Happen in Hospitals Alone.”</span>
            <span aria-hidden="true">·</span>
            <span>Metro General Health System</span>
            <span aria-hidden="true">·</span>
            <span>Transitional Care Caseload</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Coordinator:</span>
          <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded">
            Maya Lin, RN ({patients.length} active patients)
          </span>
        </div>
      </div>

      {/* Quantitative Metric Strip (Calculated exclusively from current data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('gaps')}
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-[#881337]/50 cursor-pointer transition-all"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Unresolved Follow-Up Gaps
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-[#881337] mt-1">
            {unresolvedGapsCount}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>
              {criticalGapsCount} Critical · {highGapsCount} High · {moderateGapsCount} Moderate
            </span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('tasks')}
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-amber-400 cursor-pointer transition-all"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Overdue Recovery Tasks
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-amber-600 mt-1">
            {overdueTasksList.length}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Vitals, wound photos & checks</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('appointments')}
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-rose-400 cursor-pointer transition-all"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Missed Clinical Visits
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-rose-600 mt-1">
            {missedAppointmentsList.length}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-rose-500" />
            <span>Requiring immediate reschedule</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('overview')}
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-teal-500 cursor-pointer transition-all"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active Continuity Caseload
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-teal-700 mt-1">
            {patients.length}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-teal-600" />
            <span>{patientsNeedingOutreachCount} patients requiring active outreach</span>
          </div>
        </div>
      </div>

      {/* In-Page Navigation Tab Bar */}
      <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
            currentTab === 'overview'
              ? 'bg-[#881337] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Complete Overview
        </button>
        <button
          onClick={() => setActiveTab('gaps')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
            currentTab === 'gaps'
              ? 'bg-[#881337] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Follow-Up Gaps</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
            currentTab === 'gaps' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {unresolvedGapsCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
            currentTab === 'tasks'
              ? 'bg-[#881337] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Overdue Tasks</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
            currentTab === 'tasks' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {overdueTasksList.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
            currentTab === 'appointments'
              ? 'bg-[#881337] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Missed Visits</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
            currentTab === 'appointments' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {missedAppointmentsList.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
            currentTab === 'logs'
              ? 'bg-[#881337] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Outreach Logs</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
            currentTab === 'logs' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {coordinationLogs.length}
          </span>
        </button>
      </div>

      {/* SECTION A: OVERVIEW (Full Command Center split) */}
      {currentTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 spans): Follow-Up Gaps Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Prioritized Follow-Up Gap Queue
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ordered by urgency and clinical necessity
                </p>
              </div>

              {/* Segmented Filter Buttons */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                <button
                  onClick={() => setFilterSeverity('all')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    filterSeverity === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({followUpGaps.length})
                </button>
                <button
                  onClick={() => setFilterSeverity('critical')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    filterSeverity === 'critical'
                      ? 'bg-white text-rose-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Critical ({criticalGapsCount})
                </button>
                <button
                  onClick={() => setFilterStatus(filterStatus === 'unresolved' ? 'all' : 'unresolved')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    filterStatus === 'unresolved'
                      ? 'bg-white text-[#881337] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Unresolved ({unresolvedGapsCount})
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {filteredGaps.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
                  No follow-up gaps match the selected filters.
                </div>
              ) : (
                filteredGaps.map(renderGapCard)
              )}
            </div>
          </div>

          {/* Right Column: Overdue Tasks & Missed Visits & Activity */}
          <div className="space-y-6">
            {/* Overdue Recovery Tasks Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Overdue Recovery Tasks</h3>
                  <p className="text-xs text-slate-500">Unsubmitted patient daily items</p>
                </div>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="text-xs font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  View All ({overdueTasksList.length})
                </button>
              </div>

              <div className="space-y-2.5">
                {overdueTasksList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No overdue tasks.</p>
                ) : (
                  overdueTasksList.slice(0, 3).map((task) => {
                    const patient = patients.find((p) => p.id === task.patientId);
                    return (
                      <div
                        key={task.id}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{task.title}</span>
                          <span className="text-rose-600 font-medium text-[11px]">Due {task.dueTime}</span>
                        </div>
                        <div className="text-slate-600 flex items-center justify-between">
                          <span>
                            Patient: <strong className="text-slate-800">{patient?.name || 'Assigned Patient'}</strong>
                          </span>
                          <span className="text-[11px] text-slate-500">{task.category.replace('_', ' ')}</span>
                        </div>
                        <p className="text-slate-500 line-clamp-1">{task.description}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Missed Appointments Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Missed Visits Requiring Action</h3>
                  <p className="text-xs text-slate-500">Post-discharge clinical dropouts</p>
                </div>
                <button
                  onClick={() => setActiveTab('appointments')}
                  className="text-xs font-bold text-rose-700 hover:underline cursor-pointer"
                >
                  View All ({missedAppointmentsList.length})
                </button>
              </div>

              <div className="space-y-3">
                {missedAppointmentsList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No missed appointments.</p>
                ) : (
                  missedAppointmentsList.slice(0, 2).map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3 rounded-lg border border-rose-200 bg-rose-50/30 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{apt.patientName}</span>
                        <span className="text-rose-700 font-semibold uppercase text-[10px]">Missed</span>
                      </div>
                      <div className="text-slate-600">
                        <div>{apt.department} with {apt.providerName}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{apt.formattedTime}</div>
                      </div>
                      <button
                        onClick={() => {
                          setReschedulingApt(apt);
                          setRescheduleDate('2026-10-16T10:30');
                          setRescheduleNote(`Rescheduled visit for ${apt.patientName} following outreach call`);
                        }}
                        className="w-full py-1.5 font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors text-center cursor-pointer"
                      >
                        Reschedule Clinical Visit
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Coordination Log Feed */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Recent Coordinator Actions</h3>
                <button
                  onClick={() => setActiveTab('logs')}
                  className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                >
                  All Logs ({coordinationLogs.length})
                </button>
              </div>
              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {coordinationLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="font-semibold text-slate-700">{log.actionType.replace('_', ' ').toUpperCase()}</span>
                      <span>{log.timestamp}</span>
                    </div>
                    <p className="text-slate-800 leading-snug">{log.notes}</p>
                    <div className="text-[11px] text-teal-700 font-medium">Outcome: {log.outcome.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION B: FOLLOW-UP GAPS QUEUE */}
      {currentTab === 'gaps' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Post-Discharge Follow-Up Gap Detection
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rule-based clinical continuity triggers requiring coordinator review
              </p>
            </div>

            {/* Segmented Filter Buttons */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
              <button
                onClick={() => setFilterSeverity('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  filterSeverity === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Gaps ({followUpGaps.length})
              </button>
              <button
                onClick={() => setFilterSeverity('critical')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  filterSeverity === 'critical'
                    ? 'bg-white text-rose-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Critical ({criticalGapsCount})
              </button>
              <button
                onClick={() => setFilterStatus(filterStatus === 'unresolved' ? 'all' : 'unresolved')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  filterStatus === 'unresolved'
                    ? 'bg-white text-[#881337] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unresolved ({unresolvedGapsCount})
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredGaps.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
                No follow-up gaps match the selected filters.
              </div>
            ) : (
              filteredGaps.map(renderGapCard)
            )}
          </div>
        </div>
      )}

      {/* SECTION C: OVERDUE RECOVERY TASKS */}
      {currentTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">Overdue Patient Recovery Tasks</h2>
              <p className="text-xs text-slate-500">
                Daily vitals, symptoms, and self-checks not logged within target protocol window
              </p>
            </div>
            <div className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              {overdueTasksList.length} Tasks Pending Review
            </div>
          </div>

          <div className="space-y-3">
            {overdueTasksList.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
                No overdue tasks. All patients have completed their scheduled daily items.
              </div>
            ) : (
              overdueTasksList.map((task) => {
                const patient = patients.find((p) => p.id === task.patientId);
                return (
                  <div
                    key={task.id}
                    className="p-5 bg-white rounded-xl border border-amber-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-900 text-sm">{task.title}</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-rose-700 font-semibold font-mono">Due {task.dueTime}</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-slate-500 capitalize">{task.category.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs text-slate-600">{task.description}</p>
                      <div className="text-xs text-slate-500 flex items-center gap-2 pt-1">
                        <span>Patient: <strong className="text-slate-800">{patient?.name || 'Assigned Patient'}</strong></span>
                        <span aria-hidden="true">·</span>
                        <span>{patient?.primaryDiagnosis}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#881337] font-semibold">Day {patient?.daysPostDischarge} post-discharge</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => {
                          const gap = followUpGaps.find((g) => g.patientId === task.patientId) || {
                            id: `gap-${task.id}`,
                            patientId: task.patientId,
                            patientName: patient?.name || 'Patient',
                            age: patient?.age || 65,
                            primaryDiagnosis: patient?.primaryDiagnosis || 'Recovery',
                            daysPostDischarge: patient?.daysPostDischarge || 4,
                            severity: 'high' as const,
                            ruleId: 'GAP-TASK-OVERDUE',
                            ruleName: 'Overdue Recovery Task Protocol',
                            triggerReason: `Task "${task.title}" overdue`,
                            clinicalRationale: 'Patient failed to record required metric.',
                            recommendedAction: 'Contact patient to verify stability.',
                            detectedAt: 'Today',
                            assignedCoordinatorName: 'Maya Lin, RN',
                            status: 'unresolved' as const,
                          };
                          setOutreachModalGap(gap);
                          setOutreachActionType('phone_call');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
                        <span>Call Patient</span>
                      </button>

                      <button
                        onClick={() => toggleTask(task.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Verify & Complete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SECTION D: MISSED CLINICAL VISITS */}
      {currentTab === 'appointments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">Missed Clinical Visits Requiring Reschedule</h2>
              <p className="text-xs text-slate-500">
                Patients who missed scheduled post-acute consultations or cardiac touchpoints
              </p>
            </div>
            <div className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
              {missedAppointmentsList.length} Missed Touchpoints
            </div>
          </div>

          <div className="space-y-3">
            {missedAppointmentsList.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
                No missed appointments currently pending.
              </div>
            ) : (
              missedAppointmentsList.map((apt) => (
                <div
                  key={apt.id}
                  className="p-5 bg-white rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-900 text-base">{apt.patientName}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-slate-600 font-semibold">{apt.department}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-slate-600">with {apt.providerName}</span>
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold uppercase text-[10px]">
                        Missed
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">Original Slot: {apt.formattedTime}</span>
                      <span>({apt.branchName})</span>
                    </div>

                    {apt.notes && (
                      <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-rose-100">
                        {apt.notes}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setReschedulingApt(apt);
                        setRescheduleDate('2026-10-16T10:30');
                        setRescheduleNote(`Rescheduled appointment for ${apt.patientName} following coordinator outreach`);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#881337] hover:bg-[#670d28] rounded-lg transition-colors cursor-pointer shadow-2xs"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      <span>Reschedule Clinical Visit</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION E: OUTREACH & COORDINATION LOGS */}
      {currentTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">Transitional Care Outreach Log Audit</h2>
              <p className="text-xs text-slate-500">
                Documented patient phone calls, SMS care alerts, and clinical escalations
              </p>
            </div>
            <div className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">
              {coordinationLogs.length} Documented Actions
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="divide-y divide-slate-100">
              {coordinationLogs.map((log) => (
                <div key={log.id} className="p-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase tracking-wider text-[#881337] bg-rose-50 px-2 py-0.5 rounded border border-rose-100 text-[10px]">
                        {log.actionType.replace('_', ' ')}
                      </span>
                      <span className="font-semibold text-slate-800">{log.coordinatorName}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">{log.timestamp}</span>
                  </div>
                  <p className="text-slate-800 leading-relaxed text-sm bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                    {log.notes}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-teal-700 font-medium pt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-teal-600" />
                    <span>Outcome: {log.outcome.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Continuity Brief Modal */}
      {aiBriefModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-rose-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-[#881337] text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    AI Care Continuity Brief & Call Guide
                  </h3>
                  <p className="text-xs text-slate-500">
                    Patient: {briefPatient?.name} ({briefPatient?.primaryDiagnosis})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAiBriefModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-600 border border-slate-200">
                <strong>Continuity Support:</strong> Synthesizes recovery timeline and overdue items to assist outreach communication.
              </div>

              {aiLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-3 border-[#881337] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-600 font-medium">
                    Synthesizing patient recovery timeline, overdue tasks, and follow-up history...
                  </p>
                </div>
              ) : aiData ? (
                <div className="space-y-4 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                      Continuity Situation Summary
                    </h4>
                    <p className="text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed text-sm">
                      {aiData.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Recommended Attention Level:</span>
                    <span className="font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-xs">
                      {aiData.priorityLevel}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
                      Recommended Coordinator Next Actions
                    </h4>
                    <ul className="space-y-1.5">
                      {aiData.suggestedNextSteps.map((step, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 p-2 bg-slate-50 rounded border border-slate-100 text-slate-800"
                        >
                          <span className="font-bold text-[#881337] shrink-0 font-mono">{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
                      Coordinator Call Talking Points
                    </h4>
                    <div className="space-y-2">
                      {aiData.coordinatorTalkingPoints.map((point, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-teal-50/50 rounded border border-teal-100 text-slate-800 italic"
                        >
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Engine: {aiData?.modelUsed || 'Gemini 2.5 Flash'}
              </span>
              <button
                onClick={() => setAiBriefModalOpen(false)}
                className="px-4 py-1.5 bg-[#881337] hover:bg-[#670d28] text-white font-semibold rounded-lg cursor-pointer"
              >
                Close Brief
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outreach Action Log Modal */}
      {outreachModalGap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                Log Intervention for {outreachModalGap.patientName}
              </h3>
              <button onClick={() => setOutreachModalGap(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={submitOutreachLog} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Action Type</label>
                <select
                  value={outreachActionType}
                  onChange={(e: any) => setOutreachActionType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                >
                  <option value="phone_call">Telephone Outreach Call</option>
                  <option value="sms_reminder">SMS Care Alert</option>
                  <option value="telehealth_booked">Urgent Telehealth Scheduled</option>
                  <option value="home_visit_dispatched">Home Health Nurse Dispatched</option>
                  <option value="physician_escalation">Attending Physician Escalation</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Outreach Notes</label>
                <textarea
                  rows={3}
                  value={outreachNotes}
                  onChange={(e) => setOutreachNotes(e.target.value)}
                  placeholder="Detail conversation, patient status, or reason for action..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Outcome</label>
                <select
                  value={outreachOutcome}
                  onChange={(e: any) => setOutreachOutcome(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                >
                  <option value="contact_successful">Contact Successful - Plan Agreed</option>
                  <option value="voicemail_left">Left Voicemail / Pending Callback</option>
                  <option value="appointment_secured">Appointment Rescheduled / Secured</option>
                  <option value="escalation_pending">Escalated to MD / Awaiting Reply</option>
                  <option value="resolved">Issue Fully Resolved</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOutreachModalGap(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-[#881337] hover:bg-[#670d28] rounded-lg cursor-pointer"
                >
                  Save Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Clinical Appointment Modal (Clean in-app modal instead of prompt) */}
      {reschedulingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-rose-50/50">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-[#881337]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Reschedule Follow-Up for {reschedulingApt.patientName}
                </h3>
              </div>
              <button
                onClick={() => setReschedulingApt(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-slate-600 space-y-1">
                <div>Original Department: <strong className="text-slate-800">{reschedulingApt.department}</strong></div>
                <div>Assigned Clinician: <strong className="text-slate-800">{reschedulingApt.providerName}</strong></div>
                <div>Facility Branch: <strong className="text-slate-800">{reschedulingApt.branchName}</strong></div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Appointment Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs bg-white focus:ring-2 focus:ring-[#881337]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Coordinator Rescheduling Notes</label>
                <textarea
                  rows={3}
                  value={rescheduleNote}
                  onChange={(e) => setRescheduleNote(e.target.value)}
                  placeholder="Reason for reschedule, transportation confirmation, caregiver notice..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-[#881337]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReschedulingApt(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-[#881337] hover:bg-[#670d28] rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolution Confirmation Modal */}
      {resolvingGapId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Mark Follow-Up Gap as Resolved</h3>
            <p className="text-xs text-slate-600">
              Please document the verified outcome before closing this gap:
            </p>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. Spoke with patient Eleanor Vance. Weight logged as 168.4 lbs; diuretic dose taken; telehealth visit confirmed for tomorrow."
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#881337]"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setResolvingGapId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmResolveGap}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
