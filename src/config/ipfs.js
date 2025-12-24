/**
 * IPFS配置文件
 */
import { create } from 'ipfs-http-client';

// Pinata配置
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY || '';
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY || '';
const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';

// 创建IPFS客户端
let ipfsClient = null;

if (PINATA_API_KEY && PINATA_SECRET_API_KEY) {
  try {
    ipfsClient = create({
      host: 'api.pinata.cloud',
      port: 443,
      protocol: 'https',
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });
  } catch (error) {
    console.error('IPFS客户端初始化失败:', error);
  }
}

export { ipfsClient, IPFS_GATEWAY };

