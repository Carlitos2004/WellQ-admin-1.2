import React from 'react';
import { Skeleton } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';

export const AnalyticsView = ({
  appStats, featureAdoption, adherence, cohorts, soapQuality, loading,
}) => {
  const { t } = useLanguage();

  const patientApp = appStats?.patients;
  const tabletApp = appStats?.tablet;

  return (
    <div className="space-y-6">
      {/* App Usage + SOAP */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30 col-span-2">
          <h3 className="font-semibold text-wellq-dark dark:text-white mb-4">{t('analytics.appUsage')}</h3>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: `${t('overview.patientApp')} — MAU`, value: patientApp?.metrics?.monthly_active_users?.toLocaleString() ?? '0', color: 'text-wellq-cyan' },
                { label: `${t('overview.clinicianTablet')} — MAU`, value: tabletApp?.metrics?.monthly_active_users?.toLocaleString() ?? '0', color: 'text-wellq-green' },
                { label: t('analytics.avgSessionPatient'), value: `${patientApp?.metrics?.average_session_length_minutes ?? 0} min`, color: 'text-wellq-dark dark:text-white' },
                { label: t('analytics.avgSessionTablet'), value: `${tabletApp?.metrics?.average_session_length_minutes ?? 0} min`, color: 'text-wellq-dark dark:text-white' },
                { label: t('analytics.crashFreePatient'), value: `${patientApp?.metrics?.crash_free_sessions_percentage ?? 0}%`, color: 'text-wellq-green' },
                { label: t('analytics.crashFreeTablet'), value: `${tabletApp?.metrics?.crash_free_sessions_percentage ?? 0}%`, color: 'text-wellq-green' },
              ].map((item, i) => (
                <div key={i} className="bg-wellq-gray/5 dark:bg-wellq-dark/50 rounded-xl p-4">
                  <div className="text-xs text-wellq-gray mb-1">{item.label}</div>
                  <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
          <h3 className="font-semibold text-wellq-dark dark:text-white mb-4">{t('analytics.soapQuality')}</h3>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <div className="text-3xl font-bold text-wellq-green mb-1">
                {soapQuality?.acceptance_rate_percentage ?? 0}%
              </div>
              <div className="text-xs text-wellq-gray mb-3">{t('analytics.acceptanceRate')}</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-wellq-gray">{t('analytics.notesGenerated')}</span>
                  <span className="font-semibold text-wellq-dark dark:text-white">
                    {(soapQuality?.total_notes_generated ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-wellq-gray">{t('analytics.requireEdits')}</span>
                  <span className="font-semibold text-amber-500">
                    {soapQuality?.edits_required_percentage ?? 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-wellq-gray">{t('analytics.timeSaved')}</span>
                  <span className="font-semibold text-wellq-green">
                    {soapQuality?.average_time_saved_minutes_per_note ?? 0} min/note
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Feature Adoption */}
      <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
        <h3 className="font-semibold text-wellq-dark dark:text-white mb-4">
          {t('analytics.featureAdoption')}{' '}
          <span className="text-xs font-normal text-wellq-gray ml-2">{t('analytics.last30days')}</span>
        </h3>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="space-y-4">
            {(
              featureAdoption?.data ?? [
                { feature_name: t('overview.waitingConnection'), adoption_rate_percentage: 0, total_uses: 0, user_feedback_score: 0 },
              ]
            ).map((f, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium text-wellq-dark dark:text-white">{f.feature_name}</span>
                    <span className="ml-2 text-xs text-wellq-gray">
                      {f.total_uses?.toLocaleString()} {t('analytics.uses')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-500">⭐ {f.user_feedback_score}</span>
                    <span className="text-sm font-bold text-wellq-cyan">
                      {f.adoption_rate_percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-wellq-gray/10 dark:bg-wellq-dark/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-wellq-cyan rounded-full"
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
        <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
          <h3 className="font-semibold text-wellq-dark dark:text-white mb-4">{t('analytics.adherence')}</h3>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <div className="text-4xl font-bold text-wellq-green mb-1">
                {adherence?.overall_adherence_percentage ?? 0}%
              </div>
              <div className="text-xs text-wellq-gray mb-4">
                {t('analytics.topDropOff')}:{' '}
                <span className="font-semibold text-red-400">
                  {adherence?.top_dropping_point ?? t('overview.waitingConnection')}
                </span>
              </div>
              <div className="space-y-2">
                {(adherence?.breakdown_by_week ?? [{ week: 'Week 1', adherence: 0 }]).map(
                  (w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-wellq-gray w-14">{w.week}</span>
                      <div className="flex-1 h-2 bg-wellq-gray/10 dark:bg-wellq-dark/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-wellq-green rounded-full"
                          style={{ width: `${w.adherence}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-wellq-dark dark:text-white w-10 text-right">
                        {w.adherence}%
                      </span>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>

        <div className="bg-white dark:bg-wellq-dark rounded-2xl p-6 shadow-sm border border-wellq-gray/20 dark:border-wellq-gray/30">
          <h3 className="font-semibold text-wellq-dark dark:text-white mb-4">{t('analytics.cohortRetention')}</h3>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4">
              {(
                cohorts?.data ?? [
                  { cohort: t('overview.waitingConnection'), users: 0, retention_by_month: { M1: 0, M2: 0, M3: 0, M4: 0 } },
                ]
              ).map((c, i) => {
                const months = Object.entries(c.retention_by_month);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-wellq-dark dark:text-white">{c.cohort}</span>
                      <span className="text-xs text-wellq-gray">
                        {c.users?.toLocaleString()} {t('analytics.users')}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {months.map(([m, pct], j) => (
                        <div key={j} className="flex-1 text-center">
                          <div
                            className="h-8 rounded flex items-end justify-center"
                            style={{ background: `rgba(22, 248, 249, ${pct / 100})` }}
                          >
                            <span className="text-xs font-semibold text-wellq-dark dark:text-white pb-1">{pct}</span>
                          </div>
                          <span className="text-xs text-wellq-gray">{m}</span>
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