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

export type SupabaseHealthRecordRepository = Readonly<{
  insertHealthRecord(insert: HealthRecordInsert): Promise<HealthRecord>;
  listHealthRecords(input: Readonly<{ puppyId: string }>): Promise<readonly HealthRecord[]>;
}>;

export type HealthRecordClient = Readonly<{
  insertHealthRecord(insert: HealthRecordInsert): PromiseLike<Readonly<{
    data: unknown;
    error: unknown;
  }>>;
  listHealthRecords(input: Readonly<{ puppyId: string }>): PromiseLike<Readonly<{
    data: unknown;
    error: unknown;
  }>>;
}>;

export function createSupabaseHealthRecordRepository(
  client: HealthRecordClient = createDefaultHealthRecordClient(),
): SupabaseHealthRecordRepository {
  return {
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
  };
}
