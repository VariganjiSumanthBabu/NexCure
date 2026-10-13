import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { NexCureLogo } from '../brand/NexCureLogo';
import { UserRole } from '../../types';
import {
  Database,
  ShieldCheck,
  Lock,
  AlertCircle,
  ChevronDown,
  HeartPulse,
  User,
  Stethoscope,
  Building2,
  Shield,
  LogOut,
  Sparkles,
  LogIn,
} from 'lucide-react';

interface TopBarProps {
  onOpenRoleModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenRoleModal }) => {
  const {
    currentRole,
    currentUser,
    switchRole,
    activeTab,
    setActiveTab,
    connectionState,
    isDemoMode,
    setShowDbModal,
    signOut,
  } = useApp();

  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDemoMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleLabels: Record<UserRole, string> = {
    coordinator: 'Care Coordinator',
    patient: 'Patient Portal',
    doctor: 'Healthcare Professional',
    hospital_admin: 'Hospital Admin',
    superadmin: 'Superadmin',
  };

  const personas: { role: UserRole; label: string; userLabel: string; icon: React.ReactNode }[] = [
    {
      role: 'coordinator',
      label: 'Care Coordinator',
      userLabel: 'Maya Lin, RN',
      icon: <HeartPulse className="w-4 h-4 text-[#881337]" />,
    },
    {
      role: 'patient',
      label: 'Patient Portal',
      userLabel: 'Eleanor Vance (Post-CHF)',
      icon: <User className="w-4 h-4 text-rose-700" />,
    },
    {
      role: 'doctor',
      label: 'Healthcare Pro',
      userLabel: 'Dr. James Wilson, MD',
      icon: <Stethoscope className="w-4 h-4 text-sky-700" />,
    },
    {
      role: 'hospital_admin',
      label: 'Hospital Admin',
      userLabel: 'Elena Rostova, MHA',
      icon: <Building2 className="w-4 h-4 text-teal-700" />,
    },
    {
      role: 'superadmin',
      label: 'Platform Superadmin',
      userLabel: 'Dr. Aris Thorne',
      icon: <Shield className="w-4 h-4 text-purple-700" />,
    },
  ];

  const getNavLinks = () => {
    switch (currentRole) {
      case 'coordinator':
        return [
          { id: 'overview', label: 'Overview' },
          { id: 'gaps', label: 'Follow-Up Gaps' },
          { id: 'tasks', label: 'Overdue Tasks' },
          { id: 'appointments', label: 'Missed Visits' },
          { id: 'logs', label: 'Outreach Logs' },
        ];
      case 'patient':
        return [
          { id: 'today', label: "Today's Checklist" },
          { id: 'meds', label: 'Medications' },
          { id: 'appointments', label: 'Upcoming Visits' },
          { id: 'redflags', label: 'When to Call' },
        ];
      case 'doctor':
        return [
          { id: 'roster', label: 'Assigned Patients' },
          { id: 'careplans', label: 'Care Plans' },
          { id: 'schedule', label: 'Clinical Schedule' },
        ];
      case 'hospital_admin':
        return [
          { id: 'workspace', label: 'Hospital Census' },
          { id: 'branches', label: 'Facility Branches' },
          { id: 'staff', label: 'Clinical Staff' },
          { id: 'cohorts', label: 'Discharge Cohorts' },
        ];
      case 'superadmin':
        return [
          { id: 'registrations', label: 'Hospital Registrations' },
        ];
    }
  };

  const navLinks = getNavLinks();

  const getDataSourceIndicator = () => {
    if (isDemoMode) {
      return {
        icon: <Database className="w-3.5 h-3.5 text-amber-600" />,
        label: 'Demo data',
        className: 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80',
        title: 'Running with local demonstration data (click to inspect database settings)',
      };
    }

    switch (connectionState) {
      case 'connected':
        return {
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Live database',
          className: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200',
          title: 'Connected to live Supabase database',
        };
      case 'auth_required':
      case 'reachable':
        return {
          icon: <Lock className="w-3.5 h-3.5 text-sky-600" />,
          label: 'Auth required',
          className: 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200',
          title: 'Database reachable but requires authentication',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
          label: 'Database error',
          className: 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200',
          title: 'Database connection error',
        };
      default:
        return {
          icon: <Database className="w-3.5 h-3.5 text-slate-500" />,
          label: 'Demo data',
          className: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200',
          title: 'Using demonstration data',
        };
    }
  };

  const dataSource = getDataSourceIndicator();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Zone 1: Logo & Section Indicator */}
          <div className="flex items-center gap-3 shrink-0">
            <NexCureLogo size="md" showTagline={false} />
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="text-slate-300">/</span>
              <span className="text-[#881337] font-semibold tracking-tight">
                {roleLabels[currentRole]}
              </span>
            </div>
          </div>

          {/* Zone 2: Role-specific clean navigation links */}
          <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-600">
            {navLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`transition-colors whitespace-nowrap py-1 border-b-2 font-medium tracking-tight cursor-pointer ${
                    isActive
                      ? 'border-[#881337] text-[#881337] font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Data Source + User / Role Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Single Compact Data Source Indicator */}
            <button
              onClick={() => setShowDbModal(true)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${dataSource.className}`}
              title={dataSource.title}
            >
              {dataSource.icon}
              <span className="hidden sm:inline">{dataSource.label}</span>
            </button>

            {/* In Demo Mode: Compact Demo Controls Dropdown */}
            {isDemoMode ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDemoMenuOpen(!demoMenuOpen)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                  title="Switch between demonstration personas"
                >
                  <span className="text-slate-500 font-normal hidden lg:inline">Demo:</span>
                  <span className="max-w-[140px] truncate">{roleLabels[currentRole]}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {demoMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in text-xs">
                    <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <span>Evaluator Personas</span>
                      <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-mono text-[10px]">
                        Demo
                      </span>
                    </div>

                    <div className="py-1">
                      {personas.map((p) => {
                        const isCurrent = currentRole === p.role;
                        return (
                          <button
                            key={p.role}
                            onClick={() => {
                              switchRole(p.role);
                              setDemoMenuOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                              isCurrent ? 'bg-rose-50/60 font-semibold text-[#881337]' : 'text-slate-700'
                            }`}
                          >
                            <span className="shrink-0">{p.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="truncate">{p.label}</div>
                              <div className="text-[11px] text-slate-400 font-normal truncate">
                                {p.userLabel}
                              </div>
                            </div>
                            {isCurrent && (
                              <span className="text-[10px] text-[#881337] font-bold">Active</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-1.5 mt-1 border-t border-slate-100 px-2 space-y-1">
                      <button
                        onClick={() => {
                          setDemoMenuOpen(false);
                          onOpenRoleModal();
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded text-xs font-semibold text-[#881337] hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In with Live Database Account</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* In Live Mode: Authenticated Identity & Verified Role */
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    {roleLabels[currentRole]}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Sign Out to Demo Mode"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
