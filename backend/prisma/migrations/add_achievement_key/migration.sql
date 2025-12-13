-- Migration: Add achievement_key column and update constraints
-- Purpose: Replace achievement_name with achievement_key for better achievement management

-- 1. Add new column achievement_key
ALTER TABLE `user_achievements` ADD COLUMN `achievement_key` VARCHAR(50) NOT NULL AFTER `user_id`;

-- 2. Migrate old data (if any exists)
-- Convert existing achievement_name to achievement_key (lowercase, replace spaces with underscores)
UPDATE `user_achievements` 
SET `achievement_key` = LOWER(REPLACE(`achievement_name`, ' ', '_'))
WHERE `achievement_key` = '';

-- 3. Drop old unique constraint
ALTER TABLE `user_achievements` DROP INDEX `user_achievements_userId_achievementName_key`;

-- 4. Drop old column
ALTER TABLE `user_achievements` DROP COLUMN `achievement_name`;

-- 5. Add new unique constraint
ALTER TABLE `user_achievements` ADD UNIQUE KEY `user_achievements_userId_achievementKey_key` (`user_id`, `achievement_key`);
