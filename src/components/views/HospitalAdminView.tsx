import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { HospitalBranch } from '../../types';
import {
  Building2,
  Users,
  Plus,
  MapPin,
  Phone,
  UserPlus,
} from 'lucide-react';

export const HospitalAdminView: React.FC = () => {
  const {
    currentUser,
    hospitals,
    branches,
    addBranch,
    staff,
    addStaff,
    patients,
    activeTab,
    setActiveTab,
  } = useApp();

  const currentHospital =
    hospitals.find((h) => h.id === currentUser.hospitalId) ||
    hospitals[0] || {
      id: 'hosp-01',
      name: 'Metro General Health System',
      registrationNumber: 'HOSP-2026-NY-1044',
      status: 'approved',
      licenseNumber: 'NY-DOH-84920-A',
      address: '450 Lexington Avenue',
      city: 'New York',
      state: 'NY',
      bedCapacity: 450,
      activePatientsCount: patients.length,
      branchesCount: branches.length,
      accreditedBody: 'The Joint Commission (TJC)',
      primaryContactName: 'Elena Rostova, MHA',
      primaryContactEmail: 'erostova@metrogeneral.org',
      appliedAt: '2026-01-15',
    };

  const currentTab: 'workspace' | 'branches' | 'staff' | 'cohorts' =
    activeTab === 'branches' || activeTab === 'staff' || activeTab === 'cohorts'
      ? activeTab
      : 'workspace';

  // Add Branch Modal
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchType, setBranchType] = useState<HospitalBranch['facilityType']>('Ambulatory Care');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchLead, setBranchLead] = useState('');

  // Add Staff Modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('Care Coordinator');
  const [staffDept, setStaffDept] = useState('Transitional Care');
  const [staffEmail, setStaffEmail] = useState('');

  // Real cohort categorization from active patient cohort
  const chfCohort = patients.filter(
    (p) =>
      p.primaryDiagnosis.toLowerCase().includes('heart') ||
      p.primaryDiagnosis.toLowerCase().includes('chf')
  );
  const pciCohort = patients.filter(
    (p) =>
      p.primaryDiagnosis.toLowerCase().includes('stent') ||
      p.primaryDiagnosis.toLowerCase().includes('infarction') ||
      p.primaryDiagnosis.toLowerCase().includes('pci') ||
      p.primaryDiagnosis.toLowerCase().includes('artery')
  );
  const otherCohort = patients.filter(
    (p) => !chfCohort.includes(p) && !pciCohort.includes(p)
  );

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;

    addBranch({
      hospitalId: currentHospital.id,
      name: branchName.trim(),
      facilityType: branchType,
      address: branchAddress.trim() || 'New York, NY',
      phone: branchPhone.trim() || '+1 (555) 321-4800',
      leadCoordinator: branchLead.trim() || 'Assigned Lead, RN',
      activeCensus: 0,
    });

    setBranchName('');
    setBranchAddress('');
    setBranchPhone('');
    setBranchLead('');
    setShowAddBranchModal(false);
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) return;

    addStaff({
      id: `staff-${Date.now()}`,
      name: staffName.trim(),
      role: staffRole,
      department: staffDept,
      branch: 'Main Medical Campus',
      email: staffEmail.trim() || `${staffName.toLowerCase().replace(/\s+/g, '.')}@metrohealth.org`,
      activePatients: 0,
      status: 'Active',
    });

    setStaffName('');
    setStaffEmail('');
    setShowAddStaffModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {currentHospital.name} Workspace
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
            <span className="font-semibold text-slate-700">Administrator: Elena Rostova, MHA</span>
            <span aria-hidden="true">·</span>
            <span>Reg: {currentHospital.registrationNumber}</span>
            <span aria-hidden="true">·</span>
            <span className="text-teal-700 font-medium">Status: {currentHospital.status.toUpperCase()}</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              currentTab === 'workspace'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hospital Census
          </button>
          <button
            onClick={() => setActiveTab('branches')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              currentTab === 'branches'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Facility Branches ({branches.length})
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              currentTab === 'staff'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Clinical Staff ({staff.length})
          </button>
          <button
            onClick={() => setActiveTab('cohorts')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              currentTab === 'cohorts'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Discharge Cohorts
          </button>
        </div>
      </div>

      {/* Honest Operational Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Licensed Bed Capacity</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {currentHospital.bedCapacity} Beds
          </div>
          <div className="text-xs text-slate-500 mt-1">Hospital license capacity</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Active Continuity Census</div>
          <div className="text-2xl font-bold font-mono text-[#881337] mt-1">
            {patients.length} Patients
          </div>
          <div className="text-xs text-slate-500 mt-1">Currently in transitional care</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Care Continuity Staff</div>
          <div className="text-2xl font-bold font-mono text-teal-700 mt-1">
            {staff.length} Clinicians
          </div>
          <div className="text-xs text-slate-500 mt-1">Physicians & Coordinators</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Active Facilities</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {branches.length} Branches
          </div>
          <div className="text-xs text-slate-500 mt-1">Regional care locations</div>
        </div>
      </div>

      {/* Tab 1: Hospital Workspace & Census */}
      {currentTab === 'workspace' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
              <h2 className="text-base font-bold text-slate-900">Hospital Facility Profile</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-slate-400 font-medium">State License</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">{currentHospital.licenseNumber}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Headquarters</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{currentHospital.address}, {currentHospital.city}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Primary Administrator</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{currentHospital.primaryContactName}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Contact Email</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{currentHospital.primaryContactEmail}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Accrediting Organization</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{currentHospital.accreditedBody}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Registration Standing</div>
                  <div className="font-semibold text-emerald-700 mt-0.5">{currentHospital.status.toUpperCase()}</div>
                </div>
              </div>
            </div>

            {/* Real Census Distribution by Facility Type */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900">Regional Facility Distribution</h3>
              <p className="text-xs text-slate-600">
                Active clinical census across operating branches:
              </p>

              <div className="divide-y divide-slate-100 pt-1">
                {branches.map((b) => (
                  <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-900">{b.name}</span>
                      <span className="text-slate-400 ml-2">({b.facilityType})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono text-slate-900">{b.activeCensus} Patients</span>
                      <span className="text-slate-400 ml-1.5 text-[11px]">in census</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Branch Quick Roster */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Facility Branches</h3>
                <button
                  onClick={() => setShowAddBranchModal(true)}
                  className="text-xs text-[#881337] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Branch</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {branches.map((b) => (
                  <div key={b.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{b.name}</span>
                      <span className="font-semibold text-slate-600">{b.activeCensus} Patients</span>
                    </div>
                    <div className="text-slate-500">{b.facilityType}</div>
                    <div className="text-[11px] text-slate-400">Lead: {b.leadCoordinator}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Branches Management */}
      {currentTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Facility Branches & Outpatient Centers</h2>
              <p className="text-xs text-slate-500">Transitional care hubs across the regional network</p>
            </div>
            <button
              onClick={() => setShowAddBranchModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#881337] hover:bg-[#670d28] rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Facility Branch</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {branches.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{b.name}</h3>
                    <div className="text-xs font-semibold text-teal-700 mt-0.5">{b.facilityType}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{b.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{b.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lead: {b.leadCoordinator}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Active Census:</span>
                  <span className="font-bold font-mono text-slate-900">{b.activeCensus} Patients</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Clinical Staff Directory */}
      {currentTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Clinical Staff & Coordinators Directory</h2>
              <p className="text-xs text-slate-500">Physicians, coordinators, and transitional care leads</p>
            </div>
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#881337] hover:bg-[#670d28] rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Staff Member</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="divide-y divide-slate-100">
              {staff.map((s) => (
                <div key={s.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                    <div className="text-slate-600 mt-0.5">
                      {s.role} · <span className="font-medium text-slate-800">{s.department}</span> ({s.branch})
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">{s.email}</div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <div className="font-bold font-mono text-slate-900">{s.activePatients} Patients</div>
                      <div className="text-[11px] text-slate-400">Assigned Caseload</div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Discharge Cohorts (Calculated strictly from loaded patients) */}
      {currentTab === 'cohorts' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-slate-900">Discharge Continuity Cohorts</h2>
              <p className="text-xs text-slate-500">
                Patients grouped by clinical pathway to streamline follow-up protocols
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 space-y-2">
                <div className="font-bold text-[#881337] text-sm">Heart Failure (CHF) Pathway</div>
                <p className="text-slate-600">Daily dry weight logging, diuretic titration, 7-day clinic review.</p>
                <div className="pt-2 border-t border-rose-200/60 font-semibold text-slate-800">
                  {chfCohort.length} Patients Enrolled · Lead: Dr. J. Wilson
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-2">
                <div className="font-bold text-amber-800 text-sm">Coronary Stent (PCI) Pathway</div>
                <p className="text-slate-600">Dual antiplatelet confirmation, puncture site check, lipid management.</p>
                <div className="pt-2 border-t border-amber-200/60 font-semibold text-slate-800">
                  {pciCohort.length} Patients Enrolled · Lead: Dr. J. Wilson
                </div>
              </div>

              <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/30 space-y-2">
                <div className="font-bold text-teal-800 text-sm">Complex Recovery & Other Pathways</div>
                <p className="text-slate-600">Wound assessments, glycemic logs, and physical therapy touchpoints.</p>
                <div className="pt-2 border-t border-teal-200/60 font-semibold text-slate-800">
                  {otherCohort.length} Patients Enrolled · Lead: Transitional Care
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Branch */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Add New Facility Branch</h3>
            <form onSubmit={handleAddBranch} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. South Bay Ambulatory Center"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Facility Type</label>
                <select
                  value={branchType}
                  onChange={(e: any) => setBranchType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                >
                  <option value="Ambulatory Care">Ambulatory Care</option>
                  <option value="Post-Acute Rehab">Post-Acute Rehab</option>
                  <option value="Regional Outpatient">Regional Outpatient</option>
                  <option value="Main Campus">Main Campus</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="Street address, City, State"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lead Care Coordinator</label>
                <input
                  type="text"
                  value={branchLead}
                  onChange={(e) => setBranchLead(e.target.value)}
                  placeholder="e.g. Jessica Taylor, RN"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-[#881337] hover:bg-[#670d28] rounded-lg cursor-pointer"
                >
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Staff */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Add Clinical Staff Member</h3>
            <form onSubmit={handleAddStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name & Credentials</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. David Cho, RN, BSN"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                >
                  <option value="Care Coordinator">Care Coordinator</option>
                  <option value="Attending Physician">Attending Physician</option>
                  <option value="Specialist Physician">Specialist Physician</option>
                  <option value="Nurse Practitioner">Nurse Practitioner</option>
                  <option value="Physical Therapist">Physical Therapist</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={staffDept}
                  onChange={(e) => setStaffDept(e.target.value)}
                  placeholder="e.g. Transitional Care & Continuity"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-[#881337] hover:bg-[#670d28] rounded-lg cursor-pointer"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
