-- 更新用户表，添加缺失的字段
-- 如果字段已存在，这些语句会报错但不会影响其他字段的添加

USE certificate_db;

-- 添加积分字段（如果不存在）
ALTER TABLE user 
ADD COLUMN IF NOT EXISTS points INT DEFAULT 0;

-- 添加头像字段（如果不存在）
ALTER TABLE user 
ADD COLUMN IF NOT EXISTS photo VARCHAR(255);

-- 如果上面的 IF NOT EXISTS 不支持，使用以下方式：
-- 先检查字段是否存在，如果不存在则添加

-- 检查并添加 points 字段
SET @dbname = DATABASE();
SET @tablename = 'user';
SET @columnname = 'points';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT DEFAULT 0')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 检查并添加 photo 字段
SET @columnname = 'photo';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(255)')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

