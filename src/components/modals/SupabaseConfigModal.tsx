import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  clearCustomConfig,
  CANONICAL_SCHEMA_DOCS,
  ConnectionHealth,
  isServiceRoleKey,
} from '../../lib/supabase';
import {
  Database,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  X,
  KeyRound,
  Lock,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Layers,
  UserCheck,
} from 'lucide-react';

export const SupabaseConfigModal: React.FC = () => {
  const {
    showDbModal,
    setShowDbModal,
    connectionHealth,
    checkConnection,
    enableDemoMode,
    resetToEnvConfig,
  } = useApp();

  const [urlInput, setUrlInput] = useState(getStoredSupabaseConfig().url);
  const [keyInput, setKeyInput] = useState(getStoredSupabaseConfig().anonKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionHealth | null>(null);
  const [activeTab, setActiveTab] = useState<'connection' | 'schema'>('connection');
  const [keyValidationError, setKeyValidationError] = useState<string | null>(null);

  if (!showDbModal) return null;

  const currentHealth = testResult || connectionHealth;
  const isCustom = getStoredSupabaseConfig().isCustom;

  const handleKeyChange = (val: string) => {
    setKeyInput(val);
    if (isServiceRoleKey(val)) {
      setKeyValidationError('Security Warning: This appears to be a service-role key. Only client-safe public/anon keys are permitted.');
    } else {
      setKeyValidationError(null);
    }
  };

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setKeyValidationError(null);

    if (isServiceRoleKey(keyInput)) {
      setTesting(false);
      setKeyValidationError('Blocked: Service-role key detected. Never provide secret or service-role keys to browser applications.');
      return;
    }

    const health = await testSupabaseConnection(urlInput.trim(), keyInput.trim());
    setTesting(false);
    setTestResult(health);

    if (health.state === 'connected' || health.state === 'auth_required' || health.state === 'configured') {
      saveSupabaseConfig(urlInput.trim(), keyInput.trim(), false);
      await checkConnection();
    }
  };

  const handleActivateDemoMode = async () => {
    setTesting(false);
    await enableDemoMode();
    setUrlInput('');
    setKeyInput('');
    setTestResult(null);
  };

  const handleResetToEnv = async () => {
    clearCustomConfig();
    const stored = getStoredSupabaseConfig();
    setUrlInput(stored.url);
    setKeyInput(stored.anonKey);
    setTestResult(null);
    await resetToEnvConfig();
  };

  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'connected':
        return {
          icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
          title: 'Supabase Connected',
          badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        };
      case 'auth_required':
        return {
          icon: <Lock className="w-4 h-4 text-sky-600" />,
          title: 'Authentication Required (Database Reachable)',
          badgeClass: 'bg-sky-50 border-sky-200 text-sky-900',
        };
      case 'reachable':
        return {
          icon: <Lock className="w-4 h-4 text-sky-600" />,
          title: 'Supabase Reachable (Session Required)',
          badgeClass: 'bg-sky-50 border-sky-200 text-sky-900',
        };
      case 'configured':
        return {
          icon: <Info className="w-4 h-4 text-amber-600" />,
          title: 'Supabase Configured (Unverified)',
          badgeClass: 'bg-amber-50 border-amber-200 text-amber-900',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
          title: 'Connection Error',
          badgeClass: 'bg-rose-50 border-rose-200 text-rose-900',
        };
      case 'demo':
      default:
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          title: 'Demo Mode (Local Demonstration Cohort Active)',
          badgeClass: 'bg-amber-50 border-amber-200 text-amber-900',
        };
    }
  };

  const badgeInfo = getStatusBadge(currentHealth.state);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-teal-50 border border-teal-200 text-teal-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Database & Connection Manager</h2>
              <p className="text-xs text-slate-500">
                Truthful status indicator & schema inspection for the 13 canonical NexCure tables
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDbModal(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 pt-3 pb-1 border-b border-slate-100 flex gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('connection')}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === 'connection'
                ? 'border-[#881337] text-[#881337]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Connection Status & Keys
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === 'schema'
                ? 'border-[#881337] text-[#881337]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Canonical Database Schema (13 Tables)
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'connection' ? (
            <>
              {/* Truthful Status Box */}
              <div className={`p-4 rounded-lg border text-xs ${badgeInfo.badgeClass}`}>
                <div className="flex items-start gap-2.5">
                  <div className="shrink-0 mt-0.5">{badgeInfo.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold flex items-center justify-between">
                      <span>{badgeInfo.title}</span>
                      <span className="text-[11px] font-mono opacity-75 uppercase">
                        State: {currentHealth.state}
                      </span>
                    </div>
                    <p className="mt-1 leading-relaxed text-slate-700">
                      {currentHealth.message}
                    </p>
                    {currentHealth.diagnosticDetails && (
                      <div className="mt-2 p-2 bg-white/70 rounded border border-slate-200/60 font-mono text-[11px] text-slate-800 break-all">
                        <strong>Diagnostic:</strong> {currentHealth.diagnosticDetails}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* P0.2: Five Truthful Architectural Layers */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <span>5-Layer Truthful Connection Verification (Audit Pass 2)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {/* Layer 1: Demo Data Mode */}
                  <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                    <span>1. Demo Data Mode</span>
                    <span className={`font-semibold ${currentHealth.isDemoMode ? 'text-amber-700' : 'text-slate-500'}`}>
                      {currentHealth.isDemoMode ? 'Active (In-Memory)' : 'Inactive (Live)'}
                    </span>
                  </div>

                  {/* Layer 2: Supabase Reachable */}
                  <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                    <span>2. Supabase Reachable</span>
                    <span className={`font-semibold flex items-center gap-1 ${currentHealth.isReachable ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {currentHealth.isReachable ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-slate-400" />}
                      {currentHealth.isReachable ? 'Network Online' : 'Unreachable'}
                    </span>
                  </div>

                  {/* Layer 3: Authenticated User Session */}
                  <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                    <span>3. Authenticated Session</span>
                    <span className={`font-semibold flex items-center gap-1 ${currentHealth.hasActiveSession ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {currentHealth.hasActiveSession ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-amber-600" />}
                      {currentHealth.hasActiveSession ? 'Session Active' : 'None (Anonymous)'}
                    </span>
                  </div>

                  {/* Layer 4: Authorized Table Access */}
                  <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                    <span>4. Authorized Table Access</span>
                    <span className={`font-semibold flex items-center gap-1 ${currentHealth.hasAuthorizedAccess ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {currentHealth.hasAuthorizedAccess ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-slate-400" />}
                      {currentHealth.hasAuthorizedAccess ? 'RLS Permitted' : 'RLS Restricted'}
                    </span>
                  </div>

                  {/* Layer 5: Verified Persistence */}
                  <div className="sm:col-span-2 p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                    <span>5. Verified Live Persistence</span>
                    <span className={`font-semibold flex items-center gap-1 ${currentHealth.persistenceVerified ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {currentHealth.persistenceVerified ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Info className="w-3 h-3 text-slate-400" />}
                      {currentHealth.persistenceVerified ? 'Verified Active (Live Writes Confirmed)' : 'Unverified (Requires Authorized Live Write)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Configuration Source Note */}
              <div className="text-[11px] text-slate-500 flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span>
                  Config Source: <strong>{isCustom ? 'Manual Browser Storage (localStorage)' : currentHealth.hasKey ? 'Environment Variables (VITE_*)' : 'None'}</strong>
                </span>
                {isCustom && (
                  <button
                    type="button"
                    onClick={handleResetToEnv}
                    className="text-xs text-[#881337] hover:underline font-semibold"
                  >
                    Clear Browser Override
                  </button>
                )}
              </div>

              {/* Form */}
              <form onSubmit={handleTestAndSave} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#881337] font-mono text-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    NexCure Project URL from Supabase Settings.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supabase Public / Anon Key (Never enter service-role key)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      value={keyInput}
                      onChange={(e) => handleKeyChange(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#881337] font-mono text-xs"
                    />
                  </div>
                  {keyValidationError ? (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {keyValidationError}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Client-safe public publishable/anon key only. Service-role keys are rejected.
                    </p>
                  )}
                </div>

                {/* Table Probe Checklist if tested */}
                {Object.keys(currentHealth.tableAccess).length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                    <div className="font-semibold text-slate-800">
                      Live Schema Accessibility Probe Results:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[11px]">
                      {Object.entries(currentHealth.tableAccess).map(([tbl, res]) => (
                        <div
                          key={tbl}
                          className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-100"
                        >
                          <span className="text-slate-700 truncate">{tbl}</span>
                          {res.accessible ? (
                            <span className="text-emerald-700 flex items-center gap-1 font-bold text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> OK
                            </span>
                          ) : (
                            <span className="text-rose-600 flex items-center gap-1 font-bold text-[10px]">
                              <XCircle className="w-3 h-3" /> {res.error ? 'Blocked' : 'Missing'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleActivateDemoMode}
                    className="text-xs text-slate-600 hover:text-slate-900 underline"
                  >
                    Switch to Explicit Demo Mode
                  </button>
                  <button
                    type="submit"
                    disabled={testing}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#881337] hover:bg-[#670d28] rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {testing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Database className="w-3.5 h-3.5" />
                    )}
                    <span>{testing ? 'Testing Probe...' : 'Test & Save Configuration'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-700 leading-relaxed border border-slate-200">
                <strong>Canonical Schema:</strong> The connected Supabase project contains these 13 application tables. The typed data-access layer maps directly to this source of truth:
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {CANONICAL_SCHEMA_DOCS.map((doc) => (
                  <div key={doc.table} className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#881337]">{doc.table}</span>
                      <span className="text-[11px] text-slate-400">Canonical Table</span>
                    </div>
                    <p className="text-slate-600">{doc.description}</p>
                    <div className="pt-1.5 border-t border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Columns: </span>
                      <span className="font-mono text-[11px] text-slate-700">{doc.columns.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Truthful distinction between live database and demonstration records.</span>
          <button
            onClick={() => setShowDbModal(false)}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
