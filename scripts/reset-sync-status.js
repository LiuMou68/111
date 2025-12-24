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

        console.log('连接成功，正在重置上链状态...');
        
        // Truncate certificate_blockchain table
        // This removes all records of "successful syncs", so the frontend will show "Sync Now" button again
        await connection.query('TRUNCATE TABLE certificate_blockchain');
        
        console.log('✅ 上链状态已重置！');
        console.log('现在所有证书都已标记为"未上链"，你可以重新点击同步按钮。');

        await connection.end();
    } catch (error) {
        console.error('重置失败:', error);
    }
}

main();
