import React from 'react';
import { motion } from 'framer-motion';
import { Settings, DollarSign, Eye, Trash2 } from 'lucide-react';
import { StatusBadge, UtilizationBar, HealthBadge } from '../ui';

export const ClinicRow = ({
  clinic, onSelect, selected, onImpersonate,
  onSettings, onInvoices, onDelete
}) => (
  <motion.tr
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className={`
      font-sans border-b border-wellq-gray/10 dark:border-white/5
      transition-all duration-200 cursor-pointer group
      ${selected
        ? 'bg-wellq-cyan/5 dark:bg-wellq-cyan/10 border-l-4 border-l-wellq-cyan'
        : 'bg-transparent hover:bg-wellq-gray/5 dark:hover:bg-white/[0.02]'
      }
    `}
    onClick={() => onSelect(clinic)}
  >
    {/* ELIMINADO: La columna del Checkbox ha sido borrada para alinear perfectamente con el Header de ClinicsView */}

    {/* Clinic Name & Avatar */}
    <td className="py-4 px-4">
      <div className="flex items-center gap-3.5">
        {/* Avatar alineado con el ícono del header de Analytics */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-wellq-cyan to-wellq-blue flex items-center justify-center text-wellq-dark text-sm font-black shadow-md shadow-wellq-cyan/20 ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-300">
          {(clinic.name ?? '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-bold text-wellq-dark dark:text-white text-sm tracking-tight group-hover:text-wellq-cyan dark:group-hover:text-wellq-cyan transition-colors">
            {clinic.name ?? ''}
          </div>
          <div className="text-[11px] font-semibold text-wellq-gray font-mono mt-0.5">
            {clinic.clinic_id ?? clinic.id ?? ''}
          </div>
        </div>
      </div>
    </td>

    {/* Tier Badge (Inspirado en los tags de adopción de features) */}
    <td className="py-4 px-4">
      {clinic.tier ? (
        <span
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
            clinic.tier.toLowerCase() === 'enterprise'
              ? 'bg-wellq-cyan/10 text-wellq-cyan border border-wellq-cyan/20'
              : clinic.tier.toLowerCase() === 'smb' || clinic.tier.toLowerCase() === 'pro'
              ? 'bg-wellq-blue/10 text-wellq-blue border border-wellq-blue/20'
              : 'bg-wellq-gray/10 text-wellq-dark dark:text-white border border-wellq-gray/20'
          }`}
        >
          {clinic.tier}
        </span>
      ) : null}
    </td>

    {/* Status */}
    <td className="py-4 px-4">
      {clinic.status ? <StatusBadge status={clinic.status} /> : null}
    </td>

    {/* Utilization */}
    <td className="py-4 px-4 min-w-[180px]">
      <UtilizationBar
        used={clinic.patientsUsed ?? clinic.patient_count ?? 0}
        total={clinic.patientsLimit ?? 0}
      />
    </td>

    {/* Health */}
    <td className="py-4 px-4">
      <HealthBadge score={clinic.healthScore ?? 0} />
    </td>

    {/* Last Login (Estilo tabular-nums para consistencia de datos) */}
    <td className="py-4 px-4 text-xs text-wellq-gray font-semibold tabular-nums">
      {clinic.lastLogin ?? '-'}
    </td>

    {/* Actions (Ahora siempre visibles y limpias) */}
    <td className="py-4 px-4">
      <div className="flex items-center gap-1 transition-opacity duration-200">
        <ActionBtn
          icon={Settings}
          title="Configuración"
          hoverClass="hover:bg-wellq-gray/10 dark:hover:bg-white/5 hover:text-wellq-dark dark:hover:text-white"
          onClick={(e) => { e.stopPropagation(); onSettings && onSettings(clinic); }}
        />
        <ActionBtn
          icon={DollarSign}
          title="Facturación"
          hoverClass="hover:bg-wellq-green/10 hover:text-wellq-green"
          onClick={(e) => { e.stopPropagation(); onInvoices && onInvoices(clinic); }}
        />
        <ActionBtn
          icon={Eye}
          title="Ver Overview"
          hoverClass="hover:bg-wellq-cyan/10 hover:text-wellq-cyan"
          onClick={(e) => { e.stopPropagation(); onSelect && onSelect(clinic); }}
        />
        <ActionBtn
          icon={Trash2}
          title="Eliminar Clínica"
          hoverClass="hover:bg-red-500/10 hover:text-red-400"
          onClick={(e) => { e.stopPropagation(); onDelete && onDelete(clinic); }}
        />
      </div>
    </td>
  </motion.tr>
);

// ─── Subcomponente botón de acción refinado ───────────────────────────────────
const ActionBtn = ({ icon: Icon, title, hoverClass, onClick }) => (
  <button
    onClick={onClick}
    title={title}
    // CORRECCIÓN: Color ajustado para que sea legible siempre sin tener que pasar el mouse
    className={`p-2 rounded-xl transition-all duration-200 text-wellq-gray dark:text-wellq-gray/80 ${hoverClass} cursor-pointer hover:scale-105`}
  >
    <Icon size={16} strokeWidth={2.5} />
  </button>
);