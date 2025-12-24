# 社团证书管理系统

基于区块链技术的证书管理平台，提供透明、安全、不可篡改的证书颁发和管理服务。

## 快速开始

### 1. 安装依赖
```bash
npm install
```
如果安装慢：`npm config set registry https://registry.npmmirror.com`

### 2. 配置环境变量
创建 `.env` 文件（参考 `.env.example`），至少配置：
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=certificate_db
PORT=3001
VITE_API_BASE_URL=http://localhost:3001
```

### 3. 初始化数据库
```bash
npm run init:db
```
或手动执行: `mysql -u root -p < database/database.sql`

**如果遇到 "Unknown column 'photo'" 错误**：

**Windows PowerShell 用户**：
```powershell
# 方法1：使用PowerShell脚本（推荐）
cd "Membership Certificate Management System"
.\database\update_database.ps1

# 方法2：使用Get-Content管道
Get-Content database\update_user_table_simple.sql | mysql -u root -p certificate_db

# 方法3：使用cmd执行
cmd /c "mysql -u root -p certificate_db < database\update_user_table_simple.sql"
```

**MySQL客户端用户**：
1. 打开 MySQL Workbench 或其他客户端
2. 连接到数据库 `certificate_db`
3. 执行 `database/update_user_table_simple.sql` 文件中的 SQL 语句

### 4. 启动项目
```bash
npm run start:all:win    # Windows一键启动
# 或分别启动
npm run start:backend    # 终端1
npm run start:frontend   # 终端2
```

### 5. 部署活动管理系统（新功能）

#### 方式一：一键部署（推荐）
```bash
# Windows
一键部署活动系统.bat

# 或使用npm命令
npm run deploy:all
```

#### 方式二：分步部署
```bash
# 1. 更新数据库（推荐使用批处理文件，避免编码问题）
npm run update:database

# 如果批处理文件有问题，可以使用PowerShell版本
npm run update:database:ps1

# 2. 编译合约
npx hardhat compile

# 3. 启动Hardhat节点（新终端）
npm run start:blockchain

# 4. 部署合约（另一个终端）
npm run deploy:points-certificate

# 5. 配置环境变量
npm run setup:blockchain-env
```

详细部署指南请查看 `DEPLOYMENT_GUIDE.md`

### 6. 生成示例证书（可选）
```bash
npm run generate:samples
```
这将生成8个示例证书，可用于测试验证功能。

### 7. 访问应用
- 前端: http://localhost:5173
- 后端: http://localhost:3001
- 证书验证: http://localhost:5173/verify

**测试账号**: 
- 管理员 `admin/123456`
- 活动管理员 `activity_admin/123456`（部署后可用）
- 学生 `student/123456`

**示例证书验证**: 
- http://localhost:5173/verify/CERT-2024-001
- http://localhost:5173/verify/CERT-2024-002

## 常用命令

```bash
npm run start:all:win    # 启动所有服务
npm run start:backend    # 启动后端
npm run start:frontend   # 启动前端
npm run dev              # 开发模式
npm run build            # 构建生产版本
npm run stop             # 关闭所有服务
npm run generate:samples # 生成示例证书数据
```

## 证书功能使用

### 📋 证书验证
- **公开验证页面**: 访问 `http://localhost:5173/verify`
- **直接验证**: 访问 `http://localhost:5173/verify/证书编号`


### 📥 证书导出
- **PDF导出**: 在证书详情页点击"下载PDF"按钮
- **图片导出**: 在证书详情页点击"下载图片"按钮
- **证书格式**: 1200x800像素，适合打印

### 🎨 生成示例证书
运行以下命令生成8个示例证书：
```bash
npm run generate:samples
```

生成的证书包括：
- CERT-2024-001: 优秀社员证书（张三）
- CERT-2024-002: 活动参与证书（李四）
- CERT-2024-003: 优秀干部证书（王五）
- CERT-2024-004: 志愿服务证书（赵六）
- CERT-2024-005: 学术竞赛证书（孙七）
- CERT-2024-006: 体育竞赛证书（周八）
- CERT-2024-007: 创新创业证书（吴九）
- CERT-2024-008: 社会实践证书（郑十）

### 🖼️ 证书图片生成工具
打开 `scripts/generate-certificate-images.html` 在浏览器中可批量生成证书图片。

## 工具脚本

- `关闭服务.bat` - 关闭所有服务
- `快速修复.bat` - 快速修复依赖和端口问题（推荐）
- `一键修复.bat` - 完整修复（包含详细输出）

**遇到问题？**
- **Rollup错误（中文路径）**: 
  - **推荐方案**: 运行 `npm run move:project` 将项目迁移到新位置
  - 或手动移动项目到没有中文的路径（如 `C:\Projects\certificate-system`）
- 数据库未初始化: 运行 `npm run init:db`
- 端口占用: 运行 `npm run fix:port`
- 其他问题: 运行 `快速修复.bat`

## 核心功能

### ✨ 已实现功能
- ✅ **证书验证系统** - 公开查询证书真伪，支持二维码验证
- ✅ **证书导出** - PDF和图片格式导出
- ✅ **证书管理** - 发布、管理、查看证书
- ✅ **积分系统** - 签到、积分记录、排行榜
- ✅ **证书领取** - 学生用积分兑换证书
- ✅ **个人中心** - 头像上传、密码修改

### 📋 功能详情
- **证书验证**: 访问 `/verify` 或 `/verify/:证书编号` 可公开验证证书
- **证书导出**: 支持PDF和PNG格式下载
- **二维码**: 每个证书都有唯一二维码，扫码即可验证

## 技术栈

- 前端: React + Vite
- 后端: Express + MySQL
- 区块链: Ethereum (Web3.js) + Hardhat
- 存储: IPFS (Pinata)
- 证书生成: HTML2Canvas + jsPDF
- 二维码: qrcode.react

## 环境要求

- Node.js >= 16.0.0
- MySQL
- MetaMask（浏览器插件）
