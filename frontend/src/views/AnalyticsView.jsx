import React from 'react';
import { Skeleton } from '../components/ui';

export const AnalyticsView = ({
  appStats, featureAdoption, adherence, cohorts, soapQuality, loading,
}) => {
  const patientApp = appStats?.patients;
  const tabletApp = appStats?.tablet;

  return (
    <div className="space-y-6">
      {/* App Usage + SOAP */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 col-span-2">
          <h3 className="font-semibold text-slate-900 mb-4">App Usage by Platform</h3>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Patient App — MAU', value: patientApp?.metrics?.monthly_active_users?.toLocaleString() ?? '0', color: 'text-indigo-600' },
                { label: 'Clinician Tablet — MAU', value: tabletApp?.metrics?.monthly_active_users?.toLocaleString() ?? '0', color: 'text-emerald-600' },
                { label: 'Avg session (patient)', value: `${patientApp?.metrics?.average_session_length_minutes ?? 0} min`, color: 'text-slate-900' },
                { label: 'Avg session (tablet)', value: `${tabletApp?.metrics?.average_session_length_minutes ?? 0} min`, color: 'text-slate-900' },
                { label: 'Crash-free (patient)', value: `${patientApp?.metrics?.crash_free_sessions_percentage ?? 0}%`, color: 'text-emerald-600' },
                { label: 'Crash-free (tablet)', value: `${tabletApp?.metrics?.crash_free_sessions_percentage ?? 0}%`, color: 'text-emerald-600' },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-4">
                  <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                  <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">AI SOAP Quality</h3>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <div className="text-3xl font-bold text-emerald-600 mb-1">
                {soapQuality?.acceptance_rate_percentage ?? 0}%
              </div>
              <div className="text-xs text-slate-500 mb-3">Acceptance rate</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Notes generated</span>
                  <span className="font-semibold text-slate-900">
                    {(soapQuality?.total_notes_generated ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Require edits</span>
                  <span className="font-semibold text-amber-600">
                    {soapQuality?.edits_required_percentage ?? 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time saved</span>
                  <span className="font-semibold text-emerald-600">
                    {soapQuality?.average_time_saved_minutes_per_note ?? 0} min/note
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Feature Adoption */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4">
          Feature Adoption{' '}
          <span className="text-xs font-normal text-slate-500 ml-2">Last 30 days</span>
        </h3>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="space-y-4">
            {(
              featureAdoption?.data ?? [
                { feature_name: 'Esperando conexión con backend...', adoption_rate_percentage: 0, total_uses: 0, user_feedback_score: 0 },
              ]
            ).map((f, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium text-slate-900">{f.feature_name}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {f.total_uses?.toLocaleString()} uses
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-500">⭐ {f.user_feedback_score}</span>
                    <span className="text-sm font-bold text-indigo-600">
                      {f.adoption_rate_percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${f.adoption_rate_percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Adherence + Cohorts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">Global Exercise Adherence</h3>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <div className="text-4xl font-bold text-emerald-600 mb-1">
                {adherence?.overall_adherence_percentage ?? 0}%
              </div>
              <div className="text-xs text-slate-500 mb-4">
                Top drop-off:{' '}
                <span className="font-semibold text-red-500">
                  {adherence?.top_dropping_point ?? 'Esperando...'}
                </span>
              </div>
              <div className="space-y-2">
                {(adherence?.breakdown_by_week ?? [{ week: 'Week 1', adherence: 0 }]).map(
                  (w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-14">{w.week}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${w.adherence}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-900 w-10 text-right">
                        {w.adherence}%
                      </span>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">Cohort Retention</h3>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4">
              {(
                cohorts?.data ?? [
                  { cohort: 'Esperando...', users: 0, retention_by_month: { M1: 0, M2: 0, M3: 0, M4: 0 } },
                ]
              ).map((c, i) => {
                const months = Object.entries(c.retention_by_month);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-900">{c.cohort}</span>
                      <span className="text-xs text-slate-500">
                        {c.users?.toLocaleString()} users
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {months.map(([m, pct], j) => (
                        <div key={j} className="flex-1 text-center">
                          <div
                            className="h-8 rounded flex items-end justify-center"
                            style={{ background: `rgba(99,102,241,${pct / 100})` }}
                          >
                            <span className="text-xs font-semibold text-slate-900 pb-1">{pct}</span>
                          </div>
                          <span className="text-xs text-slate-500">{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
