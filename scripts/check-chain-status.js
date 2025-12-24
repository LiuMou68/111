import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
    try {
        console.log('正在连接数据库...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '123456',
            database: process.env.DB_NAME || 'certificate_db'
        });

        console.log('查询最新上链记录...');
        
        const [rows] = await connection.query(`
            SELECT cb.*, c.Student_Name, c.Certificate_Type 
            FROM certificate_blockchain cb
            JOIN certificate c ON cb.certificate_id = c.Certificate_ID
            ORDER BY cb.created_at DESC
            LIMIT 1
        `);

        if (rows.length === 0) {
            console.log('⚠️ 未找到任何上链记录。请先在前端点击"立即同步上链"');
        } else {
            const record = rows[0];
            console.log('\n✅ 找到最新上链记录：');
            console.log('--------------------------------------------------');
            console.log(`证书编号: ${record.certificate_number}`);
            console.log(`交易哈希 (TxHash): ${record.blockchain_tx_hash}`);
            console.log(`IPFS哈希: ${record.ipfs_hash}`);
            console.log(`区块高度: ${record.block_number}`);
            console.log('--------------------------------------------------');
            
            // 查询 Token ID (如果通过 event logs 没解析出来，这里可能没有)
            // 我们的表结构好像没有 token_id 字段，让我检查一下
        }
        
        // 检查表结构是否有 token_id
        const [columns] = await connection.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificate_blockchain'"
        );
        const hasTokenId = columns.some(c => c.COLUMN_NAME === 'token_id');
        
        if (hasTokenId && rows.length > 0) {
             console.log(`Token ID: ${rows[0].token_id}`);
        } else if (rows.length > 0) {
            console.log('提示: certificate_blockchain 表中没有 token_id 字段，你需要使用区块链浏览器或从日志中查找 Token ID');
            
            // 尝试通过 Web3 获取 (可选)
            // ...
        }

        await connection.end();
    } catch (error) {
        console.error('查询失败:', error);
    }
}

main();
