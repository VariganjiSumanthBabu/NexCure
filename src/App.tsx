/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { TopBar } from './components/navigation/TopBar';
import { CareCoordinatorView } from './components/views/CareCoordinatorView';
import { PatientView } from './components/views/PatientView';
import { HealthcareProView } from './components/views/HealthcareProView';
import { HospitalAdminView } from './components/views/HospitalAdminView';
import { SuperadminView } from './components/views/SuperadminView';
import { RoleAuthModal } from './components/modals/RoleAuthModal';
import { SupabaseConfigModal } from './components/modals/SupabaseConfigModal';
import { NexCureLogo } from './components/brand/NexCureLogo';
import { AlertCircle, CheckCircle2, X, ShieldAlert } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const {
    currentRole,
    isAccountUnprovisioned,
    unprovisionedError,
    enableDemoMode,
    signOut,
    lastDatabaseError,
    lastDatabaseNotice,
    clearDatabaseMessages,
  } = useApp();

  const [roleModalOpen, setRoleModalOpen] = useState<boolean>(false);

  const renderActiveView = () => {
    // Phase 1 Acceptance: Clear access-denied or account-not-provisioned screen
    if (isAccountUnprovisioned) {
      return (
        <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-md text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-700 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Denied: Account Not Provisioned</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {unprovisionedError ||
              'Your authenticated account has no authorized role in the database. Access to live clinical continuity records is restricted.'}
          </p>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs text-slate-600 space-y-1.5">
            <div className="font-semibold text-slate-800">Account Provisioning Requirements:</div>
            <div>• Platform Superadmins require an active platform role record in the database</div>
            <div>• Clinical Staff require an active membership record with an affiliated hospital</div>
            <div>• Patients require linkage to their patient chart identifier</div>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={enableDemoMode}
              className="px-4 py-2 bg-[#881337] hover:bg-[#670d28] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Switch to Demo Mode
            </button>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    switch (currentRole) {
      case 'coordinator':
        return <CareCoordinatorView />;
      case 'patient':
        return <PatientView />;
      case 'doctor':
        return <HealthcareProView />;
      case 'hospital_admin':
        return <HospitalAdminView />;
      case 'superadmin':
        return <SuperadminView />;
      default:
        return <CareCoordinatorView />;
    }
  };

  // Determine active operational notice (consolidated single notice area)
  const activeNotice = lastDatabaseError
    ? {
        type: 'error' as const,
        message: lastDatabaseError,
        icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
        className: 'bg-rose-50 border-rose-200 text-rose-900',
        closeColor: 'text-rose-500 hover:text-rose-700',
      }
    : lastDatabaseNotice
    ? {
        type: 'notice' as const,
        message: lastDatabaseNotice,
        icon: <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />,
        className: 'bg-teal-50 border-teal-200 text-teal-900',
        closeColor: 'text-teal-500 hover:text-teal-700',
      }
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* 1. Shared Redesigned Header */}
      <TopBar onOpenRoleModal={() => setRoleModalOpen(true)} />

      {/* 2. Single Consolidated Operational Notice Area (No multi-band stacking) */}
      {activeNotice && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3">
          <div
            className={`flex items-start justify-between gap-3 p-3 border rounded-xl text-xs ${activeNotice.className}`}
          >
            <div className="flex items-start gap-2.5">
              {activeNotice.icon}
              <div className="leading-relaxed">
                <span>{activeNotice.message}</span>
              </div>
            </div>
            <button
              onClick={clearDatabaseMessages}
              className={`p-1 rounded cursor-pointer ${activeNotice.closeColor}`}
              title="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {renderActiveView()}
      </main>

      {/* 4. Calm, Honest Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <NexCureLogo size="sm" showTagline={false} />
            <span className="text-slate-300">|</span>
            <span className="italic text-slate-600">
              “Health Doesn’t Happen in Hospitals Alone.”
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            <span>Post-Discharge Care Continuity Platform</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RoleAuthModal isOpen={roleModalOpen} onClose={() => setRoleModalOpen(false)} />
      <SupabaseConfigModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <DashboardContent />
    </AppProvider>
  );
}
