import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration = readFileSync(
  new URL(
    '../../../../supabase/migrations/20260725164901_creation_hub_canonical_contents.sql',
    import.meta.url,
  ),
  'utf8',
);

const constraintDrop = migration.indexOf('DROP CONSTRAINT IF EXISTS contents_status_allowed_check');
const legacyStatusUpdate = migration.indexOf("SET status = 'Produção'");
assert.ok(constraintDrop >= 0);
assert.ok(legacyStatusUpdate > constraintDrop);

for (const requiredFragment of [
  'ADD COLUMN IF NOT EXISTS archived_at timestamptz',
  'ADD COLUMN IF NOT EXISTS legacy_idea_id text',
  'idx_contents_user_legacy_idea_unique',
  'idx_contents_user_status_updated_active',
  'idx_contents_user_origin_updated_active',
  'ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY',
  'CREATE POLICY contents_select_own',
  'CREATE POLICY contents_insert_own',
  'CREATE POLICY contents_update_own',
  'CREATE POLICY contents_delete_own',
  'WITH CHECK ((SELECT auth.uid()) = user_id)',
  'legacy idea has no canonical content',
  'duplicate legacy idea lineage detected',
  'contents status constraint is not validated',
]) {
  assert.ok(
    migration.includes(requiredFragment),
    `migration must include: ${requiredFragment}`,
  );
}

assert.equal(
  migration.includes('DROP TABLE public.ideas'),
  false,
  'legacy ideas must remain available for rollback',
);

console.log('creationMigrationContract.test.ts passed');
