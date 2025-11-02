-- Manual Database Migration Script
-- Date: 2025-10-28
-- Purpose: Add user learning goals and refactor check-in system

USE vocabulary_db;

-- =============================================
-- 1. Modify users table: Add daily learning goal field
-- =============================================

ALTER TABLE `users` 
ADD COLUMN `daily_learning_goal` INT NOT NULL DEFAULT 10 
AFTER `current_book_tag_id`;

-- =============================================
-- 2. Modify daily_check_ins table: Refactor check-in statistics
-- =============================================

-- 2.1 Add new fields (meaning-level internal statistics)
ALTER TABLE `daily_check_ins` 
ADD COLUMN `meanings_learned` INT NOT NULL DEFAULT 0 
AFTER `words_reviewed`;

ALTER TABLE `daily_check_ins` 
ADD COLUMN `meanings_reviewed` INT NOT NULL DEFAULT 0 
AFTER `meanings_learned`;

-- 2.2 Add goal management fields
ALTER TABLE `daily_check_ins` 
ADD COLUMN `daily_goal` INT NOT NULL DEFAULT 10 
AFTER `meanings_reviewed`;

ALTER TABLE `daily_check_ins` 
ADD COLUMN `goal_completed` BOOLEAN NOT NULL DEFAULT FALSE 
AFTER `daily_goal`;

-- =============================================
-- 3. Data migration: Map existing data to new fields
-- =============================================

UPDATE `daily_check_ins` 
SET 
  `meanings_learned` = `words_learned`,
  `meanings_reviewed` = `words_reviewed`,
  `daily_goal` = 10,
  `goal_completed` = (`words_learned` >= 10);

-- =============================================
-- 4. Verify data
-- =============================================

SELECT 'Users table structure:' as '';
DESCRIBE `users`;

SELECT 'Daily check-ins table structure:' as '';
DESCRIBE `daily_check_ins`;

SELECT 'Sample users data:' as '';
SELECT * FROM `users` LIMIT 5;

SELECT 'Sample check-ins data:' as '';
SELECT * FROM `daily_check_ins` LIMIT 5;
