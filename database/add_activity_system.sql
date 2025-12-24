-- 添加活动管理系统相关表

USE certificate_db;

-- 1. 添加活动管理员角色
INSERT INTO role (Role_Name, Description) VALUES
('活动管理员', '负责发布和管理活动，活动结束后发放积分')
ON DUPLICATE KEY UPDATE Description = VALUES(Description);

-- 2. 创建活动表
CREATE TABLE IF NOT EXISTS activity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    location VARCHAR(200),
    max_participants INT DEFAULT 0,
    points_reward INT DEFAULT 0,
    image VARCHAR(255),
    ipfs_hash VARCHAR(255),
    status ENUM('draft', 'published', 'ongoing', 'ended', 'cancelled') DEFAULT 'draft',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES user(User_ID)
);

-- 3. 活动参与表
CREATE TABLE IF NOT EXISTS activity_participation (
    id INT PRIMARY KEY AUTO_INCREMENT,
    activity_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    points_awarded INT DEFAULT 0,
    points_awarded_at TIMESTAMP NULL,
    blockchain_tx_hash VARCHAR(255),
    ipfs_hash VARCHAR(255),
    status ENUM('joined', 'completed', 'awarded') DEFAULT 'joined',
    FOREIGN KEY (activity_id) REFERENCES activity(id),
    FOREIGN KEY (user_id) REFERENCES user(User_ID),
    UNIQUE KEY unique_activity_user (activity_id, user_id)
);

-- 4. 积分上链记录表
CREATE TABLE IF NOT EXISTS points_blockchain (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    points INT NOT NULL,
    source_type ENUM('activity', 'checkin', 'manual') NOT NULL,
    source_id INT,
    blockchain_tx_hash VARCHAR(255) NOT NULL,
    ipfs_hash VARCHAR(255),
    block_number BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(User_ID)
);

-- 5. 证书上链记录表（确保证书唯一性）
CREATE TABLE IF NOT EXISTS certificate_blockchain (
    id INT PRIMARY KEY AUTO_INCREMENT,
    certificate_id INT NOT NULL,
    certificate_number VARCHAR(100) NOT NULL UNIQUE,
    blockchain_tx_hash VARCHAR(255) NOT NULL,
    ipfs_hash VARCHAR(255) NOT NULL,
    block_number BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (certificate_id) REFERENCES certificate(Certificate_ID),
    UNIQUE KEY unique_certificate_number (certificate_number)
);

-- 6. 用户钱包地址表（关联MetaMask地址）
CREATE TABLE IF NOT EXISTS user_wallet (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    wallet_address VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(User_ID)
);

-- 7. 添加活动管理员测试账号
INSERT INTO user (Username, Password, Email, Student_ID, Role_ID) VALUES
('activity_admin', 'e10adc3949ba59abbe56e057f20f883e', 'activity@example.com', NULL, 
 (SELECT Role_ID FROM role WHERE Role_Name = '活动管理员' LIMIT 1))
ON DUPLICATE KEY UPDATE Role_ID = (SELECT Role_ID FROM role WHERE Role_Name = '活动管理员' LIMIT 1);

