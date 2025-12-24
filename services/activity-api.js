// 活动管理API模块
// 这个文件包含所有活动相关的API路由
// 需要在service.js中引入并使用

import ipfsService from './ipfs-service.js';
import blockchainService from './blockchain-service.js';

// 初始化区块链服务
blockchainService.init().catch(err => {
    console.error('区块链服务初始化失败:', err);
});

/**
 * 注册活动管理API路由
 * @param {Express} app - Express应用实例
 * @param {Object} pool - MySQL连接池
 * @param {Object} upload - Multer上传中间件
 */
export function registerActivityRoutes(app, pool, upload) {
    
    // ==================== 活动管理 API ====================
    
    // 发布活动（活动管理员）
    app.post('/api/activities', upload.single('image'), async (req, res) => {
        try {
            const {
                title,
                description,
                category,
                start_date,
                end_date,
                location,
                max_participants,
                points_reward
            } = req.body;

            // 验证必要字段
            if (!title || !start_date || !points_reward) {
                return res.status(400).json({ error: '活动标题、开始时间和积分奖励不能为空' });
            }

            // 获取当前用户（从session或token中）
            const userId = req.user?.id || req.body.userId; // 需要根据实际认证方式调整
            if (!userId) {
                return res.status(401).json({ error: '未登录或权限不足' });
            }

            // 检查用户是否为活动管理员
            const [users] = await pool.query(
                'SELECT u.*, r.Role_Name FROM user u JOIN role r ON u.Role_ID = r.Role_ID WHERE u.User_ID = ?',
                [userId]
            );
            
            if (users.length === 0 || (users[0].Role_Name !== '活动管理员' && users[0].Role_Name !== '管理员')) {
                return res.status(403).json({ error: '只有活动管理员可以发布活动' });
            }

            // 处理图片上传到IPFS
            let ipfsHash = null;
            let imagePath = null;
            
            if (req.file) {
                try {
                    const ipfsResult = await ipfsService.uploadToIPFS(req.file.buffer, req.file.originalname);
                    ipfsHash = ipfsResult.ipfsHash;
                    imagePath = `/uploads/${req.file.filename}`;
                } catch (ipfsError) {
                    console.error('IPFS上传失败，使用本地存储:', ipfsError);
                    imagePath = `/uploads/${req.file.filename}`;
                }
            }

            // 插入活动记录
            const [result] = await pool.query(
                `INSERT INTO activity 
                (title, description, category, start_date, end_date, location, max_participants, points_reward, image, ipfs_hash, status, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)`,
                [
                    title,
                    description,
                    category,
                    start_date,
                    end_date || null,
                    location,
                    parseInt(max_participants) || 0,
                    parseInt(points_reward),
                    imagePath,
                    ipfsHash,
                    userId
                ]
            );

            res.json({
                success: true,
                message: '活动发布成功',
                activityId: result.insertId
            });
        } catch (error) {
            console.error('发布活动失败:', error);
            res.status(500).json({ error: '发布活动失败', details: error.message });
        }
    });

    // 获取活动列表
    app.get('/api/activities', async (req, res) => {
        try {
            // 检查activity表是否存在
            const [tables] = await pool.query(
                "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activity'"
            );
            
            if (tables.length === 0) {
                return res.status(500).json({ 
                    error: '活动表尚未创建', 
                    details: '请先执行数据库更新脚本: database/add_activity_system.sql',
                    solution: '运行: npm run update:database'
                });
            }

            const { status, category } = req.query;
            let query = 'SELECT * FROM activity WHERE 1=1';
            const params = [];

            if (status) {
                query += ' AND status = ?';
                params.push(status);
            }

            if (category) {
                query += ' AND category = ?';
                params.push(category);
            }

            query += ' ORDER BY created_at DESC';

            const [activities] = await pool.query(query, params);
            res.json(activities);
        } catch (error) {
            console.error('获取活动列表失败:', error);
            res.status(500).json({ error: '获取活动列表失败', details: error.message });
        }
    });

    // 获取活动详情
    app.get('/api/activities/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const [activities] = await pool.query('SELECT * FROM activity WHERE id = ?', [id]);

            if (activities.length === 0) {
                return res.status(404).json({ error: '活动不存在' });
            }

            // 获取参与人数
            const [participants] = await pool.query(
                'SELECT COUNT(*) as count FROM activity_participation WHERE activity_id = ?',
                [id]
            );

            const activity = activities[0];
            activity.participant_count = participants[0].count;

            res.json(activity);
        } catch (error) {
            console.error('获取活动详情失败:', error);
            res.status(500).json({ error: '获取活动详情失败', details: error.message });
        }
    });

    // 学生参与活动
    app.post('/api/activities/:id/join', async (req, res) => {
        const connection = await pool.getConnection();
        try {
            const { id } = req.params;
            const userId = req.user?.id || req.body.userId;

            if (!userId) {
                return res.status(401).json({ error: '请先登录' });
            }

            await connection.beginTransaction();

            // 检查活动是否存在
            const [activities] = await connection.query('SELECT * FROM activity WHERE id = ?', [id]);
            if (activities.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: '活动不存在' });
            }

            const activity = activities[0];

            // 检查活动状态
            if (activity.status !== 'published' && activity.status !== 'ongoing') {
                await connection.rollback();
                return res.status(400).json({ error: '活动当前不可参与' });
            }

            // 检查是否已参与
            const [existing] = await connection.query(
                'SELECT * FROM activity_participation WHERE activity_id = ? AND user_id = ?',
                [id, userId]
            );

            if (existing.length > 0) {
                await connection.rollback();
                return res.status(400).json({ error: '您已经参与过该活动' });
            }

            // 检查人数限制
            if (activity.max_participants > 0) {
                const [count] = await connection.query(
                    'SELECT COUNT(*) as count FROM activity_participation WHERE activity_id = ?',
                    [id]
                );
                if (count[0].count >= activity.max_participants) {
                    await connection.rollback();
                    return res.status(400).json({ error: '活动参与人数已满' });
                }
            }

            // 插入参与记录
            await connection.query(
                'INSERT INTO activity_participation (activity_id, user_id, status) VALUES (?, ?, "joined")',
                [id, userId]
            );

            await connection.commit();
            res.json({ success: true, message: '参与活动成功' });
        } catch (error) {
            await connection.rollback();
            console.error('参与活动失败:', error);
            res.status(500).json({ error: '参与活动失败', details: error.message });
        } finally {
            connection.release();
        }
    });

    // 活动管理员结束活动并发放积分
    app.post('/api/activities/:id/end', async (req, res) => {
        const connection = await pool.getConnection();
        try {
            const { id } = req.params;
            const userId = req.user?.id || req.body.userId;

            if (!userId) {
                return res.status(401).json({ error: '请先登录' });
            }

            // 检查权限
            const [users] = await pool.query(
                'SELECT u.*, r.Role_Name FROM user u JOIN role r ON u.Role_ID = r.Role_ID WHERE u.User_ID = ?',
                [userId]
            );
            
            if (users.length === 0 || (users[0].Role_Name !== '活动管理员' && users[0].Role_Name !== '管理员')) {
                return res.status(403).json({ error: '只有活动管理员可以结束活动' });
            }

            await connection.beginTransaction();

            // 获取活动信息
            const [activities] = await connection.query('SELECT * FROM activity WHERE id = ?', [id]);
            if (activities.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: '活动不存在' });
            }

            const activity = activities[0];

            // 更新活动状态
            await connection.query(
                'UPDATE activity SET status = "ended" WHERE id = ?',
                [id]
            );

            // 获取所有参与且未发放积分的用户
            const [participations] = await connection.query(
                `SELECT ap.*, u.Username, u.Student_ID, uw.wallet_address 
                FROM activity_participation ap
                JOIN user u ON ap.user_id = u.User_ID
                LEFT JOIN user_wallet uw ON u.User_ID = uw.user_id
                WHERE ap.activity_id = ? AND ap.status = 'joined'`,
                [id]
            );

            const pointsReward = parseInt(activity.points_reward) || 0;
            const results = [];

            // 为每个参与者发放积分
            for (const participation of participations) {
                try {
                    // 更新用户积分
                    await connection.query(
                        'UPDATE user SET points = points + ? WHERE User_ID = ?',
                        [pointsReward, participation.user_id]
                    );

                    // 记录积分事件
                    await connection.query(
                        'INSERT INTO points_event (user_id, title, points, time) VALUES (?, ?, ?, NOW())',
                        [participation.user_id, `参加活动：${activity.title}`, pointsReward]
                    );
                    
                    // 触发自动证书发放检查（积分变化）
                    // 注意：这里只触发积分类型的检查，不应该触发活动类型的检查
                    try {
                        const { checkAndAutoIssueForUser } = await import('./auto-certificate-service.js');
                        await checkAndAutoIssueForUser(participation.user_id, 'points');
                    } catch (error) {
                        console.error(`为用户 ${participation.user_id} 自动证书发放检查失败:`, error);
                    }

                    // 生成IPFS哈希（积分记录）
                    const pointsData = {
                        userId: participation.user_id,
                        activityId: id,
                        points: pointsReward,
                        timestamp: new Date().toISOString()
                    };
                    const pointsDataStr = JSON.stringify(pointsData);
                    const pointsBuffer = Buffer.from(pointsDataStr);

                    let ipfsHash = null;
                    let txHash = null;
                    let blockNumber = null;

                    try {
                        // 上传到IPFS
                        const ipfsResult = await ipfsService.uploadToIPFS(pointsBuffer, `points_${participation.user_id}_${id}.json`);
                        ipfsHash = ipfsResult.ipfsHash;

                        // 如果有钱包地址，上链
                        if (participation.wallet_address && blockchainService.contract) {
                            const blockchainResult = await blockchainService.awardPointsOnChain(
                                participation.wallet_address,
                                pointsReward,
                                'activity',
                                id,
                                ipfsHash
                            );

                            if (blockchainResult.success) {
                                txHash = blockchainResult.txHash;
                                blockNumber = blockchainResult.blockNumber;

                                // 记录上链信息
                                await connection.query(
                                    `INSERT INTO points_blockchain 
                                    (user_id, points, source_type, source_id, blockchain_tx_hash, ipfs_hash, block_number)
                                    VALUES (?, ?, 'activity', ?, ?, ?, ?)`,
                                    [participation.user_id, pointsReward, id, txHash, ipfsHash, blockNumber]
                                );
                            }
                        }
                    } catch (ipfsError) {
                        console.error('IPFS上传或上链失败:', ipfsError);
                        // 继续处理，即使IPFS失败
                    }

                    // 更新参与记录
                    await connection.query(
                        `UPDATE activity_participation 
                        SET status = 'awarded', points_awarded = ?, points_awarded_at = NOW(), ipfs_hash = ?, blockchain_tx_hash = ?
                        WHERE id = ?`,
                        [pointsReward, ipfsHash, txHash, participation.id]
                    );
                    
                    // 触发自动证书发放检查（活动完成）
                    try {
                        const { checkAndAutoIssueForUser } = await import('./auto-certificate-service.js');
                        await checkAndAutoIssueForUser(participation.user_id, 'activity', id);
                    } catch (error) {
                        console.error(`为用户 ${participation.user_id} 自动证书发放检查失败:`, error);
                    }

                    results.push({
                        userId: participation.user_id,
                        username: participation.Username,
                        success: true,
                        points: pointsReward,
                        ipfsHash,
                        txHash
                    });
                } catch (error) {
                    console.error(`为用户 ${participation.user_id} 发放积分失败:`, error);
                    results.push({
                        userId: participation.user_id,
                        username: participation.Username,
                        success: false,
                        error: error.message
                    });
                }
            }

            await connection.commit();
            res.json({
                success: true,
                message: `活动已结束，已为 ${results.filter(r => r.success).length} 名参与者发放积分`,
                results
            });
        } catch (error) {
            await connection.rollback();
            console.error('结束活动失败:', error);
            res.status(500).json({ error: '结束活动失败', details: error.message });
        } finally {
            connection.release();
        }
    });

    // 获取用户参与的活动
    app.get('/api/activities/user/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const [activities] = await pool.query(
                `SELECT a.*, ap.status as participation_status, ap.points_awarded, ap.points_awarded_at
                FROM activity a
                JOIN activity_participation ap ON a.id = ap.activity_id
                WHERE ap.user_id = ?
                ORDER BY a.created_at DESC`,
                [userId]
            );
            res.json(activities);
        } catch (error) {
            console.error('获取用户活动失败:', error);
            res.status(500).json({ error: '获取用户活动失败', details: error.message });
        }
    });

    // 绑定用户钱包地址（MetaMask）
    app.post('/api/user/wallet', async (req, res) => {
        try {
            // 检查user_wallet表是否存在
            const [tables] = await pool.query(
                "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_wallet'"
            );
            
            if (tables.length === 0) {
                return res.status(500).json({ 
                    error: '钱包表尚未创建', 
                    details: '请先执行数据库更新脚本: database/add_activity_system.sql',
                    solution: '运行: npm run update:database'
                });
            }

            const { userId, walletAddress } = req.body;

            if (!userId || !walletAddress) {
                return res.status(400).json({ error: '用户ID和钱包地址不能为空' });
            }

            // 验证钱包地址格式
            if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
                return res.status(400).json({ error: '无效的钱包地址格式' });
            }

            // 检查钱包地址是否已被其他用户使用
            const [existing] = await pool.query(
                'SELECT * FROM user_wallet WHERE wallet_address = ? AND user_id != ?',
                [walletAddress, userId]
            );

            if (existing.length > 0) {
                return res.status(400).json({ error: '该钱包地址已被其他用户绑定' });
            }

            // 插入或更新钱包地址
            await pool.query(
                `INSERT INTO user_wallet (user_id, wallet_address) 
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE wallet_address = ?`,
                [userId, walletAddress, walletAddress]
            );

            res.json({ success: true, message: '钱包地址绑定成功' });
        } catch (error) {
            console.error('绑定钱包地址失败:', error);
            res.status(500).json({ error: '绑定钱包地址失败', details: error.message });
        }
    });

    // 获取用户钱包地址
    app.get('/api/user/:userId/wallet', async (req, res) => {
        try {
            // 检查user_wallet表是否存在
            const [tables] = await pool.query(
                "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_wallet'"
            );
            
            if (tables.length === 0) {
                return res.json({ walletAddress: null }); // 表不存在时返回null，不报错
            }

            const { userId } = req.params;
            const [wallets] = await pool.query(
                'SELECT * FROM user_wallet WHERE user_id = ?',
                [userId]
            );

            if (wallets.length === 0) {
                return res.json({ walletAddress: null });
            }

            res.json({ walletAddress: wallets[0].wallet_address });
        } catch (error) {
            console.error('获取钱包地址失败:', error);
            // 如果表不存在，返回null而不是错误
            if (error.message.includes("doesn't exist") || error.message.includes("Unknown table")) {
                return res.json({ walletAddress: null });
            }
            res.status(500).json({ error: '获取钱包地址失败', details: error.message });
        }
    });
}

