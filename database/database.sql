-- 社团证书管理系统数据库

-- 创建数据库
CREATE DATABASE IF NOT EXISTS certificate_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE certificate_db;

-- 角色表
CREATE TABLE IF NOT EXISTS role (
    Role_ID INT PRIMARY KEY AUTO_INCREMENT,
    Role_Name VARCHAR(50) NOT NULL UNIQUE,
    Description TEXT
);

-- 用户表
CREATE TABLE IF NOT EXISTS user (
    User_ID INT PRIMARY KEY AUTO_INCREMENT,
    Username VARCHAR(50) NOT NULL UNIQUE,
    Password VARCHAR(255) NOT NULL,
    Email VARCHAR(100),
    Student_ID VARCHAR(50),
    Role_ID INT,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Role_ID) REFERENCES role(Role_ID)
);

-- 证书表
CREATE TABLE IF NOT EXISTS certificate (
    Certificate_ID INT PRIMARY KEY AUTO_INCREMENT,
    Certificate_Number VARCHAR(100) NOT NULL UNIQUE,
    Student_Name VARCHAR(100) NOT NULL,
    Student_ID VARCHAR(50) NOT NULL,
    Certificate_Type VARCHAR(100),
    Organization VARCHAR(200),
    Issue_Date DATE,
    Description TEXT,
    Certificate_Hash VARCHAR(255),
    IPFS_Hash VARCHAR(255),
    Is_Valid BOOLEAN DEFAULT TRUE,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 插入初始角色数据
INSERT INTO role (Role_Name, Description) VALUES
('管理员', '系统管理员，拥有所有权限'),
('学生', '普通学生用户');

-- 证书规则表（定义证书规则，学生可以用积分兑换）
CREATE TABLE IF NOT EXISTS certificate_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rule_name VARCHAR(100) NOT NULL,
    description TEXT,
    photo VARCHAR(255),
    need_point INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户证书关联表（记录学生领取的证书）
CREATE TABLE IF NOT EXISTS user_certificate (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    certificate_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(User_ID),
    FOREIGN KEY (certificate_id) REFERENCES certificate_rules(id),
    UNIQUE KEY unique_user_certificate (user_id, certificate_id)
);

-- 积分事件记录表
CREATE TABLE IF NOT EXISTS points_event (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    points INT NOT NULL,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    consecutive_reward BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES user(User_ID)
);

-- 商品表（积分商城）
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price INT NOT NULL,
    image VARCHAR(255),
    sum INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 签到表
CREATE TABLE IF NOT EXISTS check_in (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    check_in_date DATE NOT NULL,
    consecutive_days INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(User_ID),
    UNIQUE KEY unique_user_date (user_id, check_in_date)
);

-- 修改用户表，添加积分和头像字段
ALTER TABLE user 
ADD COLUMN IF NOT EXISTS points INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS photo VARCHAR(255);

-- 插入测试用户（密码为123456的MD5值）
INSERT INTO user (Username, Password, Email, Student_ID, Role_ID, points) VALUES
('admin', 'e10adc3949ba59abbe56e057f20f883e', 'admin@example.com', NULL, 1, 0),
('student', 'e10adc3949ba59abbe56e057f20f883e', 'student@example.com', '2021001', 2, 100)
ON DUPLICATE KEY UPDATE points = VALUES(points);

