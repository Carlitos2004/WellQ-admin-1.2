import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ExcelJS from 'exceljs';
import {
  X, Mail, Settings as SettingsIcon, Receipt, Download,
  Loader2, CheckCircle, User, Phone, CreditCard,
  Activity, TrendingUp, Send, AlertCircle, FileDown,
} from 'lucide-react';
import { UtilizationBar } from '../ui';
import { apiFetch, API_BASE } from '../../api/client';
import { PatientHealthSection } from './PatientHealthSection';

// ─── Animaciones Coreografiadas (Estilo Analytics) ───────────────────────────
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const containerVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.05 } },
};

// ─── Subcomponente: Fila de Dato (InfoRow) ────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value, accent }) => (
  <div className="flex items-center justify-between py-3 border-b border-wellq-gray/10 dark:border-white/5 last:border-0 group">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-wellq-gray/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
        <Icon size={14} className="text-wellq-gray dark:text-wellq-gray/80" strokeWidth={2.2} />
      </div>
      <span className="text-xs font-semibold text-wellq-gray dark:text-wellq-gray/80 tracking-wide">{label}</span>
    </div>
    <span className={`text-xs font-bold tabular-nums ${accent ? 'text-wellq-cyan' : 'text-wellq-dark dark:text-white'} max-w-[180px] truncate text-right`}>
      {value}
    </span>
  </div>
);

// ─── Subcomponente: Tarjeta de Stat (StatCard) ────────────────────────────────
const StatCard = ({ value, label, colorClass, borderClass, bgClass }) => (
  <div className={`relative rounded-2xl p-4 border ${borderClass} ${bgClass} flex flex-col gap-1.5 overflow-hidden group transition-all duration-300 hover:shadow-md`}>
    <p className={`text-2xl font-black ${colorClass} leading-none tabular-nums tracking-tighter`}>
      {value}
    </p>
    <p className="text-[10px] font-bold text-wellq-gray dark:text-wellq-gray/90 uppercase tracking-widest">
      {label}
    </p>
    <div className={`absolute bottom-0 left-0 h-1 w-0 ${colorClass.replace('text-', 'bg-')} opacity-30 group-hover:w-full transition-all duration-500 ease-out`} />
  </div>
);

// ─── Subcomponente: Tab Button ────────────────────────────────────────────────
const TabBtn = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`
      relative pb-3 text-xs font-bold tracking-wide transition-colors flex items-center gap-1.5 cursor-pointer
      ${active
        ? 'text-wellq-cyan'
        : 'text-wellq-gray dark:text-wellq-gray/60 hover:text-wellq-dark dark:hover:text-white'}
    `}
  >
    {Icon && <Icon size={14} strokeWidth={active ? 2.5 : 2} />}
    {label}
    {active && (
      <motion.div
        layoutId="drawer-tab-indicator"
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-wellq-cyan rounded-full shadow-[0_0_8px_rgba(22,248,249,0.5)]"
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      />
    )}
  </button>
);

// ─── NUEVO: Modal de Contacto para clínica individual ─────────────────────────
const ContactClinicModal = ({ clinic, contact, onClose }) => {
  const [subject, setSubject] = useState(`WellQ - ${clinic?.name ?? ''}`);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState(null);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:             subject,
          message:           message,
          channel:           'email',
          recipientClinicId: clinic.clinic_id ?? clinic.id,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSent(true);
    } catch {
      setError('Error al enviar. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center">
      <motion.div
        className="absolute inset-0 bg-[#0b1017]/60 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 bg-white dark:bg-wellq-dark rounded-[24px] shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-wellq-gray/15 dark:border-white/10"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.96, y: 10  }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        {/* Brillo superior */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-wellq-cyan/8 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-5 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-wellq-cyan to-wellq-blue flex items-center justify-center shadow-md shadow-wellq-cyan/20">
              <Mail size={16} className="text-wellq-black" strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="font-bold text-wellq-dark dark:text-white text-sm leading-tight">Contactar Clínica</h2>
              <p className="text-xs font-medium text-wellq-gray mt-0.5 truncate max-w-[200px]">{clinic?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-wellq-gray/8 dark:hover:bg-white/8 rounded-xl transition-colors cursor-pointer">
            <X size={17} className="text-wellq-gray" strokeWidth={2.5} />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-16 h-16 rounded-full bg-wellq-green/10 border border-wellq-green/20 flex items-center justify-center"
            >
              <Send size={28} className="text-wellq-green" />
            </motion.div>
            <p className="font-bold text-wellq-dark dark:text-white">¡Email enviado!</p>
            <p className="text-sm text-wellq-gray">Mensaje en cola de envío.</p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 bg-wellq-gray/10 dark:bg-wellq-dark/50 rounded-lg text-sm font-medium text-wellq-dark dark:text-white hover:bg-wellq-gray/20 dark:hover:bg-wellq-dark/80 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            {/* Email destinatario visible */}
            {contact?.contact_info?.primary_email && (
              <div className="px-6 pt-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-wellq-cyan/5 border border-wellq-cyan/20 rounded-xl">
                  <Mail size={12} className="text-wellq-cyan flex-shrink-0" />
                  <span className="text-xs font-semibold text-wellq-cyan truncate">{contact.contact_info.primary_email}</span>
                </div>
              </div>
            )}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-wellq-gray uppercase tracking-wider mb-1.5">Asunto</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 border border-wellq-gray/30 rounded-xl text-sm text-wellq-dark dark:text-white placeholder-wellq-gray/40 focus:outline-none focus:ring-2 focus:ring-wellq-cyan focus:border-transparent transition-all dark:bg-wellq-dark/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-wellq-gray uppercase tracking-wider mb-1.5">Mensaje</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe tu mensaje aquí..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-wellq-gray/30 rounded-xl text-sm text-wellq-dark dark:text-white placeholder-wellq-gray/40 focus:outline-none focus:ring-2 focus:ring-wellq-cyan focus:border-transparent transition-all resize-none dark:bg-wellq-dark/50"
                />
              </div>
              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-wellq-gray/20 dark:border-wellq-gray/30 bg-wellq-gray/5 dark:bg-wellq-dark/50">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-wellq-gray/30 rounded-lg text-sm font-medium text-wellq-dark dark:text-white hover:bg-wellq-gray/10 dark:hover:bg-wellq-dark/40 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !message.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-wellq-cyan text-wellq-black rounded-lg text-sm font-medium hover:bg-wellq-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-wellq-cyan/20"
              >
                {sending
                  ? <><Loader2 size={15} className="animate-spin" /> Enviando...</>
                  : <><Send size={15} /> Enviar Email</>
                }
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

// ─── Invoices hardcoded de fallback ──────────────────────────────────────────
const FALLBACK_INVOICES = [
  { id: 'INV-2026-003', date: 'May 1, 2026',  amount: '$499.00', status: 'Paid' },
  { id: 'INV-2026-002', date: 'Apr 1, 2026',  amount: '$499.00', status: 'Paid' },
  { id: 'INV-2026-001', date: 'Mar 1, 2026',  amount: '$499.00', status: 'Paid' },
];

// ─── Componente Principal ─────────────────────────────────────────────────────
export const ClinicDrawer = ({ clinic, mode = 'overview', onClose }) => {
  const [activeTab,    setActiveTab]    = useState(mode);
  const [subscription, setSubscription] = useState(null);
  const [license,      setLicense]      = useState(null);
  const [usage,        setUsage]        = useState(null);
  const [contact,      setContact]      = useState(null);

  const [clinicName,   setClinicName]   = useState('');
  const [clinicPlan,   setClinicPlan]   = useState('');
  const [clinicStatus, setClinicStatus] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [saveOk,       setSaveOk]       = useState(false);
  const [saveError,    setSaveError]    = useState(null);

  // ── Estado para modal de contacto ─────────────────────────────────────────
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // ── Estado para invoices ──────────────────────────────────────────────────
  const [invoices,        setInvoices]        = useState(FALLBACK_INVOICES);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [downloadingId,   setDownloadingId]   = useState(null);
  const [downloadError,   setDownloadError]   = useState(null);

  useEffect(() => { setActiveTab(mode); }, [mode]);

  useEffect(() => {
    if (!clinic) return;
    setClinicName(clinic.name ?? '');
    setClinicPlan(clinic.tier ?? 'Enterprise');
    setClinicStatus(clinic.status ?? 'Active');
    setSaveOk(false);
    setSaveError(null);

    const id = clinic.clinic_id ?? clinic.id;
    apiFetch(`/api/clinics/${id}/subscription`).then((d) => setSubscription(d.subscription)).catch(() => {});
    apiFetch(`/api/clinics/${id}/license`).then((d) => setLicense(d.licenses)).catch(() => {});
    apiFetch(`/api/clinics/${id}/usage`).then((d) => setUsage(d.metrics)).catch(() => {});
    apiFetch(`/api/clinics/${id}/contact`).then((d) => setContact(d)).catch(() => {});
  }, [clinic]);

  // ── Fetch de invoices cuando se activa la pestaña ─────────────────────────
  useEffect(() => {
    if (activeTab !== 'invoices' || !clinic) return;
    const id = clinic.clinic_id ?? clinic.id;
    setInvoicesLoading(true);
    apiFetch(`/api/clinics/${id}/invoices`)
      .then((d) => {
        // Solo reemplaza si la API devuelve datos reales; si no, mantiene FALLBACK_INVOICES
        if (d?.invoices?.length > 0) setInvoices(d.invoices);
      })
      .catch(() => {}) // Mantiene FALLBACK_INVOICES en caso de error
      .finally(() => setInvoicesLoading(false));
  }, [activeTab, clinic]);

  if (!clinic) return null;

  const handleSave = async () => {
    const id = clinic.clinic_id ?? clinic.id;
    setSaving(true); setSaveOk(false); setSaveError(null);
    try {
      const res = await fetch(`${API_BASE}/api/clinics/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: clinicName, tier: clinicPlan, status: clinicStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      setSaveError('Error al guardar. Intenta de nuevo.');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Descarga individual de factura — HTML profesional ────────────────────
  const handleDownloadInvoice = (invId) => {
    const inv = invoices.find((i) => i.id === invId);
    if (!inv) return;
    setDownloadingId(invId);
    try {
      const statusRaw   = (inv.status ?? '').toLowerCase();
      const statusLabel = statusRaw === 'paid' ? 'Pagada' : statusRaw === 'pending' ? 'Pendiente' : 'Vencida';
      const statusColor = statusRaw === 'paid' ? '#10b981' : statusRaw === 'pending' ? '#f59e0b' : '#ef4444';
      const statusBg    = statusRaw === 'paid' ? '#ecfdf5' : statusRaw === 'pending' ? '#fffbeb' : '#fef2f2';
      const amountFmt   = typeof inv.amount === 'number'
        ? `$${inv.amount.toLocaleString('es-CL', { minimumFractionDigits: 2 })} USD`
        : String(inv.amount ?? '—');
      const dateFmt     = inv.date ?? inv.issued_at
        ? new Date(inv.date ?? inv.issued_at).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })
        : '—';
      const generatedAt = new Date().toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' });

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Factura ${inv.id ?? invId} — WellQ</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .page {
      width: 100%;
      max-width: 560px;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 12px 40px rgba(0,0,0,0.10);
    }
    /* ── Header compacto ── */
    .header {
      background: linear-gradient(135deg, #0b1017 0%, #1a2535 100%);
      padding: 20px 28px 16px;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 140px; height: 140px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(22,248,249,0.15) 0%, transparent 70%);
    }
    .logo-row { display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 20px; font-weight: 900; letter-spacing: -1px; color: #fff; }
    .logo span { color: #16f8f9; }
    .invoice-badge {
      background: rgba(22,248,249,0.12);
      border: 1px solid rgba(22,248,249,0.3);
      color: #16f8f9;
      font-size: 10px; font-weight: 700;
      letter-spacing: 2px; text-transform: uppercase;
      padding: 4px 10px; border-radius: 20px;
    }
    .header-meta {
      margin-top: 12px;
      display: flex; align-items: baseline; gap: 10px;
    }
    .header-label { font-size: 11px; color: rgba(255,255,255,0.45); font-weight: 600; }
    .invoice-id { font-size: 22px; font-weight: 900; color: #fff; letter-spacing: -1px; }
    /* ── Body ── */
    .body { padding: 20px 28px; }
    .info-row {
      display: flex; gap: 12px; margin-bottom: 16px;
    }
    .card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .card-label {
      font-size: 9px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1.5px;
      color: #94a3b8; margin-bottom: 5px;
    }
    .card-value { font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.3; }
    .card-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    /* ── Line item ── */
    .line-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0; border-bottom: 1px solid #f1f5f9;
    }
    .line-name { font-size: 13px; font-weight: 600; color: #1e293b; }
    .line-desc { font-size: 11px; color: #94a3b8; margin-top: 1px; }
    .line-amount { font-size: 14px; font-weight: 800; color: #0f172a; }
    /* ── Total + status row ── */
    .bottom-row {
      display: flex; align-items: center; justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 14px;
    }
    .total-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
    .total-amount { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
    .status-chip {
      display: inline-flex; align-items: center; gap: 6px;
      background: ${statusBg};
      border: 1.5px solid ${statusColor}33;
      color: ${statusColor};
      font-size: 11px; font-weight: 800;
      text-transform: uppercase; letter-spacing: 1.5px;
      padding: 6px 14px; border-radius: 100px;
    }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: ${statusColor}; }
    /* ── Footer ── */
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 12px 28px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .footer-brand { font-size: 11px; font-weight: 700; color: #94a3b8; }
    .footer-brand strong { color: #0f172a; }
    .footer-gen { font-size: 10px; color: #94a3b8; }
    @media print {
      body { background: white; padding: 0; display: block; }
      .page { box-shadow: none; border-radius: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo-row">
        <div class="logo">Well<span>Q</span></div>
        <div class="invoice-badge">Factura</div>
      </div>
      <div class="header-meta">
        <span class="header-label">N°</span>
        <span class="invoice-id">${inv.id ?? invId}</span>
      </div>
    </div>

    <div class="body">
      <div class="info-row">
        <div class="card">
          <p class="card-label">Emitida a</p>
          <p class="card-value">${clinic.name ?? '—'}</p>
          <p class="card-sub">${clinic.clinic_id ?? clinic.id ?? ''}</p>
        </div>
        <div class="card">
          <p class="card-label">Fecha de emisión</p>
          <p class="card-value">${dateFmt}</p>
          <p class="card-sub">Facturado por WellQ</p>
        </div>
      </div>

      <div class="line-item">
        <div>
          <p class="line-name">Suscripción WellQ</p>
          <p class="line-desc">Plan ${clinic.tier?.toUpperCase() ?? 'SMB'} — Período mensual</p>
        </div>
        <p class="line-amount">${amountFmt}</p>
      </div>

      <div class="bottom-row">
        <div>
          <p class="total-label">Total</p>
          <p class="total-amount">${amountFmt}</p>
        </div>
        <div class="status-chip">
          <div class="status-dot"></div>
          ${statusLabel}
        </div>
      </div>
    </div>

    <div class="footer">
      <p class="footer-brand">Emitido por <strong>WellQ</strong> · wellq.co</p>
      <p class="footer-gen">Generado el ${generatedAt}</p>
    </div>
  </div>
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${invId}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError(invId);
      setTimeout(() => setDownloadError(null), 3000);
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Exportar todas las facturas como Excel con colores y pestañas ──────────
  const handleExportExcel = async () => {
    if (!invoices.length) return;

    const safeName = (clinic.name ?? 'clinica').replace(/\s+/g, '-').toLowerCase();
    const date     = new Date().toISOString().split('T')[0];
    const clinicId = clinic.clinic_id ?? clinic.id ?? '';

    // ── Helpers de formato ────────────────────────────────────────────────────
    const fmtDate = (val) => {
      if (!val) return '—';
      const d = new Date(val);
      return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
    };
    const fmtMonth = (val) => {
      if (!val) return '—';
      const d = new Date(val);
      if (isNaN(d.getTime())) return '—';
      const str = d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
      return str.charAt(0).toUpperCase() + str.slice(1);
    };
    const toNum = (val) =>
      typeof val === 'number' ? val : parseFloat(String(val ?? '0').replace(/[^0-9.]/g, '')) || 0;
    const fmt$ = (n) => `$${n.toLocaleString('es-CL', { minimumFractionDigits: 2 })} USD`;
    const fmtStatus = (s) => {
      const m = { paid: 'Pagada', pending: 'Pendiente', overdue: 'Vencida' };
      return m[(s ?? '').toLowerCase()] ?? s ?? '—';
    };
    const total = (filter) => invoices.filter(filter).reduce((acc, i) => acc + toNum(i.amount), 0);

    // ── Paleta de colores WellQ ───────────────────────────────────────────────
    const C = {
      darkBg:      '0B1017', // Fondo oscuro principal
      darkMid:     '1A2535', // Fondo oscuro secundario
      cyan:        '16F8F9', // Cyan WellQ
      white:       'FFFFFF',
      green:       '10B981', // Pagada
      greenBg:     'ECFDF5',
      amber:       'F59E0B', // Pendiente
      amberBg:     'FFFBEB',
      red:         'EF4444', // Vencida
      redBg:       'FEF2F2',
      rowAlt:      'F8FAFC', // Fila alternada suave
      rowWhite:    'FFFFFF',
      headerText:  '0F172A', // Texto oscuro para headers de sección
      subText:     '64748B', // Texto secundario gris
      borderColor: 'E2E8F0', // Borde suave
    };

    // ── Estilos reutilizables ─────────────────────────────────────────────────

    // Cabecera principal de columnas (fondo oscuro, texto cyan)
    const colHeaderStyle = {
      font:      { bold: true, color: { argb: `FF${C.white}` }, size: 10 },
      fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${C.darkBg}` } },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: false },
      border: {
        bottom: { style: 'medium', color: { argb: `FF${C.cyan}` } },
        top:    { style: 'thin',   color: { argb: `FF${C.darkMid}` } },
        left:   { style: 'thin',   color: { argb: `FF${C.darkMid}` } },
        right:  { style: 'thin',   color: { argb: `FF${C.darkMid}` } },
      },
    };

    // Estilo de celda de datos (normal, con borde suave)
    const cellStyle = (isAlt = false) => ({
      font:      { size: 10, color: { argb: `FF${C.headerText}` } },
      fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${isAlt ? C.rowAlt : C.rowWhite}` } },
      alignment: { vertical: 'middle', horizontal: 'left' },
      border: {
        bottom: { style: 'thin', color: { argb: `FF${C.borderColor}` } },
        top:    { style: 'thin', color: { argb: `FF${C.borderColor}` } },
        left:   { style: 'thin', color: { argb: `FF${C.borderColor}` } },
        right:  { style: 'thin', color: { argb: `FF${C.borderColor}` } },
      },
    });

    // Estilo de chip de estado por valor
    const statusStyle = (statusRaw) => {
      const map = {
        paid:    { fg: C.green,  bg: C.greenBg },
        pending: { fg: C.amber,  bg: C.amberBg },
        overdue: { fg: C.red,    bg: C.redBg   },
      };
      const { fg, bg } = map[(statusRaw ?? '').toLowerCase()] ?? { fg: C.subText, bg: C.rowAlt };
      return {
        font:      { bold: true, color: { argb: `FF${fg}` }, size: 10 },
        fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } },
        alignment: { vertical: 'middle', horizontal: 'center' },
        border: {
          bottom: { style: 'thin', color: { argb: `FF${fg}` } },
          top:    { style: 'thin', color: { argb: `FF${fg}` } },
          left:   { style: 'thin', color: { argb: `FF${fg}` } },
          right:  { style: 'thin', color: { argb: `FF${fg}` } },
        },
      };
    };

    // Estilo de título de hoja (mega fila de título)
    const sheetTitleStyle = (accentColor = C.cyan) => ({
      font:      { bold: true, color: { argb: `FF${accentColor}` }, size: 13 },
      fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${C.darkBg}` } },
      alignment: { vertical: 'middle', horizontal: 'left' },
    });

    // Estilo de fila de sección (ej: ▶ ESTADÍSTICAS)
    const sectionHeaderStyle = (accentColor = C.cyan) => ({
      font:      { bold: true, color: { argb: `FF${accentColor}` }, size: 10 },
      fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${C.darkMid}` } },
      alignment: { vertical: 'middle', horizontal: 'left' },
    });

    // Estilo de clave en hoja General
    const summaryKeyStyle = (isAlt = false) => ({
      font:      { bold: true, size: 10, color: { argb: `FF${C.headerText}` } },
      fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${isAlt ? C.rowAlt : C.rowWhite}` } },
      alignment: { vertical: 'middle', horizontal: 'left' },
      border: {
        bottom: { style: 'thin', color: { argb: `FF${C.borderColor}` } },
        top:    { style: 'thin', color: { argb: `FF${C.borderColor}` } },
        left:   { style: 'thin', color: { argb: `FF${C.borderColor}` } },
        right:  { style: 'thin', color: { argb: `FF${C.borderColor}` } },
      },
    });

    // Estilo de valor en hoja General
    const summaryValStyle = (isAlt = false, accent = false) => ({
      font:      { size: 10, color: { argb: `FF${accent ? C.cyan : C.subText}` } },
      fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${isAlt ? C.rowAlt : C.rowWhite}` } },
      alignment: { vertical: 'middle', horizontal: 'right' },
      border: {
        bottom: { style: 'thin', color: { argb: `FF${C.borderColor}` } },
        top:    { style: 'thin', color: { argb: `FF${C.borderColor}` } },
        left:   { style: 'thin', color: { argb: `FF${C.borderColor}` } },
        right:  { style: 'thin', color: { argb: `FF${C.borderColor}` } },
      },
    });

    // ── Función genérica: aplica estilos a una hoja de facturas ──────────────
    const buildInvoiceSheet = (wb, sheetName, filteredInvoices, accentColor = C.cyan) => {
      const ws = wb.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 3 }], // Congela 3 filas: título + vacía + cabeceras
      });

      const COLS = [
        { header: 'N° Factura',         key: 'id',      width: 20 },
        { header: 'Fecha de Emisión',   key: 'fecha',   width: 26 },
        { header: 'Mes Facturación',    key: 'mes',     width: 20 },
        { header: 'Clínica',            key: 'clinica', width: 30 },
        { header: 'ID Clínica',         key: 'idClinic',width: 22 },
        { header: 'Plan',               key: 'plan',    width: 16 },
        { header: 'Monto (USD)',         key: 'monto',   width: 18 },
        { header: 'Estado',             key: 'estado',  width: 16 },
      ];
      ws.columns = COLS;

      // Fila 1: Título de hoja (fusionada)
      ws.mergeCells(1, 1, 1, COLS.length);
      const titleCell = ws.getCell(1, 1);
      titleCell.value = `WellQ · Facturación — ${clinic.name ?? ''}  |  ${sheetName.toUpperCase()}`;
      Object.assign(titleCell, sheetTitleStyle(accentColor));
      ws.getRow(1).height = 28;

      // Fila 2: Separador visual vacío
      ws.getRow(2).height = 6;
      for (let c = 1; c <= COLS.length; c++) {
        ws.getCell(2, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${C.darkMid}` } };
      }

      // Fila 3: Cabeceras de columnas
      const headerRow = ws.getRow(3);
      COLS.forEach((col, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = col.header;
        Object.assign(cell, colHeaderStyle);
      });
      headerRow.height = 22;

      // Filas de datos
      if (filteredInvoices.length === 0) {
        const emptyRow = ws.addRow(['Sin registros para esta categoría']);
        ws.mergeCells(emptyRow.number, 1, emptyRow.number, COLS.length);
        const ec = emptyRow.getCell(1);
        ec.font      = { italic: true, color: { argb: `FF${C.subText}` }, size: 10 };
        ec.alignment = { horizontal: 'center', vertical: 'middle' };
        emptyRow.height = 20;
      } else {
        filteredInvoices.forEach((inv, i) => {
          const isAlt     = i % 2 === 1;
          const statusRaw = (inv.status ?? '').toLowerCase();
          const row = ws.addRow({
            id:       inv.id ?? inv.invoice_id ?? '—',
            fecha:    fmtDate(inv.date ?? inv.issued_at),
            mes:      fmtMonth(inv.date ?? inv.issued_at),
            clinica:  clinic.name ?? '—',
            idClinic: clinicId,
            plan:     clinic.tier?.toUpperCase() ?? '—',
            monto:    toNum(inv.amount),
            estado:   fmtStatus(inv.status),
          });
          row.height = 20;

          // Aplica estilo base a todas las celdas de la fila
          row.eachCell({ includeEmpty: true }, (cell, colNum) => {
            Object.assign(cell, cellStyle(isAlt));
          });

          // Celda de monto: negrita + alineada a la derecha
          const montoCell = row.getCell('monto');
          montoCell.numFmt = '$#,##0.00';
          montoCell.font      = { bold: true, size: 10, color: { argb: `FF${C.headerText}` } };
          montoCell.alignment = { horizontal: 'right', vertical: 'middle' };
          montoCell.fill      = cellStyle(isAlt).fill;
          montoCell.border    = cellStyle(isAlt).border;

          // Celda de estado: color según valor
          const estadoCell = row.getCell('estado');
          Object.assign(estadoCell, statusStyle(statusRaw));
        });
      }

      // Autofilter desde fila de cabeceras
      ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: COLS.length } };
    };

    // ── Crea el workbook ──────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator  = 'WellQ Admin';
    wb.created  = new Date();
    wb.modified = new Date();

    // ── HOJA 0: General (Resumen con colores) ─────────────────────────────────
    const wsSummary = wb.addWorksheet('General', {
      views: [{ state: 'frozen', ySplit: 2 }],
    });
    wsSummary.columns = [
      { key: 'metrica', width: 36 },
      { key: 'valor',   width: 40 },
    ];

    // Título principal de la hoja General
    wsSummary.mergeCells('A1:B1');
    const genTitle = wsSummary.getCell('A1');
    genTitle.value = `WellQ · Resumen de Facturación — ${clinic.name ?? ''}`;
    Object.assign(genTitle, sheetTitleStyle(C.cyan));
    wsSummary.getRow(1).height = 28;

    // Separador
    wsSummary.getRow(2).height = 5;
    ['A2', 'B2'].forEach((addr) => {
      wsSummary.getCell(addr).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${C.darkMid}` } };
    });

    // Datos de resumen con estructura de secciones
    const summaryData = [
      { type: 'header',  metrica: '◆  INFORMACIÓN DE LA CLÍNICA',  valor: '',         accent: C.cyan  },
      { type: 'data',    metrica: 'Nombre de Clínica',              valor: clinic.name ?? '—'         },
      { type: 'data',    metrica: 'ID de Sistema',                  valor: clinicId                   },
      { type: 'data',    metrica: 'Plan Contratado',                valor: clinic.tier?.toUpperCase() ?? '—' },
      { type: 'data',    metrica: 'Fecha de Exportación',           valor: new Date().toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' }) },
      { type: 'spacer'                                                                                  },
      { type: 'header',  metrica: '◆  ESTADÍSTICAS DE FACTURAS',   valor: '',         accent: C.cyan  },
      { type: 'data',    metrica: 'Total Facturas Registradas',     valor: invoices.length             },
      { type: 'dataGreen', metrica: 'Cantidad Pagadas',             valor: invoices.filter((i) => (i.status ?? '').toLowerCase() === 'paid').length    },
      { type: 'dataAmber', metrica: 'Cantidad Pendientes',          valor: invoices.filter((i) => (i.status ?? '').toLowerCase() === 'pending').length },
      { type: 'dataRed',   metrica: 'Cantidad Vencidas',            valor: invoices.filter((i) => (i.status ?? '').toLowerCase() === 'overdue').length },
      { type: 'spacer'                                                                                  },
      { type: 'header',  metrica: '◆  RESUMEN FINANCIERO',         valor: '',         accent: C.cyan  },
      { type: 'dataGreen', metrica: 'Total Recaudado (Pagado)',     valor: fmt$(total((i) => (i.status ?? '').toLowerCase() === 'paid'))    },
      { type: 'dataAmber', metrica: 'Total por Cobrar (Pendiente)', valor: fmt$(total((i) => (i.status ?? '').toLowerCase() === 'pending')) },
      { type: 'dataRed',   metrica: 'Total en Deuda (Vencido)',     valor: fmt$(total((i) => (i.status ?? '').toLowerCase() === 'overdue')) },
    ];

    let dataRowCount = 0;
    summaryData.forEach((item) => {
      if (item.type === 'spacer') {
        const r = wsSummary.addRow({ metrica: '', valor: '' });
        r.height = 8;
        return;
      }
      if (item.type === 'header') {
        const r = wsSummary.addRow({ metrica: item.metrica, valor: '' });
        wsSummary.mergeCells(`A${r.number}:B${r.number}`);
        Object.assign(r.getCell(1), sectionHeaderStyle(item.accent ?? C.cyan));
        r.height = 20;
        dataRowCount = 0; // Reset alternado por sección
        return;
      }

      const isAlt = dataRowCount % 2 === 1;
      dataRowCount++;

      // Color de acento para el valor según tipo
      const valColor = item.type === 'dataGreen' ? C.green
                     : item.type === 'dataAmber' ? C.amber
                     : item.type === 'dataRed'   ? C.red
                     : null;

      const r = wsSummary.addRow({ metrica: item.metrica, valor: item.valor });
      r.height = 20;

      // Celda clave
      Object.assign(r.getCell(1), summaryKeyStyle(isAlt));

      // Celda valor
      const valCell = r.getCell(2);
      Object.assign(valCell, summaryValStyle(isAlt, !!valColor));
      if (valColor) {
        valCell.font = { bold: true, size: 10, color: { argb: `FF${valColor}` } };
      }
    });

    // ── HOJA 1: Todas ────────────────────────────────────────────────────────
    buildInvoiceSheet(wb, 'Todas', invoices, C.cyan);

    // ── HOJA 2: Pagadas ──────────────────────────────────────────────────────
    buildInvoiceSheet(wb, 'Pagadas',    invoices.filter((i) => (i.status ?? '').toLowerCase() === 'paid'),    C.green);

    // ── HOJA 3: Pendientes ───────────────────────────────────────────────────
    buildInvoiceSheet(wb, 'Pendientes', invoices.filter((i) => (i.status ?? '').toLowerCase() === 'pending'), C.amber);

    // ── HOJA 4: Vencidas ─────────────────────────────────────────────────────
    buildInvoiceSheet(wb, 'Vencidas',   invoices.filter((i) => (i.status ?? '').toLowerCase() === 'overdue'), C.red);

    // ── Descarga ──────────────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = `WellQ_Facturacion_${safeName}_${date}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const initials = (clinic.name ?? 'WQ').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const drawerContent = (
    <>
      {/* ── Overlay de Fondo (Blur completo sobre el body) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999] bg-[#0b1017]/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* ── Panel Lateral Derecho (Drawer) ── */}
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 250 }}
        className="fixed inset-y-0 right-0 w-[440px] bg-white dark:bg-wellq-dark shadow-2xl z-[10000] border-l border-wellq-gray/10 dark:border-white/5 flex flex-col font-sans"
      >
        {/* ── Header Principal ─────────────────────────────────────────────────── */}
        <div className="flex-none px-6 pt-6 pb-0 border-b border-wellq-gray/10 dark:border-white/5 relative overflow-hidden">
          {/* Brillo ambiental superior */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-wellq-cyan/10 to-transparent opacity-50 pointer-events-none" />

          <div className="flex items-start justify-between mb-6 relative">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-wellq-cyan to-wellq-blue flex items-center justify-center shadow-lg shadow-wellq-cyan/20 ring-1 ring-white/20">
                  <span className="text-wellq-dark text-lg font-black tracking-tighter">{initials}</span>
                </div>
                {clinic.status && (
                  <span className={`
                    absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-white dark:border-wellq-dark
                    ${clinic.status.toLowerCase() === 'active' ? 'bg-wellq-green' :
                      clinic.status.toLowerCase() === 'suspended' ? 'bg-amber-400' : 'bg-red-500'}
                  `} />
                )}
              </div>
              <div>
                <h2 className="font-black text-xl text-wellq-dark dark:text-white tracking-tight leading-none mb-1">
                  {clinic.name ?? 'Esperando DB...'}
                </h2>
                <span className="text-[11px] font-bold text-wellq-gray font-mono uppercase bg-wellq-gray/5 dark:bg-white/5 px-2 py-0.5 rounded-md">
                  {clinic.clinic_id ?? clinic.id ?? '—'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 bg-wellq-gray/5 hover:bg-wellq-gray/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-all cursor-pointer flex-shrink-0 text-wellq-gray hover:text-wellq-dark dark:hover:text-white"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Tabs de Navegación */}
          <div className="flex items-center gap-7">
            <TabBtn active={activeTab === 'overview'}  onClick={() => setActiveTab('overview')}  label="Overview" />
            <TabBtn active={activeTab === 'settings'}  onClick={() => setActiveTab('settings')}  icon={SettingsIcon} label="Settings" />
            <TabBtn active={activeTab === 'invoices'}  onClick={() => setActiveTab('invoices')}  icon={Receipt}      label="Invoices" />
          </div>
        </div>

        {/* ── Body Content ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-[#0b1017] p-6">
          <AnimatePresence mode="wait">

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
                className="space-y-6"
              >
                {/* Contact Information */}
                <motion.section variants={itemVariants}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <User size={14} className="text-wellq-cyan" />
                    <h3 className="text-xs font-bold text-wellq-dark dark:text-white uppercase tracking-wider">Contact Info</h3>
                  </div>
                  <div className="bg-white dark:bg-wellq-dark border border-wellq-gray/15 dark:border-white/5 rounded-2xl px-5 py-2 shadow-sm">
                    <InfoRow icon={User}  label="Decision Maker" value={contact?.contact_info?.primary_name  ?? '—'} />
                    <InfoRow icon={Mail}  label="Email"          value={contact?.contact_info?.primary_email ?? '—'} accent />
                    <InfoRow icon={Phone} label="Phone"          value={contact?.contact_info?.primary_phone ?? '—'} />
                  </div>
                </motion.section>

                {/* Subscription Details */}
                <motion.section variants={itemVariants}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <CreditCard size={14} className="text-wellq-green" />
                    <h3 className="text-xs font-bold text-wellq-dark dark:text-white uppercase tracking-wider">Subscription</h3>
                  </div>
                  <div className="bg-white dark:bg-wellq-dark border border-wellq-gray/15 dark:border-white/5 rounded-2xl px-5 py-2 shadow-sm">
                    <InfoRow icon={CreditCard} label="Current Plan"   value={subscription?.plan_name ?? clinic.tier ?? '—'} />
                    <InfoRow icon={TrendingUp} label="Contract Value" value={subscription ? `$${(subscription.mrr_value * 12).toLocaleString()}/yr` : '$0/yr'} accent />
                  </div>
                </motion.section>

                {/* Usage Statistics (Grid) */}
                <motion.section variants={itemVariants}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Activity size={14} className="text-wellq-cyan" />
                    <h3 className="text-xs font-bold text-wellq-dark dark:text-white uppercase tracking-wider">Usage Stats</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <StatCard
                      value={usage?.patient_sessions_completed?.toLocaleString() ?? '0'}
                      label="Patient Sessions"
                      colorClass="text-wellq-cyan"
                      borderClass="border-wellq-cyan/20 dark:border-wellq-cyan/20"
                      bgClass="bg-wellq-cyan/5 dark:bg-wellq-cyan/10"
                    />
                    <StatCard
                      value={usage?.active_clinicians?.toLocaleString() ?? '0'}
                      label="Active Clinicians"
                      colorClass="text-wellq-green"
                      borderClass="border-wellq-green/20 dark:border-wellq-green/20"
                      bgClass="bg-wellq-green/5 dark:bg-wellq-green/10"
                    />
                  </div>
                </motion.section>

                {/* Patient Health Section Component */}
                <motion.section variants={itemVariants}>
                  <PatientHealthSection clinicId={clinic.clinic_id ?? clinic.id} />
                </motion.section>
              </motion.div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
                className="space-y-6"
              >
                <motion.div variants={itemVariants}>
                  <div className="flex items-center gap-3.5 mb-6">
                    <div className="w-11 h-11 rounded-xl bg-wellq-gray/10 dark:bg-white/5 flex items-center justify-center">
                      <SettingsIcon size={20} className="text-wellq-dark dark:text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-wellq-dark dark:text-white">Clinic Configuration</h3>
                      <p className="text-xs font-medium text-wellq-gray">Manage core details and status for this tenant.</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-5 bg-white dark:bg-wellq-dark p-6 rounded-2xl border border-wellq-gray/15 dark:border-white/5 shadow-sm">
                  <div>
                    <label className="block text-[11px] font-bold text-wellq-gray uppercase tracking-wider mb-2">Clinic Name</label>
                    <input
                      type="text"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      className="w-full px-4 py-3 border border-wellq-gray/20 dark:border-white/10 rounded-xl text-sm font-semibold text-wellq-dark dark:text-white dark:bg-white/[0.02] bg-wellq-gray/5 focus:outline-none focus:ring-2 focus:ring-wellq-cyan/50 focus:border-wellq-cyan transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-wellq-gray uppercase tracking-wider mb-2">Assigned Plan</label>
                    <select
                      value={clinicPlan}
                      onChange={(e) => setClinicPlan(e.target.value)}
                      className="w-full px-4 py-3 border border-wellq-gray/20 dark:border-white/10 rounded-xl text-sm font-semibold text-wellq-dark dark:text-white dark:bg-white/[0.02] bg-wellq-gray/5 focus:outline-none focus:ring-2 focus:ring-wellq-cyan/50 focus:border-wellq-cyan transition-all cursor-pointer"
                    >
                      <option value="Enterprise">Enterprise</option>
                      <option value="Pro">Pro / SMB</option>
                      <option value="Trial">Trial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-wellq-gray uppercase tracking-wider mb-2">Account Status</label>
                    <select
                      value={clinicStatus}
                      onChange={(e) => setClinicStatus(e.target.value)}
                      className="w-full px-4 py-3 border border-wellq-gray/20 dark:border-white/10 rounded-xl text-sm font-semibold text-wellq-dark dark:text-white dark:bg-white/[0.02] bg-wellq-gray/5 focus:outline-none focus:ring-2 focus:ring-wellq-cyan/50 focus:border-wellq-cyan transition-all cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Churned">Churned</option>
                    </select>
                  </div>

                  {saveError && (
                    <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3">
                      {saveError}
                    </p>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full mt-4 px-4 py-3.5 bg-gradient-to-r from-wellq-cyan to-wellq-blue text-wellq-dark rounded-xl font-black text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-wellq-cyan/20"
                  >
                    {saving
                      ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                      : saveOk
                      ? <><CheckCircle size={16} /> ¡Actualizado!</>
                      : 'Save Changes'
                    }
                  </button>
                </motion.div>
              </motion.div>
            )}

            {/* INVOICES TAB */}
            {activeTab === 'invoices' && (
              <motion.div
                key="invoices"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
                className="space-y-4"
              >
                <motion.div variants={itemVariants} className="flex items-center justify-between gap-3.5 mb-6">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-wellq-green/10 dark:bg-wellq-green/20 flex items-center justify-center">
                      <Receipt size={20} className="text-wellq-green" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-wellq-dark dark:text-white">Billing History</h3>
                      <p className="text-xs font-medium text-wellq-gray">Recent invoices and payment status.</p>
                    </div>
                  </div>

                  {/* Botón Export Excel */}
                  {!invoicesLoading && invoices.length > 0 && (
                    <button
                      onClick={handleExportExcel}
                      title="Exportar facturas como Excel con pestañas"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-wellq-green/30 bg-wellq-green/5 hover:bg-wellq-green/10 text-wellq-green text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
                    >
                      <FileDown size={14} strokeWidth={2.5} />
                      Export Excel
                    </button>
                  )}
                </motion.div>

                {/* Loading state */}
                {invoicesLoading && (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={22} className="animate-spin text-wellq-cyan" />
                  </div>
                )}

                {/* Lista de facturas */}
                {!invoicesLoading && invoices.map((inv) => (
                  <motion.div
                    key={inv.id}
                    variants={itemVariants}
                    className="flex items-center justify-between p-4 bg-white dark:bg-wellq-dark border border-wellq-gray/15 dark:border-white/5 rounded-2xl shadow-sm hover:border-wellq-cyan/40 dark:hover:border-wellq-cyan/30 hover:bg-wellq-cyan/5 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-wellq-gray/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white dark:group-hover:bg-wellq-cyan/20 transition-colors">
                        <Receipt size={16} className="text-wellq-gray dark:text-white group-hover:text-wellq-cyan transition-colors" />
                      </div>
                      <div>
                        {/* AQUÍ ESTÁ EL FIX: Muestra fallbacks robustos para ID y Fecha */}
                        <p className="text-sm font-black text-wellq-dark dark:text-white tracking-tight">
                          {typeof inv.amount === 'number' ? `$${inv.amount.toLocaleString('es-CL')} USD` : inv.amount ?? '—'}
                        </p>
                        <p className="text-[11px] font-bold text-wellq-gray font-mono tracking-wider capitalize">
                          {inv.id ?? inv.invoice_id ?? 'SIN-ID'}
                          {(inv.date || inv.issued_at) ? ` · ${new Date(inv.date ?? inv.issued_at).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border ${
                        (inv.status ?? '').toLowerCase() === 'paid'
                          ? 'bg-wellq-green/10 text-wellq-green border-wellq-green/20'
                          : (inv.status ?? '').toLowerCase() === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {inv.status}
                      </span>
                      {/* Botón descarga — siempre visible, con estados de loading/error */}
                      <button
                        className={`p-2 rounded-xl transition-all ${
                          downloadError === inv.id
                            ? 'text-red-400 bg-red-500/10'
                            : 'text-wellq-gray hover:text-wellq-cyan hover:bg-wellq-cyan/10'
                        }`}
                        title={downloadError === inv.id ? 'Error al descargar' : 'Descargar factura'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadInvoice(inv.id);
                        }}
                        disabled={downloadingId === inv.id}
                      >
                        {downloadingId === inv.id
                          ? <Loader2 size={16} className="animate-spin text-wellq-cyan" strokeWidth={2.5} />
                          : downloadError === inv.id
                          ? <AlertCircle size={16} strokeWidth={2.5} />
                          : <Download size={16} strokeWidth={2.5} />
                        }
                      </button>
                    </div>
                  </motion.div>
                ))}

                {/* Empty state */}
                {!invoicesLoading && invoices.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-wellq-gray/5 dark:bg-white/5 flex items-center justify-center">
                      <Receipt size={24} className="text-wellq-gray" />
                    </div>
                    <p className="text-sm font-bold text-wellq-dark dark:text-white">Sin facturas</p>
                    <p className="text-xs text-wellq-gray">No hay facturas registradas para esta clínica.</p>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Footer de Acción Rápida (Overview) ───────────────────────────────── */}
        <AnimatePresence>
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex-none p-6 border-t border-wellq-gray/10 dark:border-white/5 bg-white dark:bg-wellq-dark shadow-[0_-10px_30px_rgba(0,0,0,0.02)]"
            >
              <button
                onClick={() => setContactModalOpen(true)}
                className="w-full px-4 py-3.5 border-2 border-wellq-cyan/30 hover:border-wellq-cyan bg-wellq-cyan/5 hover:bg-wellq-cyan/10 text-wellq-cyan dark:text-wellq-cyan rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Mail size={16} strokeWidth={2.5} /> Contactar Clínica
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Modal de Contacto ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {contactModalOpen && (
          <ContactClinicModal
            clinic={clinic}
            contact={contact}
            onClose={() => setContactModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );

  // Inyectamos todo el Drawer directamente al body para que el overlay desenfoque todo
  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : null;
};