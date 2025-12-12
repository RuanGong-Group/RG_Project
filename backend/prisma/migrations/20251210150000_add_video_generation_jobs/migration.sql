-- CreateTable
CREATE TABLE `video_generation_jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `job_id` VARCHAR(255) NOT NULL,
    `video_type` VARCHAR(50) NOT NULL,
    `word_ids` JSON NOT NULL,
    `template_type` VARCHAR(50) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `progress` INTEGER NOT NULL DEFAULT 0,
    `error_message` TEXT NULL,
    `video_path` VARCHAR(500) NULL,
    `video_url` VARCHAR(500) NULL,
    `duration` DOUBLE NULL,
    `scenes` JSON NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `completed_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `video_generation_jobs_job_id_key`(`job_id`),
    INDEX `video_generation_jobs_user_id_idx`(`user_id`),
    INDEX `video_generation_jobs_job_id_idx`(`job_id`),
    INDEX `video_generation_jobs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `video_generation_jobs` ADD CONSTRAINT `video_generation_jobs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
