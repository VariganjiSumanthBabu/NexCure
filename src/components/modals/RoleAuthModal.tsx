import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { DEMO_USERS } from '../../data/mockData';
import { NexCureLogo } from '../brand/NexCureLogo';
import { signInSupabaseUser, getSupabaseClient, resolveAuthenticatedUserAccess } from '../../lib/supabase';
import {
  X,
  Shield,
  Building2,
  Stethoscope,
  HeartPulse,
  User,
  LogIn,
  Lock,
  Mail,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

interface RoleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleAuthModal: React.FC<RoleAuthModalProps> = ({ isOpen, onClose }) => {
  const {
    currentRole,
    currentUser,
    switchRole,
    connectionHealth,
    isDemoMode,
    enableDemoMode,
    checkConnection,
    signOut,
  } = useApp();

  const isLiveConfigActive = connectionHealth.hasKey && !!connectionHealth.url && !isDemoMode;

  const [tab, setTab] = useState<'switch' | 'login'>(isDemoMode ? 'switch' : 'login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  if (!isOpen) return null;

  const roleCards: {
    role: UserRole;
    title: string;
    name: string;
    subtitle: string;
    organization: string;
    icon: React.ReactNode;
    description: string;
  }[] = [
    {
      role: 'coordinator',
      title: 'Care Coordinator',
      name: 'Maya Lin, RN, BSN',
      subtitle: 'Lead Transitional Care Coordinator',
      organization: 'Metro General Health System',
      icon: <HeartPulse className="w-5 h-5 text-[#881337]" />,
      description: 'Core dashboard: track recovery gaps, missed follow-ups, overdue tasks, and trigger AI-assisted continuity briefs.',
    },
    {
      role: 'patient',
      title: 'Patient Recovery Portal',
      name: 'Eleanor Vance',
      subtitle: 'Post-CHF Inpatient Recovery (Day 4)',
      organization: 'Metro General Cardiology Cohort',
      icon: <User className="w-5 h-5 text-teal-600" />,
      description: 'Simple, accessible recovery tasks, daily medications checklist, streak tracking, and red flag emergency warnings.',
    },
    {
      role: 'doctor',
      title: 'Healthcare Professional',
      name: 'Dr. James Wilson, MD, FACC',
      subtitle: 'Attending Cardiologist',
      organization: 'Main Medical Campus',
      icon: <Stethoscope className="w-5 h-5 text-sky-600" />,
      description: 'Manage assigned high/moderate risk patients, customize recovery care plans, and review clinical appointment status.',
    },
    {
      role: 'hospital_admin',
      title: 'Hospital Administrator',
      name: 'Elena Rostova, MHA',
      subtitle: 'VP of Clinical Operations',
      organization: 'Metro General Health System',
      icon: <Building2 className="w-5 h-5 text-amber-600" />,
      description: 'Oversee facilities, multi-branch capacity, care coordinator caseloads, and hospital census.',
    },
    {
      role: 'superadmin',
      title: 'Platform Superadmin',
      name: 'Dr. Aris Thorne',
      subtitle: 'Chief Medical & Compliance Officer',
      organization: 'NexCure National Platform Governance',
      icon: <Shield className="w-5 h-5 text-purple-600" />,
      description: 'Review hospital registrations, approve new medical centers, and monitor cross-network compliance.',
    },
  ];

  const handleRoleSelect = (role: UserRole) => {
    if (!isDemoMode) {
      setAuthError('Demo persona switching is disabled in Live Mode. Live roles are resolved directly from database profiles and hospital memberships.');
      return;
    }
    switchRole(role);
    onClose();
  };

  /**
   * Fail-Closed Authentication Handler (Phase 1 Acceptance Item 2)
   * - In Live Mode: Authenticate against Supabase Auth.
   * - If credentials fail, NEVER fall through to demo email matcher!
   * - After successful login, resolve real application role from profiles & hospital_memberships.
   * - If unprovisioned, reject and do not assign arbitrary role.
   */
  const handleSimulateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    // 1. If Live Configuration is active (or user is signing into Supabase):
    if (connectionHealth.hasKey && connectionHealth.url && !isDemoMode) {
      setAuthLoading(true);
      const res = await signInSupabaseUser(emailInput, passwordInput);

      if (!res.success || !res.user) {
        setAuthLoading(false);
        // FAIL CLOSED: Never fall through to demo account matcher when live configuration is active!
        setAuthError(`Live Authentication Failed: ${res.error || 'Invalid credentials or user not found in Supabase Auth.'}`);
        return;
      }

      // Supabase Auth succeeded. Now verify application role and memberships in database!
      const client = getSupabaseClient();
      if (!client) {
        setAuthLoading(false);
        setAuthError('Database client error after sign in.');
        return;
      }

      const access = await resolveAuthenticatedUserAccess(client, res.user.id);
      setAuthLoading(false);

      if (!access.hasValidRole) {
        // FAIL CLOSED: Account is authenticated in Auth, but has NO valid profile or active membership!
        setAuthError(`Account Not Provisioned / Access Denied: User "${res.user.email}" authenticated successfully, but has no platform role in 'profiles' or active assignment in 'hospital_memberships'. Contact your hospital administrator.`);
        return;
      }

      setAuthSuccess(`Verified access as ${res.user.email} with '${access.role}' role! Synchronizing workspace...`);
      await checkConnection();
      setTimeout(() => {
        onClose();
      }, 900);
      return;
    }

    // 2. Demo Mode account matcher (only active when in explicit Demo Mode)
    if (isDemoMode) {
      const matched = Object.values(DEMO_USERS).find(
        (u) => u.email.toLowerCase() === emailInput.trim().toLowerCase()
      );

      if (matched) {
        switchRole(matched.role);
        setAuthSuccess(`Signed in as demo persona: ${matched.name} (${matched.title})`);
        setTimeout(() => {
          onClose();
        }, 700);
      } else {
        setAuthError('Demo email not recognized. Use one of: m.lin@metrohealth.org, eleanor.vance@patient.nexcure.org, jwilson@metrohealth.org, e.rostova@metrohealth.org, or thorne@nexcure.gov');
      }
      return;
    }

    // 3. Unconfigured fallback
    setAuthError('No active authentication provider configured. Switch to Demo Mode to explore personas.');
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    await signOut();
    setAuthLoading(false);
    setAuthSuccess('Signed out of Supabase session. Demo mode active.');
    setTimeout(() => {
      onClose();
    }, 700);
  };

  const handleSwitchToDemoMode = async () => {
    await enableDemoMode();
    setTab('switch');
    setAuthSuccess('Switched to Demo Mode (Local Synthetic Dataset).');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <NexCureLogo size="sm" showTagline={false} />
            <h2 className="text-base font-bold text-slate-900">
              {isDemoMode ? 'NexCure Demo Persona Switcher' : 'Live Supabase Authentication'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-100/50 px-6 pt-3">
          {isDemoMode && (
            <button
              onClick={() => { setTab('switch'); setAuthError(''); setAuthSuccess(''); }}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                tab === 'switch'
                  ? 'border-[#881337] text-[#881337]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Demo Personas (5 Workspaces)
            </button>
          )}
          <button
            onClick={() => { setTab('login'); setAuthError(''); setAuthSuccess(''); }}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'login'
                ? 'border-[#881337] text-[#881337]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {isDemoMode ? 'Simulate User Login' : 'Supabase Auth Credentials'}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Active Session Info Pill */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Active User:</span>
              <span className="text-slate-900 font-bold">{currentUser.name}</span>
              <span className="text-slate-500">({currentUser.title})</span>
            </div>
            {connectionHealth.hasActiveSession && (
              <button
                onClick={handleSignOut}
                disabled={authLoading}
                className="flex items-center gap-1 text-rose-700 hover:text-rose-900 font-semibold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>

          {/* Feedback Messages */}
          {authError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Authentication Notice: </strong>
                <span>{authError}</span>
              </div>
            </div>
          )}

          {authSuccess && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{authSuccess}</span>
            </div>
          )}

          {/* Tab 1: Demo Persona Switcher (Disabled in Live Mode) */}
          {tab === 'switch' && isDemoMode && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Select any demonstration persona below to evaluate role-tailored clinical workflows:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {roleCards.map((rc) => {
                  const isActive = currentRole === rc.role;
                  return (
                    <button
                      key={rc.role}
                      onClick={() => handleRoleSelect(rc.role)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                        isActive
                          ? 'border-[#881337] bg-rose-50/40 ring-1 ring-[#881337]/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs shrink-0 mt-0.5">
                        {rc.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {rc.title}
                          </span>
                          {isActive && (
                            <span className="text-[10px] bg-[#881337] text-white font-semibold px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-medium text-slate-700 mt-0.5">
                          {rc.name} <span className="text-slate-400 font-normal">· {rc.subtitle}</span>
                        </div>

                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {rc.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live Mode Notice when Tab 1 would otherwise show */}
          {!isDemoMode && tab === 'switch' && (
            <div className="p-6 text-center space-y-3 bg-slate-50 rounded-xl border border-slate-200">
              <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Live Database Mode Active</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Demo persona switching is disabled when connected to live database mode.
                Your workspace role is governed by your authenticated profile in <code className="font-mono text-slate-800 bg-white px-1 py-0.5 rounded border border-slate-200">profiles</code> and active <code className="font-mono text-slate-800 bg-white px-1 py-0.5 rounded border border-slate-200">hospital_memberships</code>.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleSwitchToDemoMode}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  Switch Back to Demo Mode
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Live Sign In Form */}
          {tab === 'login' && (
            <form onSubmit={handleSimulateLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={
                      isLiveConfigActive
                        ? 'Enter your live Supabase account email'
                        : 'e.g., m.lin@metrohealth.org'
                    }
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#881337]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={
                      isLiveConfigActive
                        ? 'Supabase Auth password'
                        : 'Demo password (optional)'
                    }
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#881337]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {!isDemoMode && (
                  <button
                    type="button"
                    onClick={handleSwitchToDemoMode}
                    className="text-xs text-slate-600 hover:text-slate-900 underline"
                  >
                    Switch to Demo Mode
                  </button>
                )}
                {isDemoMode && <div></div>}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="px-4 py-2 bg-[#881337] hover:bg-[#670d28] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer ml-auto"
                >
                  {authLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogIn className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isLiveConfigActive ? 'Sign In to Supabase' : 'Sign In as Demo Persona'}
                  </span>
                </button>
              </div>

              {/* Demo quick credential helper */}
              {isDemoMode && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 space-y-1">
                  <div className="font-semibold text-slate-700">Demo Quick Emails:</div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Object.values(DEMO_USERS).map((u) => (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => setEmailInput(u.email)}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 font-mono text-[10px]"
                      >
                        {u.email}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
          <span>Row-Level Security enforces clinical boundaries in live deployment.</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-semibold rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
