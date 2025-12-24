/**
 * IPFS服务
 * 提供安全的IPFS上传功能，处理Pinata API请求
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

// Pinata API配置
const PINATA_API_KEY = process.env.PINATA_API_KEY || '';
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY || '';
const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/';

/**
 * 上传文件到IPFS (Pinata)
 * @param {Buffer} fileBuffer - 文件数据
 * @param {string} fileName - 文件名
 * @returns {Promise<Object>} - 上传结果
 */
export async function uploadToIPFS(fileBuffer, fileName) {
  try {
    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
      throw new Error('Pinata API密钥未配置');
    }

    // 创建FormData对象
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: 'application/octet-stream',
    });

    // 发送请求到Pinata API
    const response = await fetch(PINATA_API_URL, {
      method: 'POST',
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY,
      },
      body: formData
    });

    // 处理响应
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinata API错误:', errorText);
      throw new Error(`上传到IPFS失败: ${response.status} ${response.statusText}`);
    }

    // 解析结果
    const result = await response.json();
    return {
      success: true,
      ipfsHash: result.IpfsHash,
      ipfsUrl: `${IPFS_GATEWAY}${result.IpfsHash}`,
      pinSize: result.PinSize,
      timestamp: result.Timestamp
    };
  } catch (error) {
    console.error('IPFS上传服务错误:', error);
    throw new Error(`IPFS上传服务错误: ${error.message}`);
  }
}

/**
 * 上传 JSON 数据到 IPFS (Pinata)
 * @param {Object} jsonData - JSON 数据对象
 * @param {string} fileName - 文件名（可选，默认 metadata.json）
 * @returns {Promise<Object>} - 上传结果
 */
export async function uploadJSONToIPFS(jsonData, fileName = 'metadata.json') {
  try {
    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
      throw new Error('Pinata API密钥未配置');
    }

    // 将 JSON 转换为 Buffer
    const jsonBuffer = Buffer.from(JSON.stringify(jsonData, null, 2), 'utf-8');

    // 创建 FormData 对象
    const formData = new FormData();
    formData.append('file', jsonBuffer, {
      filename: fileName,
      contentType: 'application/json',
    });

    // 发送请求到 Pinata API
    const response = await fetch(PINATA_API_URL, {
      method: 'POST',
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY,
      },
      body: formData
    });

    // 处理响应
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinata API错误:', errorText);
      throw new Error(`上传JSON到IPFS失败: ${response.status} ${response.statusText}`);
    }

    // 解析结果
    const result = await response.json();
    return {
      success: true,
      ipfsHash: result.IpfsHash,
      ipfsUrl: `${IPFS_GATEWAY}${result.IpfsHash}`,
      pinSize: result.PinSize,
      timestamp: result.Timestamp
    };
  } catch (error) {
    console.error('IPFS JSON上传服务错误:', error);
    throw new Error(`IPFS JSON上传服务错误: ${error.message}`);
  }
}

/**
 * 生成标准 metadata.json
 * @param {Object} params - 元数据参数
 * @param {string} params.name - 证书名称
 * @param {string} params.description - 证书描述
 * @param {string} params.fileCID - 证书文件的 IPFS CID
 * @param {string} params.issuer - 颁发者
 * @param {string} params.owner - 所有者钱包地址（可选，系统钱包持有）
 * @param {string} params.issueDate - 颁发日期
 * @param {string} params.certificateId - 证书编号
 * @param {string} params.studentId - 学生 ID（可选）
 * @param {string} params.studentName - 学生姓名（可选）
 * @param {Array} params.attributes - 属性数组（可选）
 * @returns {Object} - metadata.json 对象
 */
export function generateMetadata({
  name,
  description,
  fileCID,
  issuer = '学社星链',
  owner = null, // 可选，系统钱包持有
  issueDate,
  certificateId,
  studentId = null,
  studentName = null,
  attributes = []
}) {
  // 确保 fileCID 格式正确（移除 ipfs:// 前缀如果存在）
  const imageCID = fileCID.replace(/^ipfs:\/\//, '');
  const imageURI = `ipfs://${imageCID}`;

  const metadata = {
    name: name || '社团证书',
    description: description || '由学社星链颁发的证书',
    image: imageURI,
    issuer: issuer,
    issueDate: issueDate || new Date().toISOString().split('T')[0],
    certificateId: certificateId || '',
    attributes: attributes
  };

  // 添加学生信息（如果提供）
  if (studentId) {
    metadata.studentId = studentId;
  }
  if (studentName) {
    metadata.studentName = studentName;
  }
  
  // 添加所有者信息（如果提供，否则说明由系统钱包持有）
  if (owner) {
    metadata.owner = owner;
  } else {
    metadata.holder = 'system_wallet'; // 标识由系统钱包持有
  }

  return metadata;
}

/**
 * 从IPFS获取文件URL
 * @param {string} ipfsHash - IPFS哈希值
 * @returns {string} - IPFS文件URL
 */
export function getIPFSUrl(ipfsHash) {
  // 如果已经包含 ipfs:// 前缀，直接返回网关 URL
  if (ipfsHash.startsWith('ipfs://')) {
    const cid = ipfsHash.replace(/^ipfs:\/\//, '');
    return `${IPFS_GATEWAY}${cid}`;
  }
  return `${IPFS_GATEWAY}${ipfsHash}`;
}

export default {
  uploadToIPFS,
  uploadJSONToIPFS,
  generateMetadata,
  getIPFSUrl
};

