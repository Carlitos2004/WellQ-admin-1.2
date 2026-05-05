import React, { useState } from 'react';
import { Filter, Download, Mail } from 'lucide-react';
import { SegmentedControl, Skeleton } from '../components/ui';
import { ClinicRow } from '../components/clinics/ClinicRow';
import { ClinicDrawer } from '../components/clinics/ClinicDrawer';
import { API_BASE } from '../api/client';

const HARDCODED_CLINICS = [
  {
    id: '000',
    name: 'Esperando base de datos',
    tier: 'Esperando...',
    status: 'Esperando...',
    patientsUsed: 0,
    patientsLimit: 0,
    healthScore: 0,
    lastLogin: 'Esperando...',
  },
];

export const ClinicsView = ({ apiClinics, clinicsLoading, onImpersonate }) => {
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);

  const clinics = apiClinics.length > 0 ? apiClinics : HARDCODED_CLINICS;

  const filtered = clinics.filter((c) => {
    if (filter === 'All') return true;
    if (filter === 'Active') return c.status === 'Active' || c.status === 'active';
    if (filter === 'At Risk') return (c.healthScore ?? 0) < 70 && (c.healthScore ?? 0) > 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <SegmentedControl
          options={['All', 'Active', 'At Risk', 'Churned']}
          selected={filter}
          onChange={setFilter}
        />
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-50 transition-colors">
            <Filter size={16} /> Filters
          </button>
          <button
            onClick={() =>
              fetch(`${API_BASE}/api/clinics/export?format=csv`)
                .then((r) => r.json())
                .then((d) => window.open(d.download_url))
                .catch(() => {})
            }
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <Download size={16} /> Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Mail size={16} /> Bulk Email
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
            <tr>
              <th className="py-4 px-4 text-left w-12">
                <input type="checkbox" className="rounded border-slate-300 text-indigo-600" />
              </th>
              {['Clinic', 'Plan', 'Status', 'License Usage', 'Health', 'Last Login', 'Actions'].map(
                (h) => (
                  <th
                    key={h}
                    className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {clinicsLoading
              ? [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td colSpan={8} className="py-3 px-4">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              : filtered.map((clinic) => (
                  <ClinicRow
                    key={clinic.clinic_id ?? clinic.id}
                    clinic={clinic}
                    onSelect={setSelected}
                    selected={
                      selected?.clinic_id === clinic.clinic_id ||
                      selected?.id === clinic.id
                    }
                    onImpersonate={onImpersonate}
                  />
                ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <span className="text-sm text-slate-500">
            Showing {filtered.length > 0 ? '1' : '0'}-{filtered.length} of {filtered.length} clinics
          </span>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-500 hover:bg-white transition-colors disabled:opacity-50"
              disabled
            >
              Previous
            </button>
            <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium">
              1
            </button>
            <button
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 hover:bg-white transition-colors disabled:opacity-50"
              disabled
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSelected(null)}
          />
          <ClinicDrawer clinic={selected} onClose={() => setSelected(null)} />
        </>
      )}
    </div>
  );
};
