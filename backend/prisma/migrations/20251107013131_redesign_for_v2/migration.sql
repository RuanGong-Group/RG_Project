-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `current_book_tag_id` INTEGER NULL,
    `daily_learning_goal` INTEGER NOT NULL DEFAULT 10,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `last_login_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `words` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `word` VARCHAR(255) NOT NULL,
    `pronunciation` TEXT NULL,
    `lemma` VARCHAR(255) NULL,
    `lemma_id` INTEGER NULL,

    UNIQUE INDEX `words_word_key`(`word`),
    INDEX `words_word_idx`(`word`),
    INDEX `words_lemma_idx`(`lemma`),
    INDEX `words_lemma_id_idx`(`lemma_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meanings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `word_id` INTEGER NOT NULL,
    `part_of_speech` VARCHAR(50) NOT NULL,
    `definition` TEXT NOT NULL,
    `extra` JSON NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `meanings_word_id_idx`(`word_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `example_pool` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sentence` TEXT NOT NULL,
    `source_type` VARCHAR(50) NOT NULL,
    `source_detail` VARCHAR(255) NULL,
    `embedding` LONGBLOB NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `example_pool_source_type_idx`(`source_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meaning_example_relation` (
    `meaning_id` INTEGER NOT NULL,
    `example_id` INTEGER NOT NULL,
    `highlight_word` VARCHAR(255) NULL,
    `order_in_meaning` INTEGER NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,

    INDEX `meaning_example_relation_meaning_id_idx`(`meaning_id`),
    INDEX `meaning_example_relation_example_id_idx`(`example_id`),
    PRIMARY KEY (`meaning_id`, `example_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `book_tags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tag_name` VARCHAR(255) NOT NULL,
    `is_user_defined` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `book_tags_tag_name_key`(`tag_name`),
    INDEX `book_tags_tag_name_idx`(`tag_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `word_tag_relations` (
    `word_id` INTEGER NOT NULL,
    `book_tag_id` INTEGER NOT NULL,
    `mastery_focus` VARCHAR(50) NOT NULL,

    INDEX `word_tag_relations_word_id_idx`(`word_id`),
    INDEX `word_tag_relations_book_tag_id_idx`(`book_tag_id`),
    PRIMARY KEY (`word_id`, `book_tag_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_learning_progress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `meaning_id` INTEGER NOT NULL,
    `mastery_level` INTEGER NOT NULL DEFAULT 0,
    `easiness_factor` DOUBLE NOT NULL DEFAULT 2.5,
    `interval` INTEGER NOT NULL DEFAULT 0,
    `repetitions` INTEGER NOT NULL DEFAULT 0,
    `last_review_at` TIMESTAMP(0) NULL,
    `next_review_at` TIMESTAMP(0) NOT NULL,
    `review_count` INTEGER NOT NULL DEFAULT 0,
    `consecutive_correct` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `user_learning_progress_user_id_idx`(`user_id`),
    INDEX `user_learning_progress_meaning_id_idx`(`meaning_id`),
    INDEX `user_learning_progress_next_review_at_idx`(`next_review_at`),
    UNIQUE INDEX `user_learning_progress_user_id_meaning_id_key`(`user_id`, `meaning_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_word_notebook` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `word_id` INTEGER NOT NULL,
    `added_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `user_word_notebook_user_id_idx`(`user_id`),
    INDEX `user_word_notebook_word_id_idx`(`word_id`),
    UNIQUE INDEX `user_word_notebook_user_id_word_id_key`(`user_id`, `word_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_check_ins` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `check_in_date` DATE NOT NULL,
    `words_learned` INTEGER NOT NULL DEFAULT 0,
    `words_reviewed` INTEGER NOT NULL DEFAULT 0,
    `meanings_learned` INTEGER NOT NULL DEFAULT 0,
    `meanings_reviewed` INTEGER NOT NULL DEFAULT 0,
    `daily_goal` INTEGER NOT NULL DEFAULT 10,
    `goal_completed` BOOLEAN NOT NULL DEFAULT false,
    `consecutive_days` INTEGER NOT NULL DEFAULT 0,

    INDEX `daily_check_ins_user_id_idx`(`user_id`),
    INDEX `daily_check_ins_check_in_date_idx`(`check_in_date`),
    UNIQUE INDEX `daily_check_ins_user_id_check_in_date_key`(`user_id`, `check_in_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_achievements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `achievement_name` VARCHAR(255) NOT NULL,
    `awarded_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `user_achievements_user_id_idx`(`user_id`),
    UNIQUE INDEX `user_achievements_user_id_achievement_name_key`(`user_id`, `achievement_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_current_book_tag_id_fkey` FOREIGN KEY (`current_book_tag_id`) REFERENCES `book_tags`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `words` ADD CONSTRAINT `words_lemma_id_fkey` FOREIGN KEY (`lemma_id`) REFERENCES `words`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `meanings` ADD CONSTRAINT `meanings_word_id_fkey` FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meaning_example_relation` ADD CONSTRAINT `meaning_example_relation_meaning_id_fkey` FOREIGN KEY (`meaning_id`) REFERENCES `meanings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meaning_example_relation` ADD CONSTRAINT `meaning_example_relation_example_id_fkey` FOREIGN KEY (`example_id`) REFERENCES `example_pool`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `word_tag_relations` ADD CONSTRAINT `word_tag_relations_word_id_fkey` FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `word_tag_relations` ADD CONSTRAINT `word_tag_relations_book_tag_id_fkey` FOREIGN KEY (`book_tag_id`) REFERENCES `book_tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_learning_progress` ADD CONSTRAINT `user_learning_progress_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_learning_progress` ADD CONSTRAINT `user_learning_progress_meaning_id_fkey` FOREIGN KEY (`meaning_id`) REFERENCES `meanings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_word_notebook` ADD CONSTRAINT `user_word_notebook_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_word_notebook` ADD CONSTRAINT `user_word_notebook_word_id_fkey` FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_check_ins` ADD CONSTRAINT `daily_check_ins_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_achievements` ADD CONSTRAINT `user_achievements_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
