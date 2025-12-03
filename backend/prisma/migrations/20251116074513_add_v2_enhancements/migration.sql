/*
  Warnings:

  - A unique constraint covering the columns `[sentence]` on the table `example_pool` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `words` DROP FOREIGN KEY `words_lemma_id_fkey`;

-- AlterTable
ALTER TABLE `example_pool` ADD COLUMN `confidence_score` DOUBLE NULL,
    ADD COLUMN `difficulty` VARCHAR(50) NULL;

-- CreateTable
CREATE TABLE `user_book_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `book_tag_id` INTEGER NOT NULL,
    `stable_shuffle_salt` VARCHAR(64) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `user_book_settings_user_id_idx`(`user_id`),
    INDEX `user_book_settings_book_tag_id_idx`(`book_tag_id`),
    UNIQUE INDEX `user_book_settings_user_id_book_tag_id_key`(`user_id`, `book_tag_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `example_pool_difficulty_idx` ON `example_pool`(`difficulty`);

-- CreateIndex
CREATE UNIQUE INDEX `example_pool_sentence_key` ON `example_pool`(`sentence`(500));

-- CreateIndex
CREATE INDEX `meanings_part_of_speech_idx` ON `meanings`(`part_of_speech`);

-- AddForeignKey
ALTER TABLE `words` ADD CONSTRAINT `words_lemma_id_fkey` FOREIGN KEY (`lemma_id`) REFERENCES `words`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_book_settings` ADD CONSTRAINT `user_book_settings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_book_settings` ADD CONSTRAINT `user_book_settings_book_tag_id_fkey` FOREIGN KEY (`book_tag_id`) REFERENCES `book_tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
