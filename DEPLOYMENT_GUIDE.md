# 部署指南 - 活动管理系统

## 📋 部署步骤

### 方式一：一键部署（推荐）

```bash
# Windows
一键部署活动系统.bat

# 或手动执行
npm run deploy:all
```

### 方式二：分步部署

#### 步骤 1: 更新数据库

```bash
# Windows PowerShell
npm run update:database

# 或手动执行
powershell -ExecutionPolicy Bypass -File scripts\update-database.ps1
```

**或者使用MySQL命令行**：
```bash
mysql -u root -p certificate_db < database/add_activity_system.sql
```

#### 步骤 2: 编译智能合约

```bash
npx hardhat compile
```

#### 步骤 3: 启动Hardhat节点

```bash
# 在一个终端窗口运行
npm run start:blockchain
```

**保持此终端运行！**

#### 步骤 4: 部署智能合约

在另一个终端窗口运行：

```bash
npm run deploy:points-certificate
```

**重要**：复制输出的合约地址和管理员地址！

#### 步骤 5: 配置环境变量

```bash
npm run setup:blockchain-env
```

**或者手动编辑 `.env` 文件**，添加：

```env
# 区块链配置
RPC_URL=http://localhost:8545
CONTRACT_ADDRESS=0x你的合约地址
ADMIN_WALLET_ADDRESS=0x管理员钱包地址
ADMIN_WALLET_PRIVATE_KEY=管理员私钥（不含0x前缀）

# IPFS配置（如果还没有）
PINATA_API_KEY=你的Pinata API密钥
PINATA_SECRET_API_KEY=你的Pinata密钥
```

#### 步骤 6: 启动服务

```bash
# 启动后端（新终端）
npm run start:backend

# 启动前端（新终端）
npm run start:frontend
```

## 🔍 验证部署

### 1. 检查数据库

```sql
USE certificate_db;

-- 检查表是否存在
SHOW TABLES LIKE 'activity%';
SHOW TABLES LIKE 'points_blockchain';
SHOW TABLES LIKE 'certificate_blockchain';
SHOW TABLES LIKE 'user_wallet';

-- 检查活动管理员角色
SELECT * FROM role WHERE Role_Name = '活动管理员';

-- 检查活动管理员账号
SELECT u.*, r.Role_Name 
FROM user u 
JOIN role r ON u.Role_ID = r.Role_ID 
WHERE u.Username = 'activity_admin';
```

### 2. 检查合约部署

访问 Hardhat 节点终端，应该能看到：
- 合约部署交易
- 合约地址
- Gas使用情况

### 3. 检查环境变量

```bash
# 检查.env文件
cat .env | grep -E "CONTRACT_ADDRESS|ADMIN_WALLET|RPC_URL"
```

### 4. 测试登录

- **活动管理员**: `activity_admin / 123456`
- **管理员**: `admin / 123456`
- **学生**: `student / 123456`

## ⚠️ 常见问题

### 问题1: 数据库更新失败

**错误**: `Table 'activity' already exists`

**解决**: 表已存在，可以忽略或先删除表：
```sql
DROP TABLE IF EXISTS activity_participation;
DROP TABLE IF EXISTS activity;
DROP TABLE IF EXISTS points_blockchain;
DROP TABLE IF EXISTS certificate_blockchain;
DROP TABLE IF EXISTS user_wallet;
```

### 问题2: 合约编译失败

**错误**: `Compilation failed`

**解决**:
1. 检查 Solidity 版本是否匹配
2. 运行 `npm install` 重新安装依赖
3. 检查 `hardhat.config.js` 配置

### 问题3: 合约部署失败

**错误**: `Network localhost not found`

**解决**:
1. 确保 Hardhat 节点正在运行
2. 检查端口 8545 是否被占用
3. 检查 `hardhat.config.js` 中的网络配置

### 问题4: MetaMask连接失败

**错误**: `Network not found`

**解决**:
1. 在 MetaMask 中添加 Hardhat 本地网络：
   - 网络名称: Hardhat Local
   - RPC URL: http://localhost:8545
   - Chain ID: 31337
   - 货币符号: ETH

2. 或使用 MetaMask 的"添加网络"功能

## 📝 部署后检查清单

- [ ] 数据库表已创建
- [ ] 活动管理员角色已添加
- [ ] 活动管理员账号已创建
- [ ] 智能合约已编译
- [ ] 智能合约已部署
- [ ] 合约地址已保存到 `.env`
- [ ] 管理员钱包地址已保存到 `.env`
- [ ] 管理员私钥已保存到 `.env`（可选，用于后端自动上链）
- [ ] Hardhat 节点正在运行
- [ ] 后端服务可以启动
- [ ] 前端服务可以启动
- [ ] 可以登录活动管理员账号
- [ ] 可以发布活动
- [ ] 学生可以参与活动
- [ ] MetaMask 可以连接

## 🎯 下一步

部署完成后，可以：

1. **测试活动管理**
   - 登录活动管理员账号
   - 发布一个测试活动
   - 学生参与活动
   - 结束活动并发放积分

2. **测试钱包连接**
   - 学生登录
   - 连接 MetaMask 钱包
   - 绑定钱包地址

3. **测试积分上链**
   - 参与活动
   - 活动管理员结束活动
   - 检查积分是否上链

4. **测试证书上链**
   - 用积分兑换证书
   - 检查证书是否上链
   - 验证证书唯一性

## 📚 相关文档

- `IMPLEMENTATION_GUIDE.md` - 实现指南
- `ACTIVITY_SYSTEM_COMPLETE.md` - 完整功能总结
- `README.md` - 项目说明

