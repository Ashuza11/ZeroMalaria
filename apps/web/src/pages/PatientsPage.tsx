import { Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { WebShell } from '../components/shells';
import {
  Badge,
  Card,
  EmptyState,
  Input,
  Select,
  Skeleton,
  StatusPill,
} from '../components/ui';
import { relativeTime } from '../lib/cn';
import { formatPatientLine } from '../lib/format';

type ReferralRow = {
  id: string;
  client_uuid: string;
  facility_id: string;
  chw_id: string;
  district: string;
  sector: string;
  age_months: number;
  sex: string;
  decision: string;
  reasons: string[];
  summary: string;
  status: string;
  created_at: string;
  overdue: boolean;
};

export function PatientsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('');
  const [detail, setDetail] = useState<ReferralRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let data: ReferralRow[];
      try {
        data = await api.scopedReferrals();
      } catch {
        data = await api.referrals();
      }
      setRows(data);
    } catch {
      setRows([]);
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (decisionFilter && r.decision !== decisionFilter) return false;
      if (!q) return true;
      const hay = [
        r.summary,
        r.id,
        r.client_uuid,
        r.chw_id,
        r.district,
        r.sector,
        r.facility_id,
        r.sex,
        String(r.age_months),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, statusFilter, decisionFilter]);

  const statuses = useMemo(() => [...new Set(rows.map((r) => r.status))].sort(), [rows]);

  return (
    <WebShell title={t('nav.patients')} crumbs={[t('nav.patients')]}>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[200px] flex-1 text-xs font-semibold text-ink-muted">
          {t('patients.search')}
          <Input
            className="mt-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('patients.searchPlaceholder')}
          />
        </label>
        <label className="text-xs font-semibold text-ink-muted">
          {t('patients.filterStatus')}
          <Select className="mt-1 w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{t('common.all')}</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-xs font-semibold text-ink-muted">
          {t('patients.filterDecision')}
          <Select className="mt-1 w-40" value={decisionFilter} onChange={(e) => setDecisionFilter(e.target.value)}>
            <option value="">{t('common.all')}</option>
            <option value="urgent_refer">{t('patients.decisionUrgent')}</option>
            <option value="refer">{t('patients.decisionRefer')}</option>
            <option value="treat_at_home">{t('patients.decisionHome')}</option>
          </Select>
        </label>
      </div>

      {loading ? <Skeleton className="h-64" /> : null}
      {error ? <Card className="mb-4 border-danger/30 text-danger">{error}</Card> : null}

      {!loading && !error && filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="h-8 w-8" strokeWidth={1.75} />}
            title={rows.length === 0 ? t('patients.emptyTitle') : t('patients.noMatchTitle')}
            description={rows.length === 0 ? t('patients.emptyBody') : t('patients.noMatchBody')}
          />
        </Card>
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-border bg-surface-muted text-xs uppercase text-ink-muted">
              <tr>
                <th className="px-4 py-3">{t('patients.colPatient')}</th>
                <th className="px-4 py-3">{t('patients.colDecision')}</th>
                <th className="px-4 py-3">{t('patients.colStatus')}</th>
                <th className="px-4 py-3">{t('patients.colDistrict')}</th>
                <th className="px-4 py-3">{t('patients.colChw')}</th>
                <th className="px-4 py-3">{t('patients.colWhen')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-border/60 hover:bg-surface-muted/60"
                  onClick={() => setDetail(row)}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold">
                      {formatPatientLine(row.age_months, row.sex, t)}
                    </p>
                    <p className="max-w-xs truncate text-xs text-ink-muted">{row.summary}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={row.decision as 'urgent_refer' | 'refer' | 'treat_at_home'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <StatusPill status={row.status as 'sent' | 'received' | 'arrived' | 'treated'} />
                      {row.overdue ? <Badge tone="warning">{t('facility.notArrived')}</Badge> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">{row.district}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.chw_id}</td>
                  <td className="px-4 py-3 text-ink-muted">{relativeTime(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="zm-backdrop absolute inset-0 bg-ink/40"
            aria-label={t('common.cancel')}
            onClick={() => setDetail(null)}
          />
          <aside className="zm-sheet relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-surface shadow-lift">
            <div className="border-b border-border px-6 pb-4 pt-6">
              <h2 className="text-[22px] font-bold tracking-[-0.02em]">
                {formatPatientLine(detail.age_months, detail.sex, t)}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">{detail.summary}</p>
            </div>
            <div className="space-y-5 p-6 text-[15px]">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[18px] bg-[rgba(118,118,128,0.08)] p-3.5">
                  <p className="text-xs text-ink-muted">{t('patients.colDecision')}</p>
                  <StatusPill status={detail.decision as 'urgent_refer' | 'refer' | 'treat_at_home'} />
                </div>
                <div className="rounded-[18px] bg-[rgba(118,118,128,0.08)] p-3.5">
                  <p className="text-xs text-ink-muted">{t('patients.colStatus')}</p>
                  <StatusPill status={detail.status as 'sent' | 'received' | 'arrived' | 'treated'} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-ink-muted">{t('patients.colDistrict')}</p>
                <p>
                  {detail.district} · {detail.sector}
                </p>
                <p className="text-ink-muted">{detail.facility_id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-ink-muted">{t('patients.colChw')}</p>
                <p className="font-mono text-xs">{detail.chw_id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-ink-muted">{t('result.why')}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {detail.reasons?.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-ink-muted">
                {t('patients.refId')}: {detail.id}
                <br />
                {t('patients.clientUuid')}: {detail.client_uuid}
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </WebShell>
  );
}
