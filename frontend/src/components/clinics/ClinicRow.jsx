import React from 'react';
import { Settings, DollarSign, Eye, Trash2 } from 'lucide-react';
import { StatusBadge, UtilizationBar, HealthBadge } from '../ui';

export const ClinicRow = ({ clinic, onSelect, selected, onImpersonate, onSettings, onInvoices, onDelete, checked, onCheck }) => (
  <tr
    className={`border-b border-wellq-gray/10 dark:border-wellq-gray/30 hover:bg-wellq-gray/5 dark:hover:bg-wellq-dark/50 transition-colors cursor-pointer ${
      selected ? 'bg-wellq-cyan/5 dark:bg-wellq-cyan/10' : ''
    }`}
    onClick={() => onSelect(clinic)}
  >
    <td className="py-4 px-4">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => { e.stopPropagation(); onCheck && onCheck(clinic, e.target.checked); }}
        className="rounded border-wellq-gray/30 dark:border-wellq-gray/40 text-wellq-cyan focus:ring-wellq-cyan"
        onClick={(e) => e.stopPropagation()}
      />
    </td>
    <td className="py-4 px-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-wellq-cyan to-wellq-blue flex items-center justify-center text-white text-sm font-bold">
          {(clinic.name ?? '?').charAt(0)}
        </div>
        <div>
          <div className="font-semibold text-wellq-dark dark:text-white">
            {clinic.name ?? ''}
          </div>
          <div className="text-xs text-wellq-gray">
            {clinic.clinic_id ?? clinic.id ?? ''}
          </div>
        </div>
      </div>
    </td>
    <td className="py-4 px-4">
      {clinic.tier ? (
        <span
          className={`px-2.5 py-1 rounded-md text-xs font-medium ${
            clinic.tier === 'Enterprise' || clinic.tier === 'enterprise'
              ? 'bg-wellq-cyan/10 text-wellq-cyan'
              : clinic.tier === 'SMB' || clinic.tier === 'pro'
              ? 'bg-wellq-blue/10 text-wellq-blue'
              : 'bg-wellq-gray/10 text-wellq-dark dark:text-white'
          }`}
        >
          {clinic.tier}
        </span>
      ) : null}
    </td>
    <td className="py-4 px-4">
      {clinic.status ? <StatusBadge status={clinic.status} /> : null}
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
    <td className="py-4 px-4 text-sm text-wellq-dark dark:text-white">
      {clinic.lastLogin ?? ''}
    </td>
    <td className="py-4 px-4">
      <div className="flex items-center gap-1">
        <button
          className="p-2 hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/40 rounded-lg transition-colors"
          title="Manage"
          onClick={(e) => { e.stopPropagation(); onSettings && onSettings(clinic); }}
        >
          <Settings size={16} className="text-wellq-gray dark:text-wellq-gray/80" />
        </button>
        <button
          className="p-2 hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/40 rounded-lg transition-colors"
          title="View Invoices"
          onClick={(e) => { e.stopPropagation(); onInvoices && onInvoices(clinic); }}
        >
          <DollarSign size={16} className="text-wellq-gray dark:text-wellq-gray/80" />
        </button>
        {/* ── Ojo → abre overview en drawer ── */}
        <button
          className="p-2 hover:bg-wellq-cyan/10 dark:hover:bg-wellq-cyan/20 rounded-lg transition-colors group/imp"
          title="Ver overview"
          onClick={(e) => {
            e.stopPropagation();
            onSelect && onSelect(clinic);
          }}
        >
          <Eye
            size={16}
            className="text-wellq-gray dark:text-wellq-gray/80 group-hover/imp:text-wellq-cyan transition-colors"
          />
        </button>
        <button
          className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors group/del"
          title="Eliminar clínica"
          onClick={(e) => { e.stopPropagation(); onDelete && onDelete(clinic); }}
        >
          <Trash2
            size={16}
            className="text-wellq-gray dark:text-wellq-gray/80 group-hover/del:text-red-500 transition-colors"
          />
        </button>
      </div>
    </td>
  </tr>
);