import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CheckCircle2,
  Plus,
} from 'lucide-react';

export const SuperadminView: React.FC = () => {
  const { hospitals, updateHospitalStatus, addHospital } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New Hospital form state
  const [hospName, setHospName] = useState('');
  const [regNum, setRegNum] = useState('');
  const [licenseNum, setLicenseNum] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('CA');
  const [bedCapacity, setBedCapacity] = useState(350);
  const [accreditedBody, setAccreditedBody] = useState('The Joint Commission (TJC)');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const filteredHospitals = hospitals.filter((h) => {
    if (filterStatus !== 'all' && h.status !== filterStatus) return false;
    return true;
  });

  const handleRegisterHospital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospName.trim() || !regNum.trim()) return;

    addHospital({
      name: hospName.trim(),
      registrationNumber: regNum.trim(),
      status: 'pending',
      licenseNumber: licenseNum.trim() || 'LIC-TEMP-001',
      address: '100 Medical Center Way',
      city: city.trim() || 'San Diego',
      state: state.trim() || 'CA',
      bedCapacity: Number(bedCapacity) || 200,
      activePatientsCount: 0,
      branchesCount: 1,
      accreditedBody: accreditedBody.trim(),
      primaryContactName: contactName.trim() || 'Medical Director',
      primaryContactEmail: contactEmail.trim() || 'admin@hospital.org',
    });

    setHospName('');
    setRegNum('');
    setLicenseNum('');
    setContactName('');
    setContactEmail('');
    setShowAddModal(false);
  };

  const totalBeds = hospitals.reduce((acc, h) => acc + h.bedCapacity, 0);
  const pendingApprovalsCount = hospitals.filter(
    (h) => h.status === 'pending' || h.status === 'under_review'
  ).length;
  const approvedCount = hospitals.filter((h) => h.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Platform Superadmin Governance
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
            <span className="font-semibold text-purple-700">Dr. Aris Thorne</span>
            <span aria-hidden="true">·</span>
            <span>Chief Medical Officer</span>
            <span aria-hidden="true">·</span>
            <span>Hospital Affiliation & Registration Registry</span>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#881337] hover:bg-[#670d28] rounded-lg transition-colors shadow-2xs shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register New Hospital</span>
        </button>
      </div>

      {/* Honest Network Operational Metrics (Strictly computed from active dataset) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Affiliated Systems</div>
          <div className="text-3xl font-bold font-mono text-slate-900 mt-1">{hospitals.length}</div>
          <div className="text-xs text-slate-500 mt-1">Total registered health networks</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Pending Review</div>
          <div className="text-3xl font-bold font-mono text-amber-600 mt-1">{pendingApprovalsCount}</div>
          <div className="text-xs text-slate-500 mt-1">Awaiting compliance credentialing</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Network Licensed Beds</div>
          <div className="text-3xl font-bold font-mono text-teal-700 mt-1">{totalBeds.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Total clinical inpatient capacity</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold uppercase text-slate-500">Approved Networks</div>
          <div className="text-3xl font-bold font-mono text-[#881337] mt-1">
            {approvedCount} of {hospitals.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Active credentialed hospital systems</div>
        </div>
      </div>

      {/* Hospital Registrations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-4">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Hospital System Registrations</h2>
            <p className="text-xs text-slate-500">Review credentialing, state licenses, and affiliation standing</p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({hospitals.length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filterStatus === 'pending'
                  ? 'bg-white text-amber-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({pendingApprovalsCount})
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filterStatus === 'approved'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved ({approvedCount})
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredHospitals.map((hosp) => {
            const isApproved = hosp.status === 'approved';
            const isPending = hosp.status === 'pending';
            const isReview = hosp.status === 'under_review';

            return (
              <div
                key={hosp.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-900 text-sm">{hosp.name}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="font-mono text-slate-500">{hosp.registrationNumber}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span
                      className={`font-semibold uppercase text-[10px] ${
                        isApproved
                          ? 'text-emerald-700'
                          : isReview
                          ? 'text-amber-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {hosp.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap">
                    <span>Location: {hosp.city}, {hosp.state}</span>
                    <span aria-hidden="true">·</span>
                    <span>License: <strong className="font-mono text-slate-800">{hosp.licenseNumber}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Accreditation: {hosp.accreditedBody}</span>
                  </div>

                  <div className="text-xs text-slate-500">
                    Bed Capacity: {hosp.bedCapacity} · Active Census: {hosp.activePatientsCount} patients · Contact: {hosp.primaryContactName} ({hosp.primaryContactEmail})
                  </div>
                </div>

                {/* Approval Control Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {isPending && (
                    <>
                      <button
                        onClick={() => updateHospitalStatus(hosp.id, 'approved')}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve License</span>
                      </button>
                      <button
                        onClick={() => updateHospitalStatus(hosp.id, 'under_review')}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Request Review
                      </button>
                    </>
                  )}

                  {isReview && (
                    <>
                      <button
                        onClick={() => updateHospitalStatus(hosp.id, 'approved')}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete Approval</span>
                      </button>
                      <button
                        onClick={() => updateHospitalStatus(hosp.id, 'suspended')}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {isApproved && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Active Network</span>
                      </span>
                      <button
                        onClick={() => updateHospitalStatus(hosp.id, 'suspended')}
                        className="px-2.5 py-1 text-xs text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        Suspend
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Register New Hospital Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Register Hospital System</h3>
            <p className="text-xs text-slate-500">
              Submit credentialing registration for affiliated hospital networks
            </p>

            <form onSubmit={handleRegisterHospital} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hospital System Name</label>
                <input
                  type="text"
                  required
                  value={hospName}
                  onChange={(e) => setHospName(e.target.value)}
                  placeholder="e.g. Stanford Valley Health System"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registration Identifier</label>
                  <input
                    type="text"
                    required
                    value={regNum}
                    onChange={(e) => setRegNum(e.target.value)}
                    placeholder="HOSP-2026-CA-7788"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State Department License</label>
                  <input
                    type="text"
                    value={licenseNum}
                    onChange={(e) => setLicenseNum(e.target.value)}
                    placeholder="CA-DPH-99201-B"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Palo Alto"
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    maxLength={2}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Licensed Bed Capacity</label>
                  <input
                    type="number"
                    value={bedCapacity}
                    onChange={(e) => setBedCapacity(parseInt(e.target.value, 10))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Accrediting Agency</label>
                  <select
                    value={accreditedBody}
                    onChange={(e) => setAccreditedBody(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                  >
                    <option value="The Joint Commission (TJC)">The Joint Commission (TJC)</option>
                    <option value="DNV Healthcare">DNV Healthcare</option>
                    <option value="AAAHC Accreditation">AAAHC Accreditation</option>
                    <option value="State DOH Licensed Only">State DOH Licensed Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Primary Contact</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Dr. Allison Parker, CMO"
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="aparker@stanfordvalley.org"
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-[#881337] hover:bg-[#670d28] rounded-lg cursor-pointer"
                >
                  Submit Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
