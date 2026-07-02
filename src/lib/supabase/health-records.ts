import { z } from 'zod';

import {
  healthRecordSchema,
  type HealthRecord,
} from '@/contracts/supabase';

import { getSupabaseClient } from './client';

export type HealthRecordInsert = Readonly<{
  completed_at: string | null;
  notes: string | null;
  provider_name: string | null;
  puppy_id: string;
  record_type: string;
  scheduled_for: string | null;
  source: 'template' | 'manual' | 'confirmed';
  status: string;
  title: string;
  updated_by: string;
}>;

export type HealthRecordUpdate = Readonly<{
  completed_at: string | null;
  id: string;
  notes: string | null;
  provider_name: string | null;
  puppy_id: string;
  record_type: string;
  scheduled_for: string | null;
  source: 'template' | 'manual' | 'confirmed';
  status: string;
  title: string;
  updated_at: string;
  updated_by: string;
}>;

export type HealthRecordDelete = Readonly<{
  deleted_at: string;
  id: string;
  puppy_id: string;
  updated_at: string;
  updated_by: string;
}>;

export type HealthRecordRestore = Readonly<{
  id: string;
  puppy_id: string;
  updated_at: string;
  updated_by: string;
}>;

export type SupabaseHealthRecordRepository = Readonly<{
  deleteHealthRecord(input: HealthRecordDelete): Promise<void>;
  insertHealthRecord(insert: HealthRecordInsert): Promise<HealthRecord>;
  listHealthRecords(input: Readonly<{ puppyId: string }>): Promise<readonly HealthRecord[]>;
  restoreHealthRecord(input: HealthRecordRestore): Promise<HealthRecord>;
  updateHealthRecord(update: HealthRecordUpdate): Promise<HealthRecord>;
}>;

export type HealthRecordClient = Readonly<{
  deleteHealthRecord(input: HealthRecordDelete): PromiseLike<Readonly<{
    count?: number | null;
    data: unknown;
    error: unknown;
  }>>;
  insertHealthRecord(insert: HealthRecordInsert): PromiseLike<Readonly<{
    data: unknown;
    error: unknown;
  }>>;
  listHealthRecords(input: Readonly<{ puppyId: string }>): PromiseLike<Readonly<{
    data: unknown;
    error: unknown;
  }>>;
  restoreHealthRecord(input: HealthRecordRestore): PromiseLike<Readonly<{
    data: unknown;
    error: unknown;
  }>>;
  updateHealthRecord(update: HealthRecordUpdate): PromiseLike<Readonly<{
    data: unknown;
    error: unknown;
  }>>;
}>;

export function createSupabaseHealthRecordRepository(
  client: HealthRecordClient = createDefaultHealthRecordClient(),
): SupabaseHealthRecordRepository {
  return {
    deleteHealthRecord: async (input) => {
      const response = await client.deleteHealthRecord(input);

      if (response.error || response.count === 0) {
        throw new Error('health_record_delete_failed');
      }
    },
    insertHealthRecord: async (insert) => {
      const response = await client.insertHealthRecord(insert);

      if (response.error) {
        throw new Error('health_record_insert_failed');
      }

      return healthRecordSchema.parse(response.data);
    },
    listHealthRecords: async (input) => {
      const response = await client.listHealthRecords(input);

      if (response.error) {
        throw new Error('health_record_list_failed');
      }

      return z.array(healthRecordSchema).parse(response.data);
    },
    restoreHealthRecord: async (input) => {
      const response = await client.restoreHealthRecord(input);

      if (response.error) {
        throw new Error('health_record_restore_failed');
      }

      return healthRecordSchema.parse(response.data);
    },
    updateHealthRecord: async (update) => {
      const response = await client.updateHealthRecord(update);

      if (response.error) {
        throw new Error('health_record_update_failed');
      }

      return healthRecordSchema.parse(response.data);
    },
  };
}

const healthRecordSelectColumns = [
  'id',
  'puppy_id',
  'record_type',
  'title',
  'status',
  'source',
  'scheduled_for',
  'completed_at',
  'provider_name',
  'notes',
  'version',
  'updated_by',
  'updated_at',
  'created_at',
  'deleted_at',
].join(',');

function createDefaultHealthRecordClient(): HealthRecordClient {
  return {
    deleteHealthRecord: ({ id, puppy_id, ...patch }) => getSupabaseClient()
      .from('health_record')
      .update(patch, { count: 'exact' })
      .eq('id', id)
      .eq('puppy_id', puppy_id)
      .is('deleted_at', null),
    insertHealthRecord: (insert) => getSupabaseClient()
      .from('health_record')
      .insert(insert)
      .select(healthRecordSelectColumns)
      .maybeSingle(),
    listHealthRecords: ({ puppyId }) => getSupabaseClient()
      .from('health_record')
      .select(healthRecordSelectColumns)
      .eq('puppy_id', puppyId)
      .is('deleted_at', null)
      .order('scheduled_for', { ascending: false, nullsFirst: false })
      .order('completed_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }),
    restoreHealthRecord: ({ id, puppy_id, ...input }) => getSupabaseClient()
      .from('health_record')
      .update({
        ...input,
        deleted_at: null,
      })
      .eq('id', id)
      .eq('puppy_id', puppy_id)
      .select(healthRecordSelectColumns)
      .maybeSingle(),
    updateHealthRecord: ({ id, puppy_id, ...patch }) => getSupabaseClient()
      .from('health_record')
      .update(patch)
      .eq('id', id)
      .eq('puppy_id', puppy_id)
      .is('deleted_at', null)
      .select(healthRecordSelectColumns)
      .maybeSingle(),
  };
}
