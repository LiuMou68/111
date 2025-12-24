-- 为 certificates 表添加 NFT 相关字段
-- 执行前请备份数据库

-- 检查并添加 wallet_address 字段
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42) NULL COMMENT 'MetaMask 钱包地址';

-- 检查并添加 token_id 字段
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS token_id BIGINT NULL COMMENT 'NFT Token ID（链上唯一标识）';

-- 检查并添加 metadata_cid 字段
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS metadata_cid VARCHAR(255) NULL COMMENT 'IPFS Metadata CID（metadata.json 的 IPFS Hash）';

-- 检查并添加 file_cid 字段（如果不存在）
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS file_cid VARCHAR(255) NULL COMMENT 'IPFS File CID（证书文件的 IPFS Hash）';

-- 检查并添加 tx_hash 字段（如果不存在）
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66) NULL COMMENT '区块链交易哈希';

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_wallet_address ON certificates(wallet_address);
CREATE INDEX IF NOT EXISTS idx_token_id ON certificates(token_id);
CREATE INDEX IF NOT EXISTS idx_metadata_cid ON certificates(metadata_cid);
CREATE INDEX IF NOT EXISTS idx_tx_hash ON certificates(tx_hash);

-- 添加唯一约束：token_id 必须唯一（如果已存在则忽略）
-- ALTER TABLE certificates ADD UNIQUE INDEX IF NOT EXISTS uk_token_id (token_id);

-- 添加外键约束（可选，如果需要）
-- ALTER TABLE certificates 
-- ADD CONSTRAINT fk_certificates_user 
-- FOREIGN KEY (user_id) REFERENCES user(User_ID) ON DELETE CASCADE;

-- 更新现有记录的说明（如果有）
-- UPDATE certificates 
-- SET wallet_address = NULL, token_id = NULL, metadata_cid = NULL 
-- WHERE wallet_address IS NULL AND token_id IS NULL;

-- 显示表结构
DESCRIBE certificates;

