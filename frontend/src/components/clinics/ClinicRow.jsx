import React from 'react';
import { Settings, DollarSign, Eye } from 'lucide-react';
import { StatusBadge, UtilizationBar, HealthBadge } from '../ui';

export const ClinicRow = ({ clinic, onSelect, selected, onImpersonate }) => (
  <tr
    className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors cursor-pointer ${
      selected ? 'bg-indigo-50/50' : ''
    }`}
    onClick={() => onSelect(clinic)}
  >
    <td className="py-4 px-4">
      <input
        type="checkbox"
        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        onClick={(e) => e.stopPropagation()}
      />
    </td>
    <td className="py-4 px-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
          {(clinic.name ?? 'E').charAt(0)}
        </div>
        <div>
          <div className="font-semibold text-slate-900">
            {clinic.name ?? 'Esperando base de datos'}
          </div>
          <div className="text-xs text-slate-400">
            {clinic.clinic_id ?? clinic.id ?? 'Esperando...'}
          </div>
        </div>
      </div>
    </td>
    <td className="py-4 px-4">
      <span
        className={`px-2.5 py-1 rounded-md text-xs font-medium ${
          clinic.tier === 'Enterprise' || clinic.tier === 'enterprise'
            ? 'bg-purple-100 text-purple-700'
            : clinic.tier === 'SMB' || clinic.tier === 'pro'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-slate-100 text-slate-600'
        }`}
      >
        {clinic.tier ?? 'Esperando...'}
      </span>
    </td>
    <td className="py-4 px-4">
      <StatusBadge status={clinic.status ?? 'Esperando...'} />
    </td>
    <td className="py-4 px-4 min-w-[180px]">
      <UtilizationBar
        used={clinic.patientsUsed ?? clinic.patient_count ?? 0}
        total={clinic.patientsLimit ?? 0}
      />
    </td>
    <td className="py-4 px-4">
      <HealthBadge score={clinic.healthScore ?? 0} />
    </td>
    <td className="py-4 px-4 text-sm text-slate-900">
      {clinic.lastLogin ?? 'Esperando conexión...'}
    </td>
    <td className="py-4 px-4">
      <div className="flex items-center gap-1">
        <button
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="Manage"
        >
          <Settings size={16} className="text-slate-400" />
        </button>
        <button
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title="View Invoices"
        >
          <DollarSign size={16} className="text-slate-400" />
        </button>
        <button
          className="p-2 hover:bg-indigo-50 rounded-lg transition-colors group/imp"
          title="Impersonate"
          onClick={(e) => {
            e.stopPropagation();
            onImpersonate && onImpersonate(clinic);
          }}
        >
          <Eye
            size={16}
            className="text-slate-400 group-hover/imp:text-indigo-500 transition-colors"
          />
        </button>
      </div>
    </td>
  </tr>
);
