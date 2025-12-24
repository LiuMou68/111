import Web3 from 'web3';
import { CONTRACT_CONFIG, BACKUP_CONFIG } from '../config/contracts';
import { contractABI } from './contractABI';

class Web3Service {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.contractABI = contractABI;
    this.account = null;

    // 采用多级备选策略获取合约地址和网络ID
    this.contractAddress =
      CONTRACT_CONFIG.CertificateContract?.address ||
      BACKUP_CONFIG.address ||
      import.meta.env.VITE_CONTRACT_ADDRESS ||
      window.CONTRACT_ADDRESS;

    this.networkId =
      CONTRACT_CONFIG.CertificateContract?.networkId ||
      BACKUP_CONFIG.networkId ||
      import.meta.env.VITE_NETWORK_ID ||
      window.NETWORK_ID ||
      '31337'; // 默认为Hardhat本地网络

    console.log('Web3Service初始化信息:', {
      contractAddress: this.contractAddress,
      networkId: this.networkId
    });

    // 立即检查合约地址是否有效
    if (!this.contractAddress) {
      console.warn('警告: 未找到合约地址配置');
    }
  }

  // 初始化Web3连接
  async init() {
    try {
      // 检查是否安装了MetaMask
      if (typeof window.ethereum !== 'undefined') {
        this.web3 = new Web3(window.ethereum);
        
        // 请求账户访问权限
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.account = accounts[0];
        
        // 监听账户变化
        window.ethereum.on('accountsChanged', (accounts) => {
          this.account = accounts[0];
          window.location.reload();
        });

        // 监听网络变化
        window.ethereum.on('chainChanged', (chainId) => {
          window.location.reload();
        });

        // 初始化合约实例
        if (this.contractAddress && this.contractABI) {
          this.contract = new this.web3.eth.Contract(
            this.contractABI,
            this.contractAddress
          );
        }

        return true;
      } else {
        console.error('MetaMask未安装');
        return false;
      }
    } catch (error) {
      console.error('Web3初始化失败:', error);
      return false;
    }
  }

  // 获取当前账户
  getAccount() {
    return this.account;
  }

  // 获取合约实例
  getContract() {
    return this.contract;
  }

  // 获取Web3实例
  getWeb3() {
    return this.web3;
  }

  // 检查网络
  async checkNetwork() {
    if (!this.web3) return false;
    
    const chainId = await this.web3.eth.getChainId();
    const expectedChainId = parseInt(this.networkId);
    
    return chainId === expectedChainId;
  }

  // 切换网络
  async switchNetwork() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${parseInt(this.networkId).toString(16)}` }],
      });
      return true;
    } catch (error) {
      console.error('切换网络失败:', error);
      return false;
    }
  }

  // 发放积分上链（通过MetaMask）
  async awardPoints(userAddress, points, sourceType, sourceId, ipfsHash) {
    try {
      if (!this.contract || !this.account) {
        throw new Error('合约未初始化或未连接账户');
      }

      const result = await this.contract.methods.awardPoints(
        userAddress,
        points,
        sourceType,
        sourceId,
        ipfsHash
      ).send({
        from: this.account,
        gas: 300000
      });

      return {
        success: true,
        txHash: result.transactionHash,
        blockNumber: result.blockNumber
      };
    } catch (error) {
      console.error('积分上链失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 证书上链
  async issueCertificate(userAddress, certificateNumber, ipfsHash) {
    try {
      if (!this.contract || !this.account) {
        throw new Error('合约未初始化或未连接账户');
      }

      // 检查证书是否已存在
      const exists = await this.contract.methods.certificateExists(certificateNumber).call();
      if (exists) {
        throw new Error('证书编号已存在于区块链上');
      }

      const result = await this.contract.methods.issueCertificate(
        userAddress,
        certificateNumber,
        ipfsHash
      ).send({
        from: this.account,
        gas: 300000
      });

      return {
        success: true,
        txHash: result.transactionHash,
        blockNumber: result.blockNumber
      };
    } catch (error) {
      console.error('证书上链失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const web3Service = new Web3Service();

