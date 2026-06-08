import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Shield,
  Stethoscope,
  Users,
  X,
  Zap,
} from 'lucide-react';

import { API_BASE } from '../api/client';

const fmtNumber = (value) => Number(value ?? 0).toLocaleString('es-CL');

const fmtDate = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function StatCard({ icon: Icon, label, value, detail, tone = 'cyan' }) {
  const tones = {
    cyan: 'from-[#16f8f9]/20 to-[#2cb7e4]/10 text-[#16f8f9]',
    green: 'from-emerald-400/20 to-emerald-400/5 text-emerald-400',
    amber: 'from-amber-400/20 to-amber-400/5 text-amber-400',
    blue: 'from-sky-400/20 to-sky-400/5 text-sky-400',
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-white">{value}</p>
          {detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]}`}>
          <Icon size={20} strokeWidth={2.4} />
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value || '-'}</p>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="h-32 animate-pulse rounded-2xl bg-white/[0.06]" />
      ))}
    </div>
  );
}

export default function ClinicPortalPage() {
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = params.get('token');
  const clinicId = params.get('clinic_id');

  useEffect(() => {
    const controller = new AbortController();

    async function loadClinicPortal() {
      if (!token || !clinicId) {
        setError('Faltan parametros en la URL. Se esperaba token y clinic_id.');
        setLoading(false);
        return;
      }

      try {
        const qs = new URLSearchParams({ token, clinic_id: clinicId }).toString();
        const res = await fetch(`${API_BASE}/api/clinic-portal/data?${qs}`, {
          signal: controller.signal,
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(payload.detail || 'Sesion invalida o expirada.');
        }

        setClinic(payload);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'No se pudo cargar el portal de la clinica.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadClinicPortal();
    return () => controller.abort();
  }, [clinicId, token]);

  const usagePct = clinic?.patients_limit
    ? Math.round((Number(clinic.patients_used || 0) / Number(clinic.patients_limit || 1)) * 100)
    : 0;

  const healthRows = clinic ? [
    ['Mejorando', clinic.patients_health?.improving ?? 0, 'text-emerald-400'],
    ['Estables', clinic.patients_health?.stable ?? 0, 'text-[#16f8f9]'],
    ['En riesgo', clinic.patients_health?.at_risk ?? 0, 'text-amber-400'],
    ['Declinando', clinic.patients_health?.declining ?? 0, 'text-red-400'],
  ] : [];

  return (
    <div className="min-h-screen bg-[#070b12] text-white">
      <div className="sticky top-0 z-40 border-b border-amber-400/25 bg-amber-400 px-5 py-2 text-amber-950 shadow-lg shadow-amber-400/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield size={16} strokeWidth={2.5} />
            <span className="text-xs font-black uppercase tracking-widest">Acceso de soporte</span>
            {clinic && <span className="text-sm font-bold">{clinic.name}</span>}
          </div>
          <button
            onClick={() => window.close()}
            className="flex items-center gap-1.5 rounded-lg bg-amber-950/15 px-3 py-1 text-xs font-bold hover:bg-amber-950/25"
          >
            <X size={13} strokeWidth={2.5} />
            Cerrar
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#16f8f9]">
              <Activity size={14} />
              Portal read-only
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              {clinic?.name || 'Portal de clinica'}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {clinic?.clinic_id || clinicId} {clinic?.session?.expires_at ? `- expira ${fmtDate(clinic.session.expires_at)}` : ''}
            </p>
          </div>

          {clinic && (
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[#16f8f9]/20 bg-[#16f8f9]/10 px-3 py-1 text-xs font-black uppercase text-[#16f8f9]">
                {clinic.tier}
              </span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase text-emerald-400">
                {clinic.status}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-red-200">
            <AlertTriangle className="mt-0.5 shrink-0 text-red-400" size={18} />
            <div>
              <p className="font-bold">No se pudo abrir el portal</p>
              <p className="mt-1 text-sm text-red-200/80">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <LoadingView />
        ) : clinic && !error ? (
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-4">
              <StatCard
                icon={Users}
                label="Pacientes"
                value={`${fmtNumber(clinic.patients_used)} / ${fmtNumber(clinic.patients_limit)}`}
                detail={`${usagePct}% de uso`}
                tone={usagePct >= 90 ? 'amber' : 'cyan'}
              />
              <StatCard
                icon={Stethoscope}
                label="Clinicos activos"
                value={`${fmtNumber(clinic.clinicians?.active)} / ${fmtNumber(clinic.clinicians?.total)}`}
                detail={(clinic.clinicians?.specialties || []).join(', ')}
                tone="blue"
              />
              <StatCard
                icon={CheckCircle2}
                label="Health score"
                value={`${fmtNumber(clinic.health_score)}%`}
                detail="Estado operacional"
                tone={clinic.health_score >= 80 ? 'green' : 'amber'}
              />
              <StatCard
                icon={Zap}
                label="Actividad IA"
                value={fmtNumber(clinic.usage?.ai_processing_minutes)}
                detail="minutos procesados"
                tone="cyan"
              />
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Building2 size={17} className="text-[#16f8f9]" />
                  <h2 className="text-sm font-black uppercase tracking-wide text-white">Datos de la clinica</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <InfoField label="Razon social" value={clinic.company_name} />
                  <InfoField label="RUT / Tax ID" value={clinic.tax_id} />
                  <InfoField label="Direccion" value={clinic.address || clinic.location} />
                  <InfoField label="MRR" value={clinic.mrr ? `$${fmtNumber(clinic.mrr)} USD` : '-'} />
                  <InfoField label="Ultimo login" value={fmtDate(clinic.last_login)} />
                  <InfoField label="Creada" value={fmtDate(clinic.created_at)} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Mail size={17} className="text-[#16f8f9]" />
                  <h2 className="text-sm font-black uppercase tracking-wide text-white">Contacto</h2>
                </div>
                <div className="space-y-3">
                  <InfoField label="Nombre" value={clinic.contact_name} />
                  <InfoField label="Email" value={clinic.contact_email || clinic.billing_email} />
                  <InfoField label="Telefono" value={clinic.contact_phone} />
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Users size={17} className="text-[#16f8f9]" />
                  <h2 className="text-sm font-black uppercase tracking-wide text-white">Salud de pacientes</h2>
                </div>
                <div className="space-y-3">
                  {healthRows.map(([label, value, color]) => (
                    <div key={label} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                      <span className="text-sm font-semibold text-slate-300">{label}</span>
                      <span className={`text-sm font-black ${color}`}>{fmtNumber(value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Calendar size={17} className="text-[#16f8f9]" />
                  <h2 className="text-sm font-black uppercase tracking-wide text-white">Uso del mes</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoField label="Citas" value={fmtNumber(clinic.usage?.appointments_this_month)} />
                  <InfoField label="Notas SOAP" value={fmtNumber(clinic.usage?.notes_generated)} />
                  <InfoField label="Ejercicios" value={fmtNumber(clinic.usage?.exercises_assigned)} />
                  <InfoField label="API calls" value={fmtNumber(clinic.usage?.api_calls)} />
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
              <Clock size={16} className="text-amber-300" />
              <span>
                Sesion solo lectura iniciada por {clinic.session?.admin_email || 'admin'}.
              </span>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
