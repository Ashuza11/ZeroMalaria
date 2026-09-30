import Dexie, { type Table } from 'dexie';
import type { LocalReferral, SyncQueueItem, TriageInput } from '../types';

export type LocalCase = {
  id?: number;
  client_uuid: string;
  input: TriageInput;
  decision: string;
  reasons: string[];
  created_at: string;
  synced: boolean;
};

class ZeroMalariaDB extends Dexie {
  cases!: Table<LocalCase, number>;
  referrals!: Table<LocalReferral, number>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('zeromalaria');
    this.version(1).stores({
      cases: '++id, client_uuid, created_at, synced',
      referrals: '++id, client_uuid, status, created_at, synced',
      syncQueue: '++id, client_uuid, created_at',
    });
  }
}

export const db = new ZeroMalariaDB();

export async function enqueueReferral(referral: LocalReferral) {
  await db.referrals.put(referral);
  await db.syncQueue.put({
    client_uuid: referral.client_uuid,
    type: 'referral',
    payload: {
      client_uuid: referral.client_uuid,
      facility_id: referral.facility_id,
      chw_id: referral.chw_id,
      district: referral.district,
      sector: referral.sector,
      age_months: referral.age_months,
      sex: referral.sex,
      decision: referral.decision,
      reasons: referral.reasons,
      summary: referral.summary,
    },
    created_at: new Date().toISOString(),
  });
}
