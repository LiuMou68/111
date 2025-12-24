/**
 * 智能合约配置文件
 * 根据不同环境配置不同的合约地址
 */

// 输出环境变量情况以调试
console.log('环境变量信息:', {
  mode: import.meta.env.MODE,
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
  networkId: import.meta.env.VITE_NETWORK_ID
});

// 根据环境获取合约配置
const ENV = import.meta.env.MODE || 'development';

// 合约配置
const CONTRACTS = {
  // 开发环境配置
  development: {
    CertificateContract: {
      address: import.meta.env.VITE_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      networkId: parseInt(import.meta.env.VITE_NETWORK_ID || '31337')
    }
  },
  // 生产环境配置
  production: {
    CertificateContract: {
      address: import.meta.env.VITE_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      networkId: parseInt(import.meta.env.VITE_NETWORK_ID || '1')
    }
  }
};

// 导出当前环境的合约配置
export const CONTRACT_CONFIG = CONTRACTS[ENV] || CONTRACTS.development;

// 直接从环境变量中导出备用配置，以防主配置无法正常工作
export const BACKUP_CONFIG = {
  address: import.meta.env.VITE_CONTRACT_ADDRESS,
  networkId: import.meta.env.VITE_NETWORK_ID
};

// 导出默认配置
export default CONTRACT_CONFIG;

