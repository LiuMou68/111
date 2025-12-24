# 数据库文件说明

## 文件位置

数据库初始化SQL文件位于：`database/database.sql`

## 使用方法

### 方法一：命令行导入

```bash
mysql -u root -p < database/database.sql
```

### 方法二：MySQL命令行

```sql
source database/database.sql
```

或者：

```sql
mysql -u root -p
CREATE DATABASE certificate_db;
USE certificate_db;
source database/database.sql;
```

### 方法三：使用MySQL客户端工具

1. 打开 MySQL Workbench、Navicat 或其他 MySQL 客户端工具
2. 连接到 MySQL 服务器
3. 打开 `database/database.sql` 文件
4. 执行 SQL 脚本

## 数据库结构

数据库包含以下表：

1. **role** - 角色表
   - Role_ID: 角色ID（主键）
   - Role_Name: 角色名称
   - Description: 角色描述

2. **user** - 用户表
   - User_ID: 用户ID（主键）
   - Username: 用户名
   - Password: 密码（MD5加密）
   - Email: 邮箱
   - Student_ID: 学号
   - Role_ID: 角色ID（外键）

3. **certificate** - 证书表
   - Certificate_ID: 证书ID（主键）
   - Certificate_Number: 证书编号
   - Student_Name: 学生姓名
   - Student_ID: 学号
   - Certificate_Type: 证书类型
   - Organization: 颁发机构
   - Issue_Date: 颁发日期
   - Description: 证书描述
   - Certificate_Hash: 证书哈希值
   - IPFS_Hash: IPFS哈希值
   - Is_Valid: 是否有效
   - Created_At: 创建时间
   - Updated_At: 更新时间

## 默认测试账号

数据库初始化后会创建以下测试账号：

- **管理员账号**
  - 用户名: `admin`
  - 密码: `123456`
  - 角色: 管理员

- **学生账号**
  - 用户名: `student`
  - 密码: `123456`
  - 角色: 学生
  - 学号: `2021001`

## 注意事项

1. 确保 MySQL 服务已启动
2. 确保有创建数据库的权限
3. 密码使用 MD5 加密存储
4. 数据库字符集为 utf8mb4，支持中文和 emoji

