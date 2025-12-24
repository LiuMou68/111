import express from 'express';
import bodyParser from 'body-parser';
import mysql from 'mysql2/promise';
import md5 from 'md5';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import ipfsService from './ipfs-service.js';
import blockchainService from './blockchain-service.js';
import dotenv from 'dotenv';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量（从项目根目录读取，避免 cwd 在 services 下导致读取失败）
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

const QUIET = process.env.QUIET === 'true';
const DEBUG = process.env.DEBUG === 'true';
// 创建上传目录
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    if (DEBUG && !QUIET) console.log('创建上传目录:', uploadDir);
}

const app = express();
const port = process.env.PORT || 3001;

// 创建数据库连接池
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'certificate_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}); 

// 测试数据库连接
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        if (!QUIET) console.log('数据库连接成功！');
        connection.release();
    } catch (error) {
        console.error('数据库连接失败:', error);
    }
}

// 定义 CORS 配置 - 支持多个前端端口
const corsOptions = {
    origin: function (origin, callback) {
        // 允许的源列表
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:5173',
            'http://localhost:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174'
        ];
        // 允许没有origin的请求（如Postman）
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(null, true); // 开发环境允许所有源
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

// 使用CORS中间件
app.use(cors(corsOptions));

// 处理 OPTIONS 请求
app.options('*', cors(corsOptions));

// 解析JSON请求体
app.use(bodyParser.json());

// 配置静态文件服务
app.use('/uploads', express.static(uploadDir));

// 生产静态站点托管
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
}

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ ok: true, port, time: new Date().toISOString() });
});

async function initBlockchain() {
    try {
        const ok = await blockchainService.init();
        if (!ok) {
            console.warn('区块链服务初始化失败');
            return;
        }
        
        // 尝试从文件或环境变量加载合约地址
        let contractAddress = process.env.CONTRACT_ADDRESS;
        
        // 尝试加载 ABI
        const abiPath = path.join(__dirname, 'points-certificate-abi.json');
        
        // 如果环境变量没读到，尝试直接读取 .env 文件（防止 dotenv 缓存问题）
        if (!contractAddress) {
             try {
                 const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8');
                 const match = envContent.match(/CONTRACT_ADDRESS=(0x[a-fA-F0-9]{40})/);
                 if (match) contractAddress = match[1];
             } catch (err) {}
        }

        if (fs.existsSync(abiPath)) {
             // 优先尝试加载 Hardhat 编译后的 artifacts（包含最新 ABI）
             let abi;
             const artifactPath = path.join(__dirname, '../src/artifacts/contracts/CertificateNFT.sol/CertificateNFT.json');
             
             if (fs.existsSync(artifactPath)) {
                 const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
                 abi = artifact.abi;
                 if (DEBUG) console.log('已加载最新 CertificateNFT ABI');
             } else {
                 abi = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
                 console.warn('警告：加载了旧的 points-certificate-abi.json，建议更新');
             }
             
             // 如果未配置合约地址，尝试使用默认测试地址或警告
             if (!contractAddress) {
                 console.warn('警告：环境变量 CONTRACT_ADDRESS 未配置，上链功能将不可用');
             } else {
                 blockchainService.setContract(contractAddress, abi);
                 if (DEBUG || !QUIET) console.log('区块链服务就绪，合约地址:', contractAddress);
             }
        } else {
            console.warn('警告：合约 ABI 文件不存在:', abiPath);
        }
    } catch (e) {
        console.error('区块链初始化异常:', e);
    }
}
initBlockchain();

async function ensureSchema() {
    try {
        const [photoCol] = await pool.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'photo'"
        );
        if (photoCol.length === 0) {
            await pool.query("ALTER TABLE user ADD COLUMN photo VARCHAR(255)");
            if (DEBUG && !QUIET) console.log('已为 user 表添加 photo 字段');
        }
        await pool.query(`
            CREATE TABLE IF NOT EXISTS points_event (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                points INT NOT NULL,
                consecutive_reward BOOLEAN DEFAULT FALSE,
                time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
    } catch (err) {
        if (DEBUG && !QUIET) console.warn('检查/修复数据库结构失败:', err.message);
    }
}
ensureSchema();

async function ensureCertificateRulesSchema() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS certificate_rules (
                id INT PRIMARY KEY AUTO_INCREMENT,
                rule_name VARCHAR(100) NOT NULL,
                description TEXT,
                photo VARCHAR(255),
                need_point INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
        const [columns] = await pool.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificate_rules'"
        );
        const has = (name) => columns.some(c => c.COLUMN_NAME === name);
        if (!has('auto_issue')) {
            await pool.query("ALTER TABLE certificate_rules ADD COLUMN auto_issue BOOLEAN DEFAULT FALSE COMMENT '是否自动发放'");
        }
        if (!has('condition_type')) {
            await pool.query("ALTER TABLE certificate_rules ADD COLUMN condition_type VARCHAR(50) COMMENT '条件类型：points(积分), activity(活动), manual(手动)'");
        }
        if (!has('condition_value')) {
            await pool.query("ALTER TABLE certificate_rules ADD COLUMN condition_value INT COMMENT '条件值（如积分阈值）'");
        }
        if (!has('auto_issue_enabled')) {
            await pool.query("ALTER TABLE certificate_rules ADD COLUMN auto_issue_enabled BOOLEAN DEFAULT FALSE COMMENT '是否启用自动发放'");
        }
        if (DEBUG && !QUIET) console.log('certificate_rules 表结构检查/修复完成');
    } catch (err) {
        if (DEBUG && !QUIET) console.warn('检查/修复 certificate_rules 结构失败:', err.message);
    }
}
ensureCertificateRulesSchema();

async function ensureUserCertificateSchema() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_certificate (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                certificate_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
        if (DEBUG && !QUIET) console.log('user_certificate 表结构检查/修复完成');
    } catch (err) {
        if (DEBUG && !QUIET) console.warn('检查/修复 user_certificate 结构失败:', err.message);
    }
}
ensureUserCertificateSchema();

async function ensureCheckInSchema() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS check_in (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                check_in_date DATE NOT NULL,
                consecutive_days INT DEFAULT 1,
                UNIQUE KEY uq_user_date (user_id, check_in_date)
            )`);
        if (DEBUG && !QUIET) console.log('check_in 表结构检查/修复完成');
    } catch (err) {
        if (DEBUG && !QUIET) console.warn('检查/修复 check_in 结构失败:', err.message);
    }
}
ensureCheckInSchema();

// 配置文件上传 - 使用memoryStorage以支持IPFS上传
const fileFilter = (req, file, cb) => {
    const mimetype = (file.mimetype || '').toLowerCase();
    const isImage = mimetype.startsWith('image/');
    const isPDF = mimetype === 'application/pdf';
    const byName = /\.(jpg|jpeg|png|gif|webp|heic|svg|pdf)$/i.test(file.originalname || '');
    if (isImage || isPDF || byName) {
        return cb(null, true);
    }
    req.fileValidationError = 'INVALID_FILE_TYPE';
    return cb(null, false);
};

// 用于IPFS上传的内存存储
const memoryStorage = multer.memoryStorage();
const uploadForIPFS = multer({
    storage: memoryStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 限制10MB
    }
});

// 用于普通文件上传的磁盘存储
const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: diskStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 限制10MB
    }
});

// 文件上传到IPFS的路由
app.post('/api/ipfs/upload', uploadForIPFS.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有提供文件' });
        }

        // 上传到IPFS - 使用buffer（memoryStorage提供）
        const result = await ipfsService.uploadToIPFS(req.file.buffer, req.file.originalname);
        
        res.json({
            success: true,
            message: '文件上传成功',
            ipfsHash: result.ipfsHash,
            ipfsUrl: result.ipfsUrl
        });
    } catch (error) {
        console.error('IPFS上传失败:', error);
        res.status(500).json({ error: '文件上传失败', details: error.message });
    }
});

// 上传 metadata.json 到 IPFS 的路由
app.post('/api/ipfs/upload-metadata', bodyParser.json(), async (req, res) => {
    try {
        const { metadata } = req.body;
        
        if (!metadata) {
            return res.status(400).json({ error: '没有提供 metadata 数据' });
        }

        // 验证 metadata 格式
        if (!metadata.name || !metadata.image) {
            return res.status(400).json({ error: 'metadata 必须包含 name 和 image 字段' });
        }

        // 上传 metadata.json 到 IPFS
        const result = await ipfsService.uploadJSONToIPFS(metadata, 'metadata.json');
        
        res.json({
            success: true,
            message: 'Metadata 上传成功',
            ipfsHash: result.ipfsHash,
            ipfsUrl: result.ipfsUrl
        });
    } catch (error) {
        console.error('Metadata IPFS上传失败:', error);
        res.status(500).json({ error: 'Metadata 上传失败', details: error.message });
    }
});

// 认证路由
// 登录
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }

        const [users] = await pool.query(
            'SELECT * FROM user WHERE Username = ? AND Password = ?',
            [username, md5(password)]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        const user = users[0];
        
        // 自动补全学号逻辑：如果检测到用户没有学号，自动生成并更新
        if (!user.Student_ID) {
            const newStudentId = `STU${new Date().getFullYear()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
            await pool.query('UPDATE user SET Student_ID = ? WHERE User_ID = ?', [newStudentId, user.User_ID]);
            user.Student_ID = newStudentId; // 更新内存中的对象，以便返回给前端
            console.log(`为用户 ${user.Username} (ID: ${user.User_ID}) 自动补全了学号: ${newStudentId}`);
        }

        const [roles] = await pool.query('SELECT * FROM role WHERE Role_ID = ?', [user.Role_ID]);
        const role = roles[0];

        res.json({
            success: true,
            user: {
                ...user,
                role: role ? role.Role_Name : '未知'
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '登录失败', details: error.message });
    }
});

// 注册
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, email, student_id } = req.body;
        
        if (!username || !password || !email) {
            return res.status(400).json({ error: '用户名、密码和邮箱不能为空' });
        }

        // 检查用户名是否已存在
        const [existingUsers] = await pool.query(
            'SELECT * FROM user WHERE Username = ?',
            [username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: '用户名已存在' });
        }

        // 获取“学生”角色ID
        let studentRoleId;
        const [roleRows] = await pool.query('SELECT Role_ID FROM role WHERE Role_Name = ?', ['学生']);
        if (roleRows.length > 0) {
            studentRoleId = roleRows[0].Role_ID;
        } else {
            const [ins] = await pool.query('INSERT INTO role (Role_Name, Description) VALUES (?, ?)', ['学生', '普通学生用户']);
            studentRoleId = ins.insertId;
        }

        // 插入新用户，默认学生角色
        // 如果 student_id 为空，则自动生成一个
        let finalStudentId = student_id;
        if (!finalStudentId) {
            // 生成规则：STU + 年份 + 6位随机数
            finalStudentId = `STU${new Date().getFullYear()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
        }

        const [result] = await pool.query(
            'INSERT INTO user (Username, Password, Email, Student_ID, Role_ID) VALUES (?, ?, ?, ?, ?)',
            [username, md5(password), email, finalStudentId, studentRoleId]
        );

        res.json({
            success: true,
            message: '注册成功',
            userId: result.insertId
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '注册失败', details: error.message });
    }
});

// 获取角色列表
app.get('/api/auth/roles', async (req, res) => {
    try {
        const [roles] = await pool.query('SELECT * FROM role');
        res.json(roles);
    } catch (error) {
        console.error('获取角色列表错误:', error);
        res.status(500).json({ error: '获取角色列表失败', details: error.message });
    }
});

// 获取管理员仪表盘统计数据
app.get('/api/admin/stats', async (req, res) => {
    try {
        const headerUserId = req.headers['x-user-id'];
        if (headerUserId) {
            const [roleRows] = await pool.query('SELECT r.Role_Name FROM user u JOIN role r ON u.Role_ID = r.Role_ID WHERE u.User_ID = ?', [parseInt(headerUserId, 10)]);
            if (roleRows.length && roleRows[0].Role_Name !== '管理员') {
                return res.status(403).json({ error: '权限不足' });
            }
        }
        // 获取证书总数 (仅统计当前有效颁发的证书)
        const [certCount] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM certificate c 
            JOIN user_certificate uc ON c.Certificate_ID = uc.instance_id
        `);
        const totalCertificates = certCount[0].count;

        // 获取有效证书数 (仅统计当前有效颁发的证书)
        const [validCount] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM certificate c
            JOIN user_certificate uc ON c.Certificate_ID = uc.instance_id
            WHERE c.Is_Valid = 1
        `);
        const validCertificates = validCount[0].count;

        // 获取用户总数
        const [userCount] = await pool.query('SELECT COUNT(*) as count FROM user');
        const totalUsers = userCount[0].count;

        // 获取本月新增证书数 (仅统计当前有效颁发的证书)
        const [monthCertCount] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM certificate c
            JOIN user_certificate uc ON c.Certificate_ID = uc.instance_id
            WHERE MONTH(c.Created_At) = MONTH(CURRENT_DATE()) 
            AND YEAR(c.Created_At) = YEAR(CURRENT_DATE())
        `);
        const monthlyCertificates = monthCertCount[0].count;

        // 获取最近证书（最近5条，仅统计当前有效颁发的证书）
        const [recentCerts] = await pool.query(`
            SELECT 
                c.Certificate_ID, 
                c.Certificate_Number, 
                c.Student_Name, 
                c.Certificate_Type, 
                c.Organization, 
                c.Issue_Date, 
                c.Created_At, 
                c.Is_Valid 
            FROM certificate c
            JOIN user_certificate uc ON c.Certificate_ID = uc.instance_id
            ORDER BY c.Created_At DESC LIMIT 5
        `);

        res.json({
            totalCertificates,
            validCertificates,
            totalUsers,
            monthlyCertificates,
            recentCertificates: recentCerts
        });
    } catch (error) {
        console.error('获取统计数据错误:', error);
        res.status(500).json({ error: '获取统计数据失败', details: error.message });
    }
});

// 证书管理路由
// 获取证书列表
app.get('/api/certificates', async (req, res) => {
    try {
        const [tables] = await pool.query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificate'"
        );
        if (tables.length === 0) {
            return res.json([]);
        }
        const { studentId, certificateType, userId } = req.query;
        // 修改：只返回在 user_certificate 表中有对应记录的证书（排除已撤销但未物理删除的孤儿数据）
        let query = `
            SELECT c.* 
            FROM certificate c
            JOIN user_certificate uc ON c.Certificate_ID = uc.instance_id
            WHERE 1=1
        `;
        const params = [];

        // 安全修复：如果未提供任何筛选条件，不应返回所有证书
        // 至少需要提供 studentId 或 userId
        if (!studentId && !userId && !certificateType) {
            // 如果是管理员可能需要查看所有，但在 /api/certificates 这个端点通常是用于查询特定列表
            // 这里为了安全，如果没有筛选条件，返回空数组
            return res.json([]);
        }

        if (userId) {
            query += ' AND uc.user_id = ?';
            params.push(userId);
        } else if (studentId) {
            // 只有在没有 userId 时才尝试用 studentId 匹配
            // 注意：Student_ID 可能为空字符串，这里要确保不匹配所有
            if (studentId.trim() === '') {
                 return res.json([]);
            }
            query += ' AND c.Student_ID = ?';
            params.push(studentId);
        }

        if (certificateType) {
            query += ' AND c.Certificate_Type = ?';
            params.push(certificateType);
        }

        query += ' ORDER BY c.Issue_Date DESC';

        const [certificates] = await pool.query(query, params);

        // 批量获取上链信息
        let userCertificates = [];
        if (certificates.length > 0) {
            const certIds = certificates.map(c => c.Certificate_ID);
            
            // 获取 chain_status (通过 instance_id 关联)
            const [userCerts] = await pool.query(
                `SELECT instance_id, chain_status FROM user_certificate WHERE instance_id IN (?)`,
                [certIds]
            );
            userCertificates = userCerts;

            const [blockchainInfos] = await pool.query(
                `SELECT * FROM certificate_blockchain WHERE certificate_id IN (?)`,
                [certIds]
            );
            
            // 构建映射
            const blockchainMap = {};
            blockchainInfos.forEach(info => {
                blockchainMap[info.certificate_id] = info;
            });

            // 合并信息
            certificates.forEach(cert => {
                const info = blockchainMap[cert.Certificate_ID];
                // 查找对应的 user_certificate 记录 (通过 instance_id)
                const userCert = userCertificates.find(uc => uc.instance_id === cert.Certificate_ID);
                const chainStatus = userCert ? userCert.chain_status : 'none';

                if (info) {
                    cert.blockchain = {
                        txHash: info.blockchain_tx_hash,
                        ipfsHash: info.ipfs_hash,
                        blockNumber: info.block_number,
                        tokenId: info.token_id,
                        isOnChain: true,
                        chainStatus: 'minted'
                    };
                } else {
                    cert.blockchain = { 
                        isOnChain: false,
                        chainStatus: chainStatus
                    };
                }
            });
        }

        res.json(certificates);
    } catch (error) {
        console.error('获取证书列表错误:', error);
        res.status(500).json({ error: '获取证书列表失败', details: error.message });
    }
});

// 证书验证（公开API，无需登录）
app.get('/api/certificates/verify/:number', async (req, res) => {
    try {
        const { number } = req.params;
        const [certificates] = await pool.query(
            'SELECT * FROM certificate WHERE Certificate_Number = ? AND Is_Valid = 1',
            [number]
        );

        if (certificates.length === 0) {
            return res.status(404).json({ error: '证书不存在或已失效' });
        }

        const certificate = certificates[0];
        
        // 动态回退获取学号：如果证书上的学号为空，尝试从关联的用户表中获取
        if (!certificate.Student_ID) {
            try {
                // 查找该证书属于哪个用户
                const [userCerts] = await pool.query(
                    'SELECT user_id FROM user_certificate WHERE instance_id = ?',
                    [certificate.Certificate_ID]
                );
                
                if (userCerts.length > 0) {
                    const userId = userCerts[0].user_id;
                    const [users] = await pool.query('SELECT Student_ID, Username FROM user WHERE User_ID = ?', [userId]);
                    if (users.length > 0) {
                        certificate.Student_ID = users[0].Student_ID;
                        // 如果证书上的姓名也为空，顺便补全姓名
                        if (!certificate.Student_Name) {
                            certificate.Student_Name = users[0].Username;
                        }
                    }
                }
            } catch (fallbackError) {
                console.warn('回退获取学号失败:', fallbackError);
            }
        }
        
        // 补充上链信息
        try {
            const [blockchainInfo] = await pool.query(
                'SELECT * FROM certificate_blockchain WHERE certificate_id = ?',
                [certificate.Certificate_ID]
            );
            
            if (blockchainInfo.length > 0) {
                certificate.blockchain = {
                    txHash: blockchainInfo[0].blockchain_tx_hash,
                    ipfsHash: blockchainInfo[0].ipfs_hash,
                    blockNumber: blockchainInfo[0].block_number,
                    tokenId: blockchainInfo[0].token_id,
                    isOnChain: true
                };
            } else {
                 certificate.blockchain = { isOnChain: false };
            }
        } catch (e) {
             certificate.blockchain = { isOnChain: false };
        }

        res.json(certificate);
    } catch (error) {
        console.error('证书验证错误:', error);
        res.status(500).json({ error: '证书验证失败', details: error.message });
    }
});

// 补录上链接口
app.post('/api/certificates/:id/sync-chain', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const { userId } = req.body; 

        // 1. 获取证书
        const [certificates] = await connection.query('SELECT * FROM certificate WHERE Certificate_ID = ?', [id]);
        if (certificates.length === 0) {
            connection.release();
            return res.status(404).json({ error: '证书不存在' });
        }
        const cert = certificates[0];

        // 2. 检查是否已上链
        const [existing] = await connection.query('SELECT * FROM certificate_blockchain WHERE certificate_id = ?', [id]);
        if (existing.length > 0) {
            connection.release();
            return res.json({ success: true, message: '证书已上链', txHash: existing[0].blockchain_tx_hash });
        }

        // 3. 获取用户钱包
        let ownerId = userId;
        if (!ownerId) {
             const [owners] = await connection.query('SELECT user_id FROM user_certificate WHERE certificate_id = ?', [id]);
             if (owners.length > 0) ownerId = owners[0].user_id;
        }

        if (!ownerId) {
            connection.release();
            return res.status(400).json({ error: '无法确定证书所有者' });
        }

        const [users] = await connection.query('SELECT wallet_address FROM user_wallet WHERE user_id = ?', [ownerId]);
        if (users.length === 0 || !users[0].wallet_address) {
             connection.release();
             return res.status(400).json({ error: '用户未绑定钱包，无法上链。请先在个人中心绑定钱包。' });
        }
        const targetAddress = users[0].wallet_address;

        // 4. 上链
        // 检查 IPFS Hash，如果缺失则尝试补传或生成 Mock Hash
        let ipfsHash = cert.IPFS_Hash;
        if (!ipfsHash) {
             console.log('证书缺少IPFS哈希，尝试补全...');
             try {
                 // 获取用户信息用于生成证书数据
                 const [userInfo] = await connection.query('SELECT * FROM user WHERE User_ID = ?', [ownerId]);
                 const user = userInfo.length > 0 ? userInfo[0] : { Username: cert.Student_Name, Student_ID: cert.Student_ID };

                 const certificateData = {
                    certificateId: cert.Certificate_ID,
                    certificateNumber: cert.Certificate_Number,
                    studentName: cert.Student_Name || user.Username,
                    studentId: cert.Student_ID || user.Student_ID || '',
                    certificateType: cert.Certificate_Type,
                    organization: cert.Organization,
                    description: cert.Description,
                    issueDate: cert.Issue_Date,
                    timestamp: Date.now()
                };
                
                // 尝试上传到IPFS
                try {
                    const ipfsResult = await ipfsService.uploadJSONToIPFS(certificateData, `certificate_${cert.Certificate_Number}.json`);
                    ipfsHash = ipfsResult.ipfsHash;
                } catch (ipfsErr) {
                    console.warn('IPFS上传失败(可能未配置Pinata)，使用Mock Hash继续:', ipfsErr.message);
                    // 生成一个模拟的 IPFS Hash 用于演示
                    ipfsHash = 'QmMock' + md5(JSON.stringify(certificateData) + Date.now()).substring(0, 40);
                }
                
                // 更新数据库
                await connection.query('UPDATE certificate SET IPFS_Hash = ? WHERE Certificate_ID = ?', [ipfsHash, id]);
                console.log('已补全证书IPFS Hash:', ipfsHash);

            } catch (err) {
                connection.release();
                console.error('补全IPFS Hash失败:', err);
                return res.status(500).json({ error: '补全IPFS信息失败: ' + err.message });
            }
        }

        if (blockchainService.contract && blockchainService.adminAccount) {
             const blockchainResult = await blockchainService.issueCertificateOnChain(
                targetAddress,
                cert.Certificate_Number,
                ipfsHash
             );

             if (blockchainResult.success) {
                 await connection.query(
                    `INSERT INTO certificate_blockchain 
                    (certificate_id, certificate_number, token_id, blockchain_tx_hash, ipfs_hash, block_number)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [id, cert.Certificate_Number, blockchainResult.tokenId, blockchainResult.txHash, ipfsHash, blockchainResult.blockNumber]
                 );
                 
                 connection.release();
                 return res.json({ success: true, txHash: blockchainResult.txHash, tokenId: blockchainResult.tokenId });
             } else {
                 connection.release();
                 return res.status(500).json({ error: '上链失败: ' + blockchainResult.error });
             }
        } else {
             connection.release();
             return res.status(500).json({ error: '区块链服务不可用或管理员账户未配置' });
        }

    } catch (error) {
        connection.release();
        console.error('同步上链失败:', error);
        res.status(500).json({ error: '同步上链失败', details: error.message });
    }
});

// 验证证书（公开接口）- 已移除
// app.get('/api/certificates/verify/:certificateNumber', async (req, res) => { ... });

// 获取证书详情（包含上链信息）
app.get('/api/certificates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [certificates] = await pool.query(
            'SELECT * FROM certificate WHERE Certificate_ID = ?',
            [id]
        );

        if (certificates.length === 0) {
            return res.status(404).json({ error: '证书不存在' });
        }

        const certificate = certificates[0];
        
        // 查询上链信息
        try {
            const [blockchainInfo] = await pool.query(
                'SELECT * FROM certificate_blockchain WHERE certificate_id = ?',
                [id]
            );
            
            if (blockchainInfo.length > 0) {
                certificate.blockchain = {
                    txHash: blockchainInfo[0].blockchain_tx_hash,
                    ipfsHash: blockchainInfo[0].ipfs_hash,
                    blockNumber: blockchainInfo[0].block_number,
                    tokenId: blockchainInfo[0].token_id,
                    isOnChain: true
                };
            } else {
                certificate.blockchain = {
                    isOnChain: false
                };
            }
        } catch (blockchainError) {
            // 如果表不存在或查询失败，只标记未上链
            certificate.blockchain = {
                isOnChain: false
            };
        }

        res.json(certificate);
    } catch (error) {
        console.error('获取证书详情错误:', error);
        res.status(500).json({ error: '获取证书详情失败', details: error.message });
    }
});

// SPA 路由回退（放在所有 API 路由之后）
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (fs.existsSync(distDir)) {
        return res.sendFile(path.join(distDir, 'index.html'));
    }
    next();
});

// 创建证书（支持图片上传）
app.post('/api/certificates', upload.single('image'), async (req, res) => {
    try {
        const {
            certificateNumber,  // 证书编号（唯一标识）
            certificateId,      // 兼容旧API，如果提供则作为证书编号
            studentName,
            studentId,
            certificateType,
            organization,
            issueDate,
            description,
            certificateHash,
            ipfsHash,
            image // 图片URL或IPFS哈希
        } = req.body;

        // 使用certificateNumber或certificateId（向后兼容）
        const certNumber = certificateNumber || certificateId;
        
        if (!certNumber || !studentName || !studentId) {
            return res.status(400).json({ error: '证书编号、学生姓名和学生ID不能为空' });
        }

        // 检查证书编号是否已存在
        const [existing] = await pool.query(
            'SELECT Certificate_ID FROM certificate WHERE Certificate_Number = ?',
            [certNumber]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: '证书编号已存在' });
        }

        // 处理图片上传
        let imageUrl = image || null;
        if (req.file) {
            // 如果上传了文件，上传到IPFS
            try {
                const ipfsResult = await ipfsService.uploadToIPFS(
                    req.file.buffer,
                    `certificate_image_${certNumber}_${Date.now()}.${req.file.originalname.split('.').pop()}`
                );
                imageUrl = ipfsResult.ipfsHash;
            } catch (ipfsError) {
                console.error('图片上传到IPFS失败:', ipfsError);
                // 如果IPFS上传失败，使用本地路径
                imageUrl = `/uploads/certificates/${req.file.filename}`;
            }
        }

        // Certificate_ID是AUTO_INCREMENT，不需要手动指定
        const [result] = await pool.query(
            `INSERT INTO certificate 
            (Certificate_Number, Student_Name, Student_ID, Certificate_Type, Organization, Issue_Date, Description, Certificate_Hash, IPFS_Hash, Image)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [certNumber, studentName, studentId, certificateType, organization, issueDate, description, certificateHash, ipfsHash, imageUrl]
        );

        res.json({
            success: true,
            message: '证书创建成功',
            certificateId: result.insertId,
            certificateNumber: certNumber,
            image: imageUrl
        });
    } catch (error) {
        console.error('创建证书错误:', error);
        res.status(500).json({ error: '创建证书失败', details: error.message });
    }
});

// 保存 NFT 证书到数据库
app.post('/api/certificates/nft', bodyParser.json(), async (req, res) => {
    try {
        const {
            user_id,
            wallet_address,
            token_id,
            metadata_cid,
            file_cid,
            tx_hash,
            certificate_number,
            name,
            description
        } = req.body;

        // 验证必填字段（wallet_address 可选，因为证书由系统钱包持有）
        if (!token_id || !metadata_cid || !tx_hash || !certificate_number) {
            return res.status(400).json({ 
                error: '缺少必填字段: token_id, metadata_cid, tx_hash, certificate_number' 
            });
        }

        // 验证钱包地址格式（如果提供）
        if (wallet_address && !/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
            return res.status(400).json({ error: '无效的钱包地址格式' });
        }

        // 检查 token_id 是否已存在（确保唯一性）
        const [existing] = await pool.query(
            'SELECT Certificate_ID FROM certificates WHERE token_id = ?',
            [token_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Token ID 已存在，证书可能已保存' });
        }

        // 检查证书编号是否已存在
        const [existingCert] = await pool.query(
            'SELECT Certificate_ID FROM certificates WHERE Certificate_Number = ? OR certificate_number = ?',
            [certificate_number, certificate_number]
        );

        if (existingCert.length > 0) {
            return res.status(400).json({ error: '证书编号已存在' });
        }

        // 插入 NFT 证书记录
        // 注意：根据实际数据库表结构调整字段名
        const [result] = await pool.query(
            `INSERT INTO certificates 
            (user_id, wallet_address, token_id, metadata_cid, file_cid, tx_hash, Certificate_Number, certificate_number, Student_Name, Description, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                user_id || null,
                wallet_address,
                token_id,
                metadata_cid,
                file_cid || null,
                tx_hash,
                certificate_number,
                certificate_number,
                name || 'NFT 证书',
                description || null
            ]
        );

        res.json({
            success: true,
            message: 'NFT 证书保存成功',
            certificateId: result.insertId,
            tokenId: token_id,
            txHash: tx_hash
        });
    } catch (error) {
        console.error('保存 NFT 证书错误:', error);
        res.status(500).json({ error: '保存 NFT 证书失败', details: error.message });
    }
});

// 更新证书
app.put('/api/certificates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // 定义允许更新的字段白名单（防止SQL注入）
        const allowedFields = [
            'Student_Name',
            'Student_ID',
            'Certificate_Type',
            'Organization',
            'Issue_Date',
            'Description',
            'Certificate_Hash',
            'IPFS_Hash',
            'Is_Valid'
        ];

        const fields = [];
        const values = [];

        Object.keys(updateData).forEach(key => {
            // 只允许更新白名单中的字段
            if (allowedFields.includes(key) && updateData[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(updateData[key]);
            }
        });

        if (fields.length === 0) {
            return res.status(400).json({ error: '没有要更新的字段或字段名无效' });
        }

        values.push(id);

        await pool.query(
            `UPDATE certificate SET ${fields.join(', ')} WHERE Certificate_ID = ?`,
            values
        );

        res.json({ success: true, message: '证书更新成功' });
    } catch (error) {
        console.error('更新证书错误:', error);
        res.status(500).json({ error: '更新证书失败', details: error.message });
    }
});

// 删除证书
app.delete('/api/certificates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM certificate WHERE Certificate_ID = ?', [id]);
        res.json({ success: true, message: '证书删除成功' });
    } catch (error) {
        console.error('删除证书错误:', error);
        res.status(500).json({ error: '删除证书失败', details: error.message });
    }
});

// 用户管理路由
// 修改密码
app.post('/api/auth/change-password', async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;
        
        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({ error: '所有字段都是必填的' });
        }
        
        // 先验证旧密码是否正确
        const [results] = await pool.query('SELECT Password FROM user WHERE User_ID = ?', [userId]);
        
        if (results.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        const storedPassword = results[0].Password;
        const oldPasswordEncrypted = md5(currentPassword);
        
        if (storedPassword !== oldPasswordEncrypted) {
            return res.status(401).json({ error: '原密码错误' });
        }
        
        // 更新新密码
        const newPasswordEncrypted = md5(newPassword);
        await pool.query('UPDATE user SET Password = ? WHERE User_ID = ?', [newPasswordEncrypted, userId]);
        
        res.json({ 
            success: true,
            message: '密码修改成功！' 
        });
    } catch (error) {
        console.error('修改密码错误:', error);
        res.status(500).json({ error: '修改密码失败，请重试！', details: error.message });
    }
});

app.get('/api/user/:userId/wallet', async (req, res) => {
    try {
        const userIdNum = parseInt(req.params.userId, 10);
        if (isNaN(userIdNum)) return res.status(400).json({ error: '无效的用户ID' });
        const [rows] = await pool.query('SELECT wallet_address FROM user_wallet WHERE user_id = ?', [userIdNum]);
        if (rows.length === 0) return res.json({ walletAddress: null });
        res.json({ walletAddress: rows[0].wallet_address });
    } catch (error) {
        res.status(500).json({ error: '获取钱包地址失败', details: error.message });
    }
});

app.post('/api/user/wallet', async (req, res) => {
    try {
        const { userId, walletAddress } = req.body;
        const userIdNum = parseInt(userId, 10);
        if (!userIdNum || !walletAddress) return res.status(400).json({ error: '用户ID和钱包地址不能为空' });
        const [rows] = await pool.query('SELECT user_id FROM user_wallet WHERE user_id = ?', [userIdNum]);
        if (rows.length === 0) {
            await pool.query('INSERT INTO user_wallet (user_id, wallet_address) VALUES (?, ?)', [userIdNum, walletAddress]);
        } else {
            await pool.query('UPDATE user_wallet SET wallet_address = ? WHERE user_id = ?', [walletAddress, userIdNum]);
        }
        res.json({ success: true, message: '钱包绑定成功', walletAddress });
    } catch (error) {
        res.status(500).json({ error: '绑定钱包失败', details: error.message });
    }
});

// 获取用户信息
app.get('/api/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // 确保userId是数字
        const userIdNum = parseInt(userId, 10);
        if (isNaN(userIdNum)) {
            return res.status(400).json({ error: '无效的用户ID' });
        }
        
        // 先检查表结构，看是否有photo字段（只检查一次，可以缓存）
        let hasPhotoField = false;
        try {
            const [columns] = await pool.query(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'photo'"
            );
            hasPhotoField = columns.length > 0;
        } catch (err) {
            // 静默处理，假设字段不存在
        }
        
        // 根据字段是否存在构建查询
        const selectFields = hasPhotoField 
            ? 'User_ID, Username, Email, Student_ID, Role_ID, Created_At, photo'
            : 'User_ID, Username, Email, Student_ID, Role_ID, Created_At';
        
        const [users] = await pool.query(
            `SELECT ${selectFields} FROM user WHERE User_ID = ?`,
            [userIdNum]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        const user = users[0];
        
        // 确保日期格式正确
        let createdAt = user.Created_At;
        if (createdAt instanceof Date) {
            createdAt = createdAt.toISOString();
        }
        
        res.json({
            User_ID: user.User_ID,
            Username: user.Username,
            Email: user.Email || null,
            Student_ID: user.Student_ID || null,
            Role_ID: user.Role_ID,
            Created_At: createdAt,
            photo: user.photo || null
        });
    } catch (error) {
        console.error('获取用户信息错误:', error.message);
        res.status(500).json({ 
            error: '获取用户信息失败', 
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 上传用户头像
const uploadForAvatar = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return cb(new Error('只允许上传jpg、jpeg、png、gif格式的图片！'), false);
        }
        cb(null, true);
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

app.post('/api/user/:userId/avatar', uploadForAvatar.single('avatar'), async (req, res) => {
    try {
        const userId = req.params.userId;
        const userIdNum = parseInt(userId, 10);
        if (isNaN(userIdNum)) {
            return res.status(400).json({ error: '无效的用户ID' });
        }
        
        if (!req.file) {
            return res.status(400).json({ error: '没有上传文件' });
        }
        
        // 检查photo字段是否存在
        const [columns] = await pool.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'photo'"
        );
        
        if (columns.length === 0) {
            return res.status(500).json({ 
                error: '数据库表缺少photo字段，请先执行数据库更新脚本：mysql -u root -p certificate_db < database/update_user_table_simple.sql' 
            });
        }
        
        // 获取文件路径，相对于uploads目录
        const filePath = `/uploads/${req.file.filename}`;
        
        // 更新用户头像路径
        await pool.query('UPDATE user SET photo = ? WHERE User_ID = ?', [filePath, userIdNum]);
        
        // 返回头像URL
        res.json({ 
            success: true, 
            message: '头像上传成功',
            avatarUrl: filePath
        });
    } catch (error) {
        console.error('上传头像失败:', error);
        res.status(500).json({ error: '上传头像失败，请重试！', details: error.message });
    }
});

// ==================== 积分系统 API ====================
// 获取用户积分
app.get('/api/user/points/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const userIdNum = parseInt(userId, 10);
        if (isNaN(userIdNum)) {
            return res.status(400).json({ error: '无效的用户ID' });
        }
        const [rows] = await pool.query('SELECT points FROM user WHERE User_ID = ?', [userIdNum]);
        if (rows.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }
        res.json({ points: rows[0].points || 0 });
    } catch (error) {
        console.error('获取用户积分失败:', error);
        res.status(500).json({ error: '获取用户积分失败', details: error.message });
    }
});

// 获取积分排行榜
app.get('/api/points/ranking', async (req, res) => {
    try {
        const { page = 1, pageSize = 20 } = req.query;
        const offset = (page - 1) * pageSize;
        
        const [rows] = await pool.query(
            `SELECT u.User_ID, u.Username, u.Student_ID, u.points,
                    (
                        SELECT COUNT(*) + 1
                        FROM user u2
                        JOIN role r2 ON u2.Role_ID = r2.Role_ID
                        WHERE r2.Role_Name NOT IN ('管理员','活动管理员','admin','activity_admin')
                          AND u2.points > u.points
                    ) as user_rank
             FROM user u
             JOIN role r ON u.Role_ID = r.Role_ID
             WHERE r.Role_Name NOT IN ('管理员','活动管理员','admin','activity_admin')
             ORDER BY u.points DESC
             LIMIT ? OFFSET ?`,
            [parseInt(pageSize), offset]
        );
        
        res.json(rows);
    } catch (error) {
        console.error('获取积分排行榜失败:', error);
        res.status(500).json({ error: '获取积分排行榜失败', details: error.message });
    }
});

// 获取当前用户排名
app.post('/api/points/ranking/current', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: '用户ID不能为空' });
        }
        
        const userIdNum = parseInt(userId, 10);
        if (isNaN(userIdNum)) {
            return res.status(400).json({ error: '无效的用户ID' });
        }
        
        const [rows] = await pool.query(
            `SELECT u.User_ID, u.Username, u.Student_ID, u.points,
                    (
                        SELECT COUNT(*) + 1
                        FROM user u2
                        JOIN role r2 ON u2.Role_ID = r2.Role_ID
                        WHERE r2.Role_Name NOT IN ('管理员','活动管理员','admin','activity_admin')
                          AND u2.points > u.points
                    ) as user_rank
             FROM user u
             JOIN role r ON u.Role_ID = r.Role_ID
             WHERE u.User_ID = ?`,
            [userIdNum]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        const [roleRows] = await pool.query('SELECT Role_Name FROM role WHERE Role_ID = (SELECT Role_ID FROM user WHERE User_ID = ?)', [userIdNum]);
        const roleName = roleRows.length ? roleRows[0].Role_Name : null;
        if (roleName === '管理员' || roleName === '活动管理员' || roleName === 'admin' || roleName === 'activity_admin') {
            return res.json({ User_ID: userIdNum, Username: rows[0].Username, Student_ID: rows[0].Student_ID, points: rows[0].points, user_rank: null });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('获取当前用户排名失败:', error);
        res.status(500).json({ error: '获取当前用户排名失败', details: error.message });
    }
});

// 获取用户积分事件记录
app.get('/api/points/events/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const userIdNum = parseInt(userId, 10);
        if (isNaN(userIdNum)) {
            return res.status(400).json({ error: '无效的用户ID' });
        }
        const { page = 1, pageSize = 10 } = req.query;
        const offset = (page - 1) * pageSize;
        
        // 检查points_event表是否存在
        const [tables] = await pool.query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'points_event'"
        );
        
        if (tables.length === 0) {
            return res.json({
                activities: [],
                pagination: {
                    page: parseInt(page),
                    pageSize: parseInt(pageSize),
                    total: 0,
                    totalPages: 0
                }
            });
        }

        // 获取总数
        const [countRows] = await pool.query(
            'SELECT COUNT(*) as total FROM points_event WHERE user_id = ?',
            [userIdNum]
        );
        const total = countRows[0].total;
        
        // 获取分页数据
        const [rows] = await pool.query(
            'SELECT title, points, time FROM points_event WHERE user_id = ? ORDER BY time DESC LIMIT ? OFFSET ?',
            [userIdNum, parseInt(pageSize), offset]
        );
        
        res.json({
            activities: rows,
            pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        });
    } catch (error) {
        console.error('获取积分事件记录失败:', error);
        // 如果表不存在，返回空数据而不是错误
        if (error.message.includes("doesn't exist") || error.message.includes("Unknown table")) {
            return res.json({
                activities: [],
                pagination: {
                    page: 1,
                    pageSize: 10,
                    total: 0,
                    totalPages: 0
                }
            });
        }
        res.status(500).json({ error: '获取积分事件记录失败', details: error.message });
    }
});

// 用户签到
app.post('/api/user/check-in', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // 检查check_in表是否存在
        const [tables] = await connection.query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'check_in'"
        );
        
        if (tables.length === 0) {
            connection.release();
            return res.status(500).json({ 
                error: '签到表尚未创建', 
                details: '请先执行数据库更新脚本',
                solution: '运行: npm run update:database'
            });
        }

        const { userId } = req.body;
        if (!userId) {
            connection.release();
            return res.status(400).json({ error: '用户ID不能为空' });
        }
        
        const userIdNum = parseInt(userId, 10);
        if (isNaN(userIdNum)) {
            connection.release();
            return res.status(400).json({ error: '无效的用户ID' });
        }
        
        await connection.beginTransaction();
        
        const today = new Date().toISOString().split('T')[0];
        
        // 检查今天是否已签到
        const [todayCheckIn] = await connection.query(
            'SELECT * FROM check_in WHERE user_id = ? AND check_in_date = ?',
            [userIdNum, today]
        );
        
        if (todayCheckIn.length > 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ error: '今天已经签到过了' });
        }
        
        // 获取最后一次签到记录
        const [lastCheckIn] = await connection.query(
            'SELECT * FROM check_in WHERE user_id = ? ORDER BY check_in_date DESC LIMIT 1',
            [userIdNum]
        );
        
        let consecutiveDays = 1;
        if (lastCheckIn.length > 0) {
            const lastDate = new Date(lastCheckIn[0].check_in_date);
            const todayDate = new Date(today);
            const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                consecutiveDays = lastCheckIn[0].consecutive_days + 1;
            }
        }
        
        // 插入签到记录
        await connection.query(
            'INSERT INTO check_in (user_id, check_in_date, consecutive_days) VALUES (?, ?, ?)',
            [userIdNum, today, consecutiveDays]
        );
        
        // 计算积分奖励
        let pointsToAdd = 5; // 基础签到积分
        let rewardMessage = '每日签到';
        
        // 连续签到奖励
        if (consecutiveDays % 365 === 0) {
            pointsToAdd += 100;
            rewardMessage = '连续签到一年奖励';
        } else if (consecutiveDays % 180 === 0) {
            pointsToAdd += 50;
            rewardMessage = '连续签到半年奖励';
        } else if (consecutiveDays % 30 === 0) {
            pointsToAdd += 30;
            rewardMessage = '连续签到一个月奖励';
        } else if (consecutiveDays % 15 === 0) {
            pointsToAdd += 20;
            rewardMessage = '连续签到半个月奖励';
        } else if (consecutiveDays % 7 === 0) {
            pointsToAdd += 10;
            rewardMessage = '连续签到七天奖励';
        }
        
        // 更新用户积分
        await connection.query(
            'UPDATE user SET points = points + ? WHERE User_ID = ?',
            [pointsToAdd, userIdNum]
        );
        
        // 添加积分事件记录
        await connection.query(
            'INSERT INTO points_event (user_id, title, points, consecutive_reward) VALUES (?, ?, ?, ?)',
            [userIdNum, rewardMessage, pointsToAdd, pointsToAdd > 5]
        );
        
        await connection.commit();
        connection.release();
        
        // 触发自动证书发放检查（积分变化）
        try {
            const { checkAndAutoIssueForUser } = await import('./auto-certificate-service.js');
            await checkAndAutoIssueForUser(userIdNum, 'points');
        } catch (error) {
            console.error('自动证书发放检查失败:', error);
        }
        
        res.json({
            success: true,
            message: '签到成功',
            pointsAdded: pointsToAdd,
            consecutiveDays: consecutiveDays,
            rewardMessage: rewardMessage
        });
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('签到失败:', error);
        res.status(500).json({ error: '签到失败', details: error.message });
    }
});

// ==================== 证书规则 API ====================
// 创建证书规则（支持积分兑换和条件自动发放）
app.post('/api/certificate-rules', upload.single('photo'), async (req, res) => {
    try {
        const headerUserId = req.headers['x-user-id'];
        if (headerUserId) {
            const [roleRows] = await pool.query('SELECT r.Role_Name FROM user u JOIN role r ON u.Role_ID = r.Role_ID WHERE u.User_ID = ?', [parseInt(headerUserId, 10)]);
            const roleName = roleRows.length ? roleRows[0].Role_Name : null;
            if (roleName !== '管理员' && roleName !== '活动管理员') {
                return res.status(403).json({ error: '权限不足' });
            }
        }
        const { 
            rule_name, 
            description, 
            need_point, 
            auto_issue, 
            condition_type, 
            condition_value,
            auto_issue_enabled 
        } = req.body;
        
        if (!rule_name || !description) {
            return res.status(400).json({ error: '规则名称和描述不能为空' });
        }
        
        // 检查是否上传了图片
        if (!req.file) {
            if (req.fileValidationError) {
                return res.status(400).json({ error: '只允许上传jpg、jpeg、png、gif、webp、heic、svg或PDF文件' });
            }
            return res.status(400).json({ error: '请上传证书图片' });
        }
        
        const photo = `/uploads/${req.file.filename}`;
        const isAutoIssue = auto_issue === 'true' || auto_issue === true;
        const needPoint = isAutoIssue ? 0 : (parseInt(need_point) || 0);
        const conditionType = condition_type || null;
        const conditionValue = condition_value ? parseInt(condition_value) : null;
        const autoIssueEnabled = auto_issue_enabled === 'true' || auto_issue_enabled === true;
        
        // 确保表存在
        await pool.query(`
            CREATE TABLE IF NOT EXISTS certificate_rules (
                id INT PRIMARY KEY AUTO_INCREMENT,
                rule_name VARCHAR(100) NOT NULL,
                description TEXT,
                photo VARCHAR(255),
                need_point INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
        // 检查表结构，动态构建SQL（逐列判断）
        const [columns] = await pool.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificate_rules'"
        );
        const columnNames = columns.map(col => col.COLUMN_NAME);
        // 确保基础列存在
        const ensureCol = async (name, ddl) => {
            if (!columnNames.includes(name)) {
                await pool.query(`ALTER TABLE certificate_rules ADD COLUMN ${name} ${ddl}`);
                columnNames.push(name);
            }
        };
        await ensureCol('rule_name', 'VARCHAR(100) NOT NULL');
        await ensureCol('description', 'TEXT');
        await ensureCol('photo', 'VARCHAR(255)');
        await ensureCol('need_point', 'INT DEFAULT 0');
        
        const fields = [];
        const params = [];
        if (columnNames.includes('rule_name')) { fields.push('rule_name'); params.push(rule_name); }
        if (columnNames.includes('description')) { fields.push('description'); params.push(description); }
        if (columnNames.includes('photo')) { fields.push('photo'); params.push(photo); }
        if (columnNames.includes('need_point')) { fields.push('need_point'); params.push(needPoint); }
        if (columnNames.includes('auto_issue')) {
            fields.push('auto_issue');
            params.push(isAutoIssue);
        }
        if (columnNames.includes('condition_type')) {
            fields.push('condition_type');
            params.push(conditionType);
        }
        if (columnNames.includes('condition_value')) {
            fields.push('condition_value');
            // 如果是活动类型的条件，需要验证活动ID是否存在
            if (conditionType === 'activity') {
                const activityId = parseInt(conditionValue);
                if (isNaN(activityId) || activityId <= 0) {
                    return res.status(400).json({ error: '无效的活动ID' });
                }
                const [activities] = await pool.query('SELECT id FROM activity WHERE id = ?', [activityId]);
                if (activities.length === 0) {
                    return res.status(400).json({ error: `活动不存在 (ID: ${activityId})` });
                }
                params.push(activityId);
            } else {
                params.push(conditionValue);
            }
        }
        if (columnNames.includes('auto_issue_enabled')) {
            fields.push('auto_issue_enabled');
            params.push(autoIssueEnabled);
        }
        const placeholders = fields.map(() => '?').join(', ');
        const sql = `INSERT INTO certificate_rules (${fields.join(', ')}, created_at) VALUES (${placeholders}, NOW())`;
        
        const [result] = await pool.query(sql, params);
        
        res.json({
            success: true,
            message: isAutoIssue ? '条件自动发放规则创建成功' : '积分兑换规则创建成功',
            id: result.insertId
        });
    } catch (error) {
        console.error('创建证书规则失败:', error);
        res.status(500).json({ error: '创建证书规则失败', details: error.message });
    }
});

// 获取所有证书规则
app.get('/api/certificate-rules', async (req, res) => {
    try {
        // 检查certificate_rules表是否存在
        const [tables] = await pool.query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificate_rules'"
        );
        
        if (tables.length === 0) {
            return res.json([]); // 表不存在时返回空数组，不报错
        }

        const [rows] = await pool.query('SELECT * FROM certificate_rules ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('获取证书规则失败:', error);
        // 如果表不存在，返回空数组而不是错误
        if (error.message.includes("doesn't exist") || error.message.includes("Unknown table")) {
            return res.json([]);
        }
        res.status(500).json({ error: '获取证书规则失败', details: error.message });
    }
});

// 删除证书规则
app.delete('/api/certificate-rules/:id', async (req, res) => {
    try {
        const headerUserId = req.headers['x-user-id'];
        if (headerUserId) {
            const [roleRows] = await pool.query('SELECT r.Role_Name FROM user u JOIN role r ON u.Role_ID = r.Role_ID WHERE u.User_ID = ?', [parseInt(headerUserId, 10)]);
            const roleName = roleRows.length ? roleRows[0].Role_Name : null;
            if (roleName !== '管理员' && roleName !== '活动管理员') {
                return res.status(403).json({ error: '权限不足' });
            }
        }
        const { id } = req.params;
        await pool.query('DELETE FROM certificate_rules WHERE id = ?', [id]);
        res.json({ success: true, message: '证书规则删除成功' });
    } catch (error) {
        console.error('删除证书规则失败:', error);
        res.status(500).json({ error: '删除证书规则失败', details: error.message });
    }
});

// 获取学生证书列表（带状态：已领取/未领取/上链状态）
app.get('/api/certificate-rules/student', async (req, res) => {
    try {
        const userId = req.query.userId;
        
        if (!userId) {
            return res.status(400).json({ error: '缺少用户ID参数' });
        }
        
        const userIdNum = parseInt(userId, 10);
        if (isNaN(userIdNum)) {
            return res.status(400).json({ error: '无效的用户ID' });
        }
        
        // 检查certificate_rules表是否存在
        const [tables] = await pool.query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificate_rules'"
        );
        
        if (tables.length === 0) {
            return res.json([]); // 表不存在时返回空数组
        }
        
        // 获取所有证书规则（只显示手动兑换的，或者已经领取的自动发放证书）
        // 逻辑：如果是积分兑换（auto_issue=FALSE），则显示
        // 如果是自动发放（auto_issue=TRUE），通常不应该显示在兑换列表里，除非我们想让用户看到"此证书需通过活动获取"
        // 但根据用户反馈，这里应该是混淆了。
        // 暂定策略：前端"领取证书"页面只展示 manual (auto_issue=0) 的证书。
        // 或者，我们可以返回所有，但标记 isAutoIssue，前端根据这个标记来禁用"兑换"按钮。
        const [rules] = await pool.query('SELECT * FROM certificate_rules ORDER BY created_at DESC');
        
        // 获取用户已领取的证书及其上链申请状态
        const [userCertificates] = await pool.query(
            'SELECT certificate_id, chain_status FROM user_certificate WHERE user_id = ?',
            [userIdNum]
        );
        
        // 构建映射: certificate_id -> chain_status (只包含已领取的)
        const userCertStatusMap = {};
        userCertificates.forEach(cert => {
            // 注意：certificate_id 对应 certificate_rules 表的 id
            userCertStatusMap[cert.certificate_id] = cert.chain_status;
        });
        
        // 恢复列表显示：不再隐藏自动发放的证书
        // 这样用户可以看到所有证书，对于自动发放的证书，如果满足条件可以手动领取（兜底）
        const certificatesWithStatus = rules.map(rule => {
            const isReceived = userCertStatusMap.hasOwnProperty(rule.id);
            return {
                ...rule,
                isReceived: isReceived, // 只有在 map 中存在的才算已领取
                status: isReceived ? '已领取' : '未领取', // 兼容前端过滤逻辑
                chainStatus: userCertStatusMap[rule.id] || 'none'
            };
        });
        
        res.json(certificatesWithStatus);
    } catch (error) {
        console.error('获取学生证书列表失败:', error);
        res.status(500).json({ error: '获取学生证书列表失败', details: error.message });
    }
});

// 学生申请上链
app.post('/api/certificates/apply-chain', async (req, res) => {
    try {
        const { userId, certificateId } = req.body;
        
        // 更新 user_certificate 表中的 chain_status
        const [result] = await pool.query(
            'UPDATE user_certificate SET chain_status = ? WHERE user_id = ? AND certificate_id = ? AND chain_status = ?',
            ['pending', userId, certificateId, 'none']
        );
        
        if (result.affectedRows === 0) {
            return res.status(400).json({ error: '申请失败：证书不存在、未领取或已申请过' });
        }
        
        res.json({ success: true, message: '上链申请已提交，等待管理员审核' });
    } catch (error) {
        console.error('申请上链失败:', error);
        res.status(500).json({ error: '申请上链失败' });
    }
});

// 检查用户是否已领取证书
app.post('/api/certificates/check-received', async (req, res) => {
    try {
        const { userId, certificateId } = req.body;
        const [rows] = await pool.query(
            'SELECT * FROM user_certificate WHERE user_id = ? AND certificate_id = ?',
            [userId, certificateId]
        );
        res.json({ isReceived: rows.length > 0 });
    } catch (error) {
        console.error('检查证书领取状态失败:', error);
        res.status(500).json({ error: '检查证书领取状态失败', details: error.message });
    }
});

// 学生领取证书（用积分兑换）
app.post('/api/certificates/receive', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { user_id, certificate_id } = req.body;
        
        if (!user_id || !certificate_id) {
            return res.status(400).json({ error: '缺少必要参数' });
        }
        
        await connection.beginTransaction();
        
        // 检查证书规则是否存在
        const [certificateRules] = await connection.query(
            'SELECT * FROM certificate_rules WHERE id = ?',
            [certificate_id]
        );
        
        if (certificateRules.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: '证书规则不存在' });
        }
        
        const certificateRule = certificateRules[0];
        
        // 关键逻辑调整：支持手动领取“自动发放”类型的证书，但必须校验条件
        // 这是一个兜底机制，防止自动发放失败，或者满足用户“做不到自动就改为手动限制”的需求
        if (certificateRule.auto_issue === 1 || certificateRule.auto_issue === true) {
            // 如果是活动类型的自动证书
            if (certificateRule.condition_type === 'activity') {
                const activityId = certificateRule.condition_value;
                // 检查用户是否完成了该活动
                const [participation] = await connection.query(
                    `SELECT * FROM activity_participation 
                     WHERE activity_id = ? AND user_id = ? 
                     AND (status = 'awarded' OR status = 'completed')`,
                    [activityId, user_id]
                );
                
                if (participation.length === 0) {
                    await connection.rollback();
                    return res.status(403).json({ error: '您尚未完成指定活动，无法领取此证书' });
                }
                // 如果满足条件，允许继续执行（即允许领取）
                // 注意：这里是否还需要扣分？
                // 通常活动证书是奖励性质的，不应该再扣分。
                // 我们可以临时将 need_point 视为 0，或者遵循规则配置（如果管理员配置了既要完成活动又要扣分，那就扣）
                // 假设：自动发放的证书通常免费。如果规则里配了分，那就扣；没配就不扣。
            } else if (certificateRule.condition_type === 'points') {
                // 积分阈值类证书：必须检查用户积分是否达到 condition_value 门槛
                const threshold = certificateRule.condition_value;
                
                // 获取用户当前积分
                const [userPointsCheck] = await connection.query(
                    'SELECT points FROM user WHERE User_ID = ?',
                    [user_id]
                );
                
                if (userPointsCheck.length === 0) {
                    await connection.rollback();
                    return res.status(404).json({ error: '用户不存在' });
                }
                
                const currentPoints = userPointsCheck[0].points;
                
                if (currentPoints < threshold) {
                    await connection.rollback();
                    return res.status(403).json({ 
                        error: `您的积分未达到领取门槛！当前积分：${currentPoints}，需要达到：${threshold}` 
                    });
                }
            }
        }
        
        // 检查用户是否已经领取过该证书
        const [existingCertificates] = await connection.query(
            'SELECT * FROM user_certificate WHERE user_id = ? AND certificate_id = ?',
            [user_id, certificate_id]
        );
        
        if (existingCertificates.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: '您已经领取过该证书' });
        }
        
        // 检查用户积分是否足够
        const [userPoints] = await connection.query(
            'SELECT points FROM user WHERE User_ID = ?',
            [user_id]
        );
        
        if (userPoints.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: '用户不存在' });
        }
        
        if (userPoints[0].points < certificateRule.need_point) {
            await connection.rollback();
            return res.status(400).json({ 
                error: `积分不足！需要 ${certificateRule.need_point} 积分，当前积分：${userPoints[0].points}` 
            });
        }
        
        // 扣除用户积分
        await connection.query(
            'UPDATE user SET points = points - ? WHERE User_ID = ?',
            [certificateRule.need_point, user_id]
        );
        
        // 获取用户信息
        const [users] = await connection.query(
            'SELECT u.*, uw.wallet_address FROM user u LEFT JOIN user_wallet uw ON u.User_ID = uw.user_id WHERE u.User_ID = ?',
            [user_id]
        );
        
        if (users.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: '用户不存在' });
        }
        
        const user = users[0];
        
        // 生成证书编号
        const certificateNumber = `CERT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        
        // 创建实际证书记录（使用证书规则的图片）
        const [certResult] = await connection.query(
            `INSERT INTO certificate 
            (Certificate_Number, Student_Name, Student_ID, Certificate_Type, Organization, Description, Image, Is_Valid)
            VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [
                certificateNumber,
                user.Username,
                user.Student_ID || '',
                certificateRule.rule_name,
                '社团证书管理系统',
                certificateRule.description,
                certificateRule.photo || null, // 使用证书规则的图片
            ]
        );
        
        const newCertificateId = certResult.insertId;
        
        // 添加用户证书记录
        await connection.query(
            'INSERT INTO user_certificate (user_id, certificate_id, instance_id, created_at) VALUES (?, ?, ?, NOW())',
            [user_id, certificate_id, newCertificateId]
        );
        
        // 记录积分消费事件
        await connection.query(
            'INSERT INTO points_event (user_id, title, points, time) VALUES (?, ?, ?, NOW())',
            [user_id, `兑换证书：${certificateRule.rule_name}`, -certificateRule.need_point]
        );
        
        // 生成证书数据并上传到IPFS
        let ipfsHash = null;
        let txHash = null;
        let blockNumber = null;
        
        try {
            const certificateData = {
                certificateId: newCertificateId,
                certificateNumber,
                studentName: user.Username,
                studentId: user.Student_ID || '',
                certificateType: certificateRule.rule_name,
                organization: '社团证书管理系统',
                description: certificateRule.description,
                issueDate: new Date().toISOString(),
                timestamp: Date.now()
            };
            
            const certificateDataStr = JSON.stringify(certificateData);
            const certificateBuffer = Buffer.from(certificateDataStr);
            
            // 上传到IPFS
            const ipfsResult = await ipfsService.uploadToIPFS(certificateBuffer, `certificate_${certificateNumber}.json`);
            ipfsHash = ipfsResult.ipfsHash;
            
            // 更新证书的IPFS哈希
            await connection.query(
                'UPDATE certificate SET IPFS_Hash = ? WHERE Certificate_ID = ?',
                [ipfsHash, newCertificateId]
            );
            
            // 注意：不再自动上链，改为管理员在后台批量上链
            // 参考 Student Society Star Chain 的逻辑
            
        } catch (ipfsError) {
            console.error('IPFS上传失败:', ipfsError);
            // 继续处理，即使IPFS失败
        }
        
        await connection.commit();
        connection.release();
        
        res.json({ 
            success: true, 
            message: '证书领取成功，等待管理员上链',
            certificateNumber,
            ipfsHash
        });
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('领取证书失败:', error);
        res.status(500).json({ error: '领取证书失败', details: error.message });
    }
});

// 删除用户证书（撤销）
app.delete('/api/user-certificates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. 获取证书信息
        const [cert] = await pool.query('SELECT * FROM user_certificate WHERE id = ?', [id]);
        if (cert.length === 0) {
            return res.status(404).json({ error: '记录不存在' });
        }
        
        // 2. 删除 user_certificate
        await pool.query('DELETE FROM user_certificate WHERE id = ?', [id]);
        
        // 3. 删除关联的 certificate 实例和上链记录
        const instanceId = cert[0].instance_id;
        if (instanceId) {
            // 删除上链记录（数据库层面）
            await pool.query('DELETE FROM certificate_blockchain WHERE certificate_id = ?', [instanceId]);
            // 删除证书实例
            await pool.query('DELETE FROM certificate WHERE Certificate_ID = ?', [instanceId]);
        }
        
        res.json({ success: true, message: '删除成功' });
    } catch (error) {
        console.error('删除用户证书失败:', error);
        res.status(500).json({ error: '删除失败', details: error.message });
    }
});

// 获取所有已颁发的证书（管理员视图）
app.get('/api/admin/issued-certificates', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                uc.id,
                uc.user_id,
                uc.certificate_id,
                uc.instance_id,
                uc.created_at,
                uc.chain_status,
                u.Username as student_name,
                u.Student_ID as student_id_number,
                cr.rule_name as certificate_name,
                c.Certificate_Number as certificate_number
            FROM user_certificate uc
            JOIN user u ON uc.user_id = u.User_ID
            LEFT JOIN certificate_rules cr ON uc.certificate_id = cr.id
            LEFT JOIN certificate c ON uc.instance_id = c.Certificate_ID
            ORDER BY uc.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('获取已颁发证书失败:', error);
        res.status(500).json({ error: '获取数据失败', details: error.message });
    }
});

// 批量上链接口 (参考 Student Society Star Chain 的逻辑)
app.post('/api/admin/mint-batch', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { certificateIds } = req.body;
        
        if (!Array.isArray(certificateIds) || certificateIds.length === 0) {
            return res.status(400).json({ error: '请选择要上链的证书' });
        }
        
        console.log('开始批量上链，证书ID:', certificateIds);
        
        const results = [];
        const errors = [];
        
        for (const certId of certificateIds) {
            try {
                // 1. 获取证书信息
                const [certs] = await connection.query(
                    'SELECT * FROM certificate WHERE Certificate_ID = ?',
                    [certId]
                );
                
                if (certs.length === 0) {
                    errors.push({ id: certId, error: '证书不存在' });
                    continue;
                }
                
                const cert = certs[0];
                
                // 2. 检查是否已上链
                const [chainRecords] = await connection.query(
                    'SELECT * FROM certificate_blockchain WHERE certificate_id = ?',
                    [certId]
                );
                
                if (chainRecords.length > 0) {
                    // 已上链，跳过
                    results.push({ id: certId, status: 'already_minted', txHash: chainRecords[0].blockchain_tx_hash });
                    continue;
                }
                
                if (!cert.IPFS_Hash) {
                    try {
                        const certificateData = {
                            certificateId: cert.Certificate_ID,
                            certificateNumber: cert.Certificate_Number,
                            studentName: cert.Student_Name,
                            studentId: cert.Student_ID || '',
                            certificateType: cert.Certificate_Type,
                            organization: cert.Organization,
                            description: cert.Description,
                            issueDate: cert.Issue_Date,
                            timestamp: Date.now()
                        };

                        try {
                            const ipfsResult = await ipfsService.uploadJSONToIPFS(certificateData, `certificate_${cert.Certificate_Number}.json`);
                            cert.IPFS_Hash = ipfsResult.ipfsHash;
                        } catch (ipfsErr) {
                            cert.IPFS_Hash = 'QmMock' + md5(JSON.stringify(certificateData) + Date.now()).substring(0, 40);
                        }

                        await connection.query('UPDATE certificate SET IPFS_Hash = ? WHERE Certificate_ID = ?', [cert.IPFS_Hash, certId]);
                    } catch (e) {
                        errors.push({ id: certId, error: '补全IPFS信息失败: ' + e.message });
                        continue;
                    }
                }
                
                // 4. 调用区块链服务
                const targetAddress = process.env.ADMIN_WALLET_ADDRESS;
                if (!targetAddress) {
                    throw new Error('系统钱包地址未配置');
                }
                
                const blockchainResult = await blockchainService.issueCertificateOnChain(
                    targetAddress,
                    cert.Certificate_Number,
                    cert.IPFS_Hash
                );
                
                if (blockchainResult.success) {
                    // 5. 记录上链结果
                    await connection.query(
                        `INSERT INTO certificate_blockchain 
                        (certificate_id, certificate_number, token_id, blockchain_tx_hash, ipfs_hash, block_number)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            certId, 
                            cert.Certificate_Number, 
                            blockchainResult.tokenId, 
                            blockchainResult.txHash, 
                            cert.IPFS_Hash, 
                            blockchainResult.blockNumber
                        ]
                    );
                    
                    // 更新 user_certificate 状态为 minted
                    await connection.query(
                        'UPDATE user_certificate SET chain_status = ? WHERE instance_id = ?',
                        ['minted', certId]
                    );

                    results.push({ 
                        id: certId, 
                        status: 'success', 
                        txHash: blockchainResult.txHash,
                        tokenId: blockchainResult.tokenId
                    });
                } else {
                    errors.push({ id: certId, error: blockchainResult.error || '上链失败' });
                }
                
            } catch (err) {
                console.error(`证书 ${certId} 上链出错:`, err);
                errors.push({ id: certId, error: err.message });
            }
        }
        
        if (results.length === 0) {
            return res.status(400).json({
                success: false,
                error: `全部上链失败：失败 ${errors.length} 项`,
                results,
                errors
            });
        }

        if (errors.length > 0) {
            return res.status(207).json({
                success: false,
                message: `部分上链成功。成功: ${results.length}, 失败: ${errors.length}`,
                results,
                errors
            });
        }

        return res.json({
            success: true,
            message: `全部上链成功。成功: ${results.length}`,
            results,
            errors: []
        });
        
    } catch (error) {
        console.error('批量上链失败:', error);
        res.status(500).json({ error: '服务器内部错误' });
    } finally {
        connection.release();
    }
});

// 证书导出 - PDF
app.get('/api/certificates/:id/export/pdf', async (req, res) => {
    try {
        const { id } = req.params;
        const [certificates] = await pool.query(
            'SELECT * FROM certificate WHERE Certificate_ID = ?',
            [id]
        );

        if (certificates.length === 0) {
            return res.status(404).json({ error: '证书不存在' });
        }

        const cert = certificates[0];
        
        // 生成PDF（使用简单的HTML转PDF方式）
        // 注意：这里使用简单的HTML，实际可以使用pdfkit或puppeteer
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: A4 landscape; margin: 0; }
        body { 
            margin: 0; 
            padding: 60px; 
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        }
        .certificate {
            border: 5px solid #1976d2;
            padding: 50px;
            text-align: center;
            background: white;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .cert-title {
            font-size: 36px;
            color: #1976d2;
            margin-bottom: 40px;
            font-weight: bold;
        }
        .cert-number {
            font-size: 14px;
            color: #666;
            margin-bottom: 30px;
        }
        .cert-text {
            font-size: 18px;
            color: #333;
            margin: 20px 0;
            line-height: 2;
        }
        .cert-name {
            font-size: 48px;
            font-weight: bold;
            color: #1976d2;
            margin: 30px 0;
            text-decoration: underline;
        }
        .cert-description {
            font-size: 20px;
            color: #555;
            margin: 40px 0;
            line-height: 2.5;
        }
        .cert-org {
            font-size: 24px;
            font-weight: bold;
            color: #1976d2;
            margin-top: 60px;
        }
        .cert-date {
            margin-top: 50px;
            font-size: 16px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="cert-title">${cert.Certificate_Type || '社团证书'}</div>
        <div class="cert-number">证书编号：${cert.Certificate_Number}</div>
        <div class="cert-text">兹证明</div>
        <div class="cert-name">${cert.Student_Name}</div>
        <div class="cert-text">（学号：${cert.Student_ID}）</div>
        <div class="cert-description">${cert.Description || '在社团活动中表现优异，特发此证，以资鼓励。'}</div>
        <div class="cert-org">${cert.Organization || '社团证书管理系统'}</div>
        <div class="cert-date">${new Date(cert.Issue_Date || cert.Created_At).toLocaleDateString('zh-CN')}</div>
    </div>
</body>
</html>
        `;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="证书_${cert.Certificate_Number}.html"`);
        res.send(html);
    } catch (error) {
        console.error('导出PDF错误:', error);
        res.status(500).json({ error: '导出PDF失败', details: error.message });
    }
});

// 证书导出 - 图片
app.get('/api/certificates/:id/export/image', async (req, res) => {
    try {
        const { id } = req.params;
        const [certificates] = await pool.query(
            'SELECT * FROM certificate WHERE Certificate_ID = ?',
            [id]
        );

        if (certificates.length === 0) {
            return res.status(404).json({ error: '证书不存在' });
        }

        const cert = certificates[0];
        
        // 生成证书图片的HTML（客户端可以使用html2canvas转换）
        // 这里返回一个包含证书信息的JSON，前端使用canvas生成图片
        const certificateData = {
            type: cert.Certificate_Type || '社团证书',
            number: cert.Certificate_Number,
            name: cert.Student_Name,
            studentId: cert.Student_ID,
            description: cert.Description || '在社团活动中表现优异，特发此证，以资鼓励。',
            organization: cert.Organization || '社团证书管理系统',
            date: new Date(cert.Issue_Date || cert.Created_At).toLocaleDateString('zh-CN')
        };

        // 返回HTML页面，前端可以截图
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { 
            margin: 0; 
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f5f5f5;
        }
        .certificate {
            width: 1200px;
            height: 800px;
            border: 8px solid #1976d2;
            padding: 60px;
            text-align: center;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            position: relative;
            font-family: 'Microsoft YaHei', Arial, sans-serif;
        }
        .cert-title {
            font-size: 48px;
            color: #1976d2;
            margin-bottom: 30px;
            font-weight: bold;
        }
        .cert-number {
            font-size: 16px;
            color: #666;
            margin-bottom: 40px;
        }
        .cert-text {
            font-size: 24px;
            color: #333;
            margin: 25px 0;
            line-height: 2;
        }
        .cert-name {
            font-size: 64px;
            font-weight: bold;
            color: #1976d2;
            margin: 40px 0;
            text-decoration: underline;
            text-decoration-color: #1976d2;
            text-underline-offset: 15px;
        }
        .cert-description {
            font-size: 28px;
            color: #555;
            margin: 50px 0;
            line-height: 2.5;
            max-width: 900px;
            margin-left: auto;
            margin-right: auto;
        }
        .cert-org {
            font-size: 32px;
            font-weight: bold;
            color: #1976d2;
            margin-top: 80px;
        }
        .cert-date {
            margin-top: 60px;
            font-size: 20px;
            color: #666;
        }
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            color: rgba(25, 118, 210, 0.05);
            font-weight: bold;
            pointer-events: none;
            z-index: 0;
        }
        .cert-content {
            position: relative;
            z-index: 1;
        }
    </style>
</head>
<body>
    <div class="certificate" id="certificate">
        <div class="watermark">${certificateData.organization}</div>
        <div class="cert-content">
            <div class="cert-title">${certificateData.type}</div>
            <div class="cert-number">证书编号：${certificateData.number}</div>
            <div class="cert-text">兹证明</div>
            <div class="cert-name">${certificateData.name}</div>
            <div class="cert-text">（学号：${certificateData.studentId}）</div>
            <div class="cert-description">${certificateData.description}</div>
            <div class="cert-org">${certificateData.organization}</div>
            <div class="cert-date">${certificateData.date}</div>
        </div>
    </div>
    <script>
        // 自动触发下载（使用html2canvas）
        if (typeof html2canvas !== 'undefined') {
            html2canvas(document.getElementById('certificate'), {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            }).then(canvas => {
                canvas.toBlob(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = '证书_' + '${certificateData.number}' + '.png';
                    a.click();
                    URL.revokeObjectURL(url);
                });
            });
        }
    </script>
</body>
</html>
        `;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (error) {
        console.error('导出图片错误:', error);
        res.status(500).json({ error: '导出图片失败', details: error.message });
    }
});

// 导入活动管理API
import { registerActivityRoutes } from './activity-api.js';
registerActivityRoutes(app, pool, upload);

// 注册自动证书发放API
import { registerAutoCertificateRoutes } from './auto-certificate-api.js';
registerAutoCertificateRoutes(app);

// 初始化自动证书发放服务
import { setPool as setAutoCertificatePool } from './auto-certificate-service.js';
setAutoCertificatePool(pool);

// 启动服务器 - 添加错误处理和自动端口检测
function startServer(attemptPort) {
    const server = app.listen(attemptPort, async () => {
        console.log(`服务器运行在 http://localhost:${attemptPort}`);
        await testConnection();
        if (DEBUG && !QUIET) console.log('自动证书发放服务已启动（实时触发模式）');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            if (DEBUG && !QUIET) console.warn(`端口 ${attemptPort} 已被占用，尝试下一个端口...`);
            // 自动尝试下一个端口
            if (attemptPort < port + 10) {
                server.close();
                startServer(attemptPort + 1);
            } else {
                console.error(`错误: 无法找到可用端口（尝试了 ${port}-${attemptPort}）`);
                process.exit(1);
            }
        } else {
            console.error('服务器启动失败:', err.message || err);
            process.exit(1);
        }
    });
}

startServer(port);

export default app;

