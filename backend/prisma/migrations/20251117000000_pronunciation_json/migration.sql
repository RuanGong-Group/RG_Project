-- Migration: pronunciation_json
-- Generated: 2025-11-17
-- Purpose: convert `words.pronunciation` from TEXT to JSON safely

/* IMPORTANT:
   1) Run this migration on a test DB first and verify results.
   2) Backup the production DB before applying.
   3) MySQL must be >= 5.7 to support JSON type.
*/

-- Add a temporary JSON column
ALTER TABLE `words` ADD COLUMN `pronunciation_tmp` JSON NULL;

-- Copy rows where the existing value is valid JSON
UPDATE `words`
SET `pronunciation_tmp` = CAST(`pronunciation` AS JSON)
WHERE JSON_VALID(`pronunciation`);

-- For rows where the existing value is not valid JSON (or empty), set a safe default
UPDATE `words`
SET `pronunciation_tmp` = JSON_OBJECT('uk', '', 'us', '')
WHERE NOT JSON_VALID(`pronunciation`) OR `pronunciation` IS NULL OR `pronunciation` = '';

-- Optional: review mismatches (run manually before dropping)
-- SELECT id, pronunciation FROM words WHERE NOT JSON_VALID(pronunciation) LIMIT 50;

-- Drop the old column and rename the temporary column
ALTER TABLE `words` DROP COLUMN `pronunciation`;
ALTER TABLE `words` CHANGE COLUMN `pronunciation_tmp` `pronunciation` JSON NULL;

-- End of migration
