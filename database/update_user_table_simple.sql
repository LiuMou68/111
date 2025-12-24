-- 简单的更新脚本（如果字段已存在会报错，但可以忽略）
-- 使用方法：mysql -u root -p certificate_db < update_user_table_simple.sql

USE certificate_db;

-- 添加积分字段
ALTER TABLE user ADD COLUMN points INT DEFAULT 0;

-- 添加头像字段
ALTER TABLE user ADD COLUMN photo VARCHAR(255);

