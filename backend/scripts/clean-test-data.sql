-- =====================================================
-- 数据库清理脚本
-- 目标：保留testuser(id=1)及其所有数据，删除其他用户数据
-- 保留：testuser的学习记录、视频任务、词书配置、打卡、成就等
-- 保留：基础词汇数据（words, meanings, example_pool）
-- 删除：仅删除其他用户及其关联数据
-- =====================================================

START TRANSACTION;

-- 1. 删除其他用户的视频生成任务（保留testuser的）
DELETE FROM video_generation_jobs WHERE user_id != 1;

-- 2. 删除其他用户的成就记录
DELETE FROM user_achievements WHERE user_id != 1;

-- 3. 删除其他用户的打卡记录
DELETE FROM daily_check_ins WHERE user_id != 1;

-- 4. 删除其他用户的生词本记录
DELETE FROM user_word_notebook WHERE user_id != 1;

-- 5. 删除其他用户的学习进度
DELETE FROM user_learning_progress WHERE user_id != 1;

-- 6. 删除其他用户的词书配置
DELETE FROM user_book_settings WHERE user_id != 1;

-- 7. 删除其他用户账户（CASCADE会自动处理外键关联）
DELETE FROM users WHERE id != 1;

-- 8. 显示清理结果统计
SELECT 
  '清理完成' AS status,
  (SELECT COUNT(*) FROM users) AS remaining_users,
  (SELECT COUNT(*) FROM user_learning_progress) AS remaining_learning_records,
  (SELECT COUNT(*) FROM daily_check_ins) AS remaining_checkins,
  (SELECT COUNT(*) FROM user_achievements) AS remaining_achievements,
  (SELECT COUNT(*) FROM video_generation_jobs) AS remaining_video_jobs,
  (SELECT COUNT(*) FROM words) AS total_words,
  (SELECT COUNT(*) FROM meanings) AS total_meanings,
  (SELECT COUNT(*) FROM example_pool) AS total_examples;

COMMIT;

-- =====================================================
-- 使用说明：
-- 方法1（从本地上传）：
--   scp backend/scripts/clean-test-data.sql root@119.29.112.71:/tmp/
--   然后执行：docker exec -i rg_mysql mysql -uroot -p123456 rg_vocabulary < /tmp/clean-test-data.sql
--
-- 方法2（通过Git）：
--   1. 先推送到Git：git add . && git commit -m "feat: add cleanup script" && git push origin dev
--   2. SSH登录云端：ssh root@119.29.112.71
--   3. 拉取代码：cd /root/RG_project && git pull origin dev
--   4. 执行脚本：docker exec -i rg_mysql mysql -uroot -p123456 rg_vocabulary < backend/scripts/clean-test-data.sql
--
-- 执行前检查：SELECT id, username FROM users;
-- 执行后验证：SELECT COUNT(*) as user_count FROM users; 应该显示1
-- =====================================================
