/*
  Warnings:

  - You are about to drop the column `confidence_score` on the `example_pool` table. All the data in the column will be lost.
  - You are about to drop the column `difficulty` on the `example_pool` table. All the data in the column will be lost.
  - You are about to drop the column `stable_shuffle_salt` on the `user_book_settings` table. All the data in the column will be lost.
  - Added the required column `salt` to the `user_book_settings` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `words` DROP FOREIGN KEY `words_lemma_id_fkey`;

-- DropIndex
DROP INDEX `example_pool_difficulty_idx` ON `example_pool`;

-- DropIndex
DROP INDEX `example_pool_sentence_key` ON `example_pool`;

-- DropIndex
DROP INDEX `meanings_part_of_speech_idx` ON `meanings`;

-- AlterTable
ALTER TABLE `example_pool` DROP COLUMN `confidence_score`,
    DROP COLUMN `difficulty`;

-- AlterTable
ALTER TABLE `user_book_settings` DROP COLUMN `stable_shuffle_salt`,
    ADD COLUMN `preferences` JSON NULL,
    ADD COLUMN `salt` VARCHAR(255) NOT NULL,
    ADD COLUMN `shuffle_algorithm` VARCHAR(50) NOT NULL DEFAULT 'stable_hash';

-- AddForeignKey
ALTER TABLE `words` ADD CONSTRAINT `words_lemma_id_fkey` FOREIGN KEY (`lemma_id`) REFERENCES `words`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
