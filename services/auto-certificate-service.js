// 自动证书发放服务
// 注意：这个文件需要从外部传入pool，避免循环依赖
let poolInstance = null;

export function setPool(pool) {
    poolInstance = pool;
}

function getPool() {
    if (!poolInstance) {
        throw new Error('数据库连接池未初始化，请先调用 setPool()');
    }
    return poolInstance;
}

/**
 * 检查并自动发放证书
 * 当学生满足条件时，自动生成证书
 */
export async function checkAndAutoIssueCertificates() {
    const pool = getPool();
    try {
        // 检查表是否存在
        const [tables] = await pool.query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificate_rules'"
        );
        
        if (tables.length === 0) {
            return { checked: 0, issued: 0 };
        }
        
        // 检查是否有自动发放相关字段
        const [columns] = await pool.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificate_rules' AND COLUMN_NAME = 'auto_issue'"
        );
        
        if (columns.length === 0) {
            // 表结构未更新，没有自动发放功能
            return { checked: 0, issued: 0 };
        }
        
        // 获取所有启用自动发放的证书规则
        const [rules] = await pool.query(
            `SELECT * FROM certificate_rules 
             WHERE auto_issue = TRUE AND auto_issue_enabled = TRUE`
        );
        
        if (rules.length === 0) {
            return { checked: 0, issued: 0 };
        }
        
        let totalChecked = 0;
        let totalIssued = 0;
        
        for (const rule of rules) {
            const result = await checkAndIssueForRule(rule);
            totalChecked += result.checked;
            totalIssued += result.issued;
        }
        
        return { checked: totalChecked, issued: totalIssued };
    } catch (error) {
        console.error('自动发放证书检查失败:', error);
        return { checked: 0, issued: 0, error: error.message };
    }
}

/**
 * 检查单个规则并发放证书
 */
async function checkAndIssueForRule(rule) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        let eligibleUsers = [];
        
        if (rule.condition_type === 'points') {
            // 积分条件：查找积分达到阈值的学生
            const [users] = await connection.query(
                `SELECT u.*, uw.wallet_address 
                 FROM user u 
                 LEFT JOIN user_wallet uw ON u.User_ID = uw.user_id 
                 WHERE u.points >= ? AND u.Role_ID = (SELECT Role_ID FROM role WHERE Role_Name = '学生')`,
                [rule.condition_value]
            );
            eligibleUsers = users;
        } else if (rule.condition_type === 'activity') {
            // 活动条件：查找完成指定活动的学生
            // status = 'awarded' (已发积分) 或 'completed' (已完成)
            const [users] = await connection.query(
                `SELECT DISTINCT u.*, uw.wallet_address 
                 FROM user u 
                 INNER JOIN activity_participation ap ON u.User_ID = ap.user_id 
                 LEFT JOIN user_wallet uw ON u.User_ID = uw.user_id 
                 WHERE ap.activity_id = ? 
                 AND (ap.status = 'awarded' OR ap.status = 'completed')
                 AND u.Role_ID = (SELECT Role_ID FROM role WHERE Role_Name = '学生')`,
                [rule.condition_value]
            );
            eligibleUsers = users;
        }
        
        let issuedCount = 0;
        
        for (const user of eligibleUsers) {
            // 检查是否已经领取过该证书
            const [existing] = await connection.query(
                'SELECT * FROM user_certificate WHERE user_id = ? AND certificate_id = ?',
                [user.User_ID, rule.id]
            );
            
            if (existing.length > 0) {
                continue; // 已经领取过，跳过
            }
            
            // 生成证书编号
            const certificateNumber = `CERT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}-${issuedCount}`;
            
            // 创建证书记录
            const [certResult] = await connection.query(
                `INSERT INTO certificate 
                (Certificate_Number, Student_Name, Student_ID, Certificate_Type, Organization, Description, Image, Is_Valid, Issue_Date)
                VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, CURDATE())`,
                [
                    certificateNumber,
                    user.Username,
                    user.Student_ID || '',
                    rule.rule_name,
                    '社团证书管理系统',
                    rule.description,
                    rule.photo || null,
                ]
            );
            
            const newCertificateId = certResult.insertId;
            
            // 添加用户证书记录
            await connection.query(
                'INSERT INTO user_certificate (user_id, certificate_id, instance_id, created_at) VALUES (?, ?, ?, NOW())',
                [user.User_ID, rule.id, newCertificateId]
            );
            
            // 上传到IPFS（如果服务可用）
            let ipfsHash = null;
            try {
                const ipfsServiceModule = await import('./ipfs-service.js');
                const ipfsService = ipfsServiceModule.default || ipfsServiceModule;
                const certificateData = {
                    certificateId: newCertificateId,
                    certificateNumber,
                    studentName: user.Username,
                    studentId: user.Student_ID || '',
                    certificateType: rule.rule_name,
                    organization: '社团证书管理系统',
                    description: rule.description,
                    issueDate: new Date().toISOString(),
                    timestamp: Date.now()
                };
                const certificateDataStr = JSON.stringify(certificateData);
                const certificateBuffer = Buffer.from(certificateDataStr);
                const ipfsResult = await ipfsService.uploadToIPFS(certificateBuffer, `certificate_${certificateNumber}.json`);
                ipfsHash = ipfsResult.ipfsHash;
                
                await connection.query(
                    'UPDATE certificate SET IPFS_Hash = ? WHERE Certificate_ID = ?',
                    [ipfsHash, newCertificateId]
                );
            } catch (ipfsError) {
                console.error('IPFS上传失败:', ipfsError);
            }
            
            // 如果用户已绑定钱包，尝试上链
            if (user.wallet_address) {
                try {
                    const blockchainServiceModule = await import('./blockchain-service.js');
                    const blockchainService = blockchainServiceModule.default || blockchainServiceModule;
                    if (blockchainService.contract && ipfsHash) {
                        const blockchainResult = await blockchainService.issueCertificateOnChain(
                            user.wallet_address,
                            certificateNumber,
                            ipfsHash
                        );
                        
                        if (blockchainResult.success) {
                            await connection.query(
                                `INSERT INTO certificate_blockchain 
                                (certificate_id, certificate_number, blockchain_tx_hash, ipfs_hash, block_number)
                                VALUES (?, ?, ?, ?, ?)`,
                                [newCertificateId, certificateNumber, blockchainResult.txHash, ipfsHash, blockchainResult.blockNumber]
                            );
                        }
                    }
                } catch (blockchainError) {
                    console.error('上链失败:', blockchainError);
                }
            }
            
            issuedCount++;
        }
        
        await connection.commit();
        connection.release();
        
        return { checked: eligibleUsers.length, issued: issuedCount };
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error(`规则 ${rule.id} 自动发放失败:`, error);
        return { checked: 0, issued: 0, error: error.message };
    }
}

/**
 * 检查单个用户是否满足条件并自动发放证书
 * 当用户积分变化或完成活动时调用
 * @param {number} userId - 用户ID
 * @param {string} triggerType - 触发类型：'points'（积分变化）或 'activity'（活动完成）
 * @param {number} activityId - 活动ID（仅当triggerType为'activity'时需要）
 * @returns {Promise<{checked: number, issued: number}>}
 */
export async function checkAndAutoIssueForUser(userId, triggerType = 'points', activityId = null) {
    const pool = getPool();
    try {
        // 检查表结构
        const [tables] = await pool.query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificate_rules'"
        );
        
        if (tables.length === 0) {
            return { checked: 0, issued: 0 };
        }
        
        // 检查是否有自动发放相关字段
        const [columns] = await pool.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificate_rules' AND COLUMN_NAME = 'auto_issue'"
        );
        
        if (columns.length === 0) {
            return { checked: 0, issued: 0 };
        }
        
        // 获取用户信息
        const [users] = await pool.query(
            `SELECT u.*, uw.wallet_address 
             FROM user u 
             LEFT JOIN user_wallet uw ON u.User_ID = uw.user_id 
             WHERE u.User_ID = ?`,
            [userId]
        );
        
        if (users.length === 0) {
            return { checked: 0, issued: 0 };
        }
        
        const user = users[0];
        
        // 获取所有启用自动发放的证书规则
        let rulesQuery = `SELECT * FROM certificate_rules 
                         WHERE auto_issue = TRUE AND auto_issue_enabled = TRUE`;
        let rulesParams = [];
        
        // 根据触发类型过滤规则
        if (triggerType === 'points') {
            rulesQuery += ` AND condition_type = 'points'`;
        } else if (triggerType === 'activity' && activityId) {
            // 注意：这里我们只筛选该特定活动的规则
            // 防止一次活动完成触发了其他非相关活动的检查（虽然下面的逻辑会再次检查资格，但为了性能和逻辑严谨，这里先过滤）
            rulesQuery += ` AND condition_type = 'activity' AND condition_value = ?`;
            rulesParams.push(activityId);
        } else {
            // 如果触发类型未知或参数缺失，直接返回
            return { checked: 0, issued: 0 };
        }
        
        const [rules] = await pool.query(rulesQuery, rulesParams);
        
        if (rules.length === 0) {
            return { checked: 0, issued: 0 };
        }
        
        let totalIssued = 0;
        
        for (const rule of rules) {
            // 检查用户是否满足条件
            let isEligible = false;
            
            if (rule.condition_type === 'points') {
                // 检查积分是否达到阈值
                if (user.points >= rule.condition_value) {
                    isEligible = true;
                }
            } else if (rule.condition_type === 'activity' && activityId) {
                // 检查是否完成指定活动
                // status = 'awarded' 表示活动已结束且积分已发放，视为完成
                // status = 'completed' 表示用户已完成但可能未结算积分（兼容性）
                const [participation] = await pool.query(
                    `SELECT * FROM activity_participation 
                     WHERE activity_id = ? AND user_id = ? 
                     AND (status = 'awarded' OR status = 'completed')`,
                    [activityId, userId]
                );
                if (participation.length > 0) {
                    isEligible = true;
                }
            }
            
            if (isEligible) {
                // 检查是否已经领取过该证书
                const [existing] = await pool.query(
                    'SELECT * FROM user_certificate WHERE user_id = ? AND certificate_id = ?',
                    [userId, rule.id]
                );
                
                if (existing.length === 0) {
                    // 发放证书
                    const result = await issueCertificateForUser(user, rule);
                    if (result.success) {
                        totalIssued++;
                        console.log(`自动发放证书成功: 用户 ${user.Username} (ID: ${userId}) 获得证书 "${rule.rule_name}"`);
                    }
                }
            }
        }
        
        return { checked: rules.length, issued: totalIssued };
    } catch (error) {
        console.error(`为用户 ${userId} 自动发放证书检查失败:`, error);
        return { checked: 0, issued: 0, error: error.message };
    }
}

/**
 * 为单个用户发放证书
 */
async function issueCertificateForUser(user, rule) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // 生成证书编号
        const certificateNumber = `CERT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        
        // 创建证书记录
        const [certResult] = await connection.query(
            `INSERT INTO certificate 
            (Certificate_Number, Student_Name, Student_ID, Certificate_Type, Organization, Description, Image, Is_Valid, Issue_Date)
            VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, CURDATE())`,
            [
                certificateNumber,
                user.Username,
                user.Student_ID || '',
                rule.rule_name,
                '社团证书管理系统',
                rule.description,
                rule.photo || null,
            ]
        );
        
        const newCertificateId = certResult.insertId;
        
        // 添加用户证书记录
        await connection.query(
            'INSERT INTO user_certificate (user_id, certificate_id, instance_id, created_at) VALUES (?, ?, ?, NOW())',
            [user.User_ID, rule.id, newCertificateId]
        );
        
        // 上传到IPFS（如果服务可用）
        let ipfsHash = null;
        try {
            // 动态导入
            const ipfsServiceModule = await import('./ipfs-service.js');
            const ipfsService = ipfsServiceModule.default || ipfsServiceModule;
            
            const certificateData = {
                certificateId: newCertificateId,
                certificateNumber,
                studentName: user.Username,
                studentId: user.Student_ID || '',
                certificateType: rule.rule_name,
                organization: '社团证书管理系统',
                description: rule.description,
                issueDate: new Date().toISOString(),
                timestamp: Date.now(),
                image: rule.photo || null // 确保包含图片信息
            };
            
            // 使用 uploadJSONToIPFS 而不是 uploadToIPFS，以保持一致性
            const ipfsResult = await ipfsService.uploadJSONToIPFS(
                certificateData, 
                `certificate_${certificateNumber}.json`
            );
            
            ipfsHash = ipfsResult.ipfsHash;
            
            await connection.query(
                'UPDATE certificate SET IPFS_Hash = ? WHERE Certificate_ID = ?',
                [ipfsHash, newCertificateId]
            );
        } catch (ipfsError) {
            console.error('IPFS上传失败:', ipfsError);
        }
        
        // 如果用户已绑定钱包，尝试上链
        if (user.wallet_address) {
            try {
                const blockchainServiceModule = await import('./blockchain-service.js');
                const blockchainService = blockchainServiceModule.default || blockchainServiceModule;
                if (blockchainService.contract && ipfsHash) {
                    const blockchainResult = await blockchainService.issueCertificateOnChain(
                        user.wallet_address,
                        certificateNumber,
                        ipfsHash
                    );
                    
                    if (blockchainResult.success) {
                        await connection.query(
                            `INSERT INTO certificate_blockchain 
                            (certificate_id, certificate_number, blockchain_tx_hash, ipfs_hash, block_number)
                            VALUES (?, ?, ?, ?, ?)`,
                            [newCertificateId, certificateNumber, blockchainResult.txHash, ipfsHash, blockchainResult.blockNumber]
                        );
                    }
                }
            } catch (blockchainError) {
                console.error('上链失败:', blockchainError);
            }
        }
        
        await connection.commit();
        connection.release();
        
        return { success: true, certificateId: newCertificateId };
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error(`为用户 ${user.User_ID} 发放证书失败:`, error);
        return { success: false, error: error.message };
    }
}
