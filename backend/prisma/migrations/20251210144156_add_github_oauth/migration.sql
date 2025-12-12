-- AlterTable
ALTER TABLE `users` 
  ADD COLUMN `github_id` VARCHAR(255) NULL AFTER `password_hash`,
  MODIFY `password_hash` VARCHAR(255) NULL,
  ADD UNIQUE INDEX `users_github_id_key`(`github_id`);
