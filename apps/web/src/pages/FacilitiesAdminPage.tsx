import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useCan } from '../auth/permissions';
import { DataTable, type DataColumn } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { ConfirmDialog, Modal } from '../components/Modal';
import { WebShell } from '../components/shells';
import { useToast } from '../components/ToastProvider';
import { Badge, Button, Input, PageHeader } from '../components/ui';

type FacRow = {
  facility_id: string;
  name: string;
  district: string;
  active?: boolean;
  deleted_at?: string | null;
};

export function FacilitiesAdminPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const canFacUpdate = useCan('facilities:update');
  const canFacWrite = useCan('facilities:write');
  const canUpdate = canFacUpdate || canFacWrite;
  const canDelete = useCan('facilities:delete');
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<FacRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState<FacRow | null>(null);
  const [edit, setEdit] = useState<FacRow | null>(null);
  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<FacRow | null>(null);

  const page = Number(params.get('page') || 1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await api.listAdminFacilities({
        page,
        page_size: 20,
        q: params.get('q') || undefined,
        district: params.get('district') || undefined,
        status: params.get('status') || undefined,
      });
      setRows(data.items as FacRow[]);
      setTotal(data.total);
    } catch {
      setError(true);
      push(t('common.error'), 'danger');
    } finally {
      setLoading(false);
    }
  }, [page, params, push, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: DataColumn<FacRow>[] = [
    { id: 'id', header: t('users.colFacility'), cell: (r) => r.facility_id, truncate: true },
    { id: 'name', header: t('users.colName'), cell: (r) => r.name, primary: true, truncate: true },
    { id: 'district', header: t('users.colDistrict'), cell: (r) => r.district || ' - ' },
    {
      id: 'status',
      header: t('common.status'),
      cell: (r) =>
        r.deleted_at ? (
          <Badge tone="danger">{t('users.deletedBadge')}</Badge>
        ) : (
          <Badge tone={r.active ? 'success' : 'neutral'}>
            {r.active ? t('common.active') : t('common.inactive')}
          </Badge>
        ),
    },
  ];

  return (
    <WebShell title={t('common.facilities')} crumbs={[t('nav.settings'), t('common.facilities')]}>
      <PageHeader title={t('common.facilities')} subtitle={t('users.subtitle')} />
      <FilterBar
        storageKey="zm_filters_facilities"
        sticky
        resultCount={total}
        fields={[
          { key: 'q', label: t('common.search'), type: 'text' },
          { key: 'district', label: t('users.colDistrict'), type: 'text' },
          {
            key: 'status',
            label: t('common.status'),
            type: 'select',
            options: [
              { value: 'active', label: t('common.active') },
              { value: 'inactive', label: t('common.inactive') },
              { value: 'deleted', label: t('users.deletedBadge') },
            ],
          },
        ]}
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.facility_id}
        loading={loading}
        error={error}
        onRetry={() => void load()}
        emptyTitle={t('common.noResults')}
        onClearFilters={() => setParams(new URLSearchParams(), { replace: true })}
        onRowClick={(r) => setDetail(r)}
        page={page}
        pageSize={20}
        total={total}
        onPageChange={(p) => {
          const next = new URLSearchParams(params);
          next.set('page', String(p));
          setParams(next, { replace: true });
        }}
        actionsForRow={(row) => [
          {
            id: 'view',
            label: t('common.view'),
            icon: <Eye className="h-4 w-4" />,
            onClick: () => setDetail(row),
          },
          {
            id: 'edit',
            label: t('common.edit'),
            icon: <Pencil className="h-4 w-4" />,
            hidden: !canUpdate || Boolean(row.deleted_at),
            onClick: () => {
              setEdit(row);
              setName(row.name);
            },
          },
          {
            id: 'delete',
            label: t('common.delete'),
            icon: <Trash2 className="h-4 w-4" />,
            hidden: !canDelete || Boolean(row.deleted_at),
            danger: true,
            onClick: () => setConfirmDelete(row),
          },
        ]}
      />

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.name || t('common.view')}
        size="sm"
        footer={
          <Button type="button" variant="ghost" onClick={() => setDetail(null)}>
            {t('common.close')}
          </Button>
        }
      >
        {detail ? (
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-ink-muted">{t('users.colFacility')}</dt>
              <dd>{detail.facility_id}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('users.colDistrict')}</dt>
              <dd>{detail.district}</dd>
            </div>
          </dl>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        title={t('common.edit')}
        size="sm"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setEdit(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                push(t('common.save'), 'success');
                setEdit(null);
              }}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">{t('users.colName')}</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title={t('common.delete')}
        variant="danger"
        typeToConfirm={confirmDelete?.facility_id}
        onConfirm={async () => {
          push(t('common.delete'), 'success');
        }}
      />
    </WebShell>
  );
}
