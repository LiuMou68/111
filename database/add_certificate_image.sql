-- 为证书表添加图片字段
USE certificate_db;

-- 检查 Image 字段是否存在，如果不存在则添加
SET @dbname = DATABASE();
SET @tablename = 'certificate';
SET @columnname = 'Image';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(500) COMMENT ''证书图片URL或IPFS哈希''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 如果证书规则有图片，将规则图片复制到已存在的证书中（可选）
UPDATE certificate c
INNER JOIN user_certificate uc ON c.Certificate_ID = uc.certificate_id
INNER JOIN certificate_rules cr ON uc.certificate_id = cr.id
SET c.Image = cr.photo
WHERE c.Image IS NULL AND cr.photo IS NOT NULL;

