/**
 * Ethers.js 服务 - 区块链交互核心服务
 * 基于 ethers.js v6+ 实现
 */

import { walletService } from './walletService';

class EthersService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contractAddress = null;
        this.contractABI = null;
        this.contract = null;
    }

    /**
     * 初始化服务
     * @param {string} contractAddress 合约地址
     * @param {Array} contractABI 合约 ABI
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async init(contractAddress, contractABI) {
        try {
            // 确保钱包已连接
            if (!walletService.isWalletConnected()) {
                const connectResult = await walletService.connectWallet();
                if (!connectResult.success) {
                    throw new Error(connectResult.error);
                }
            }

            this.provider = walletService.getProvider();
            this.signer = walletService.getSigner();
            this.contractAddress = contractAddress;
            this.contractABI = contractABI;

            if (!this.provider || !this.signer) {
                throw new Error('Provider 或 Signer 未初始化');
            }

            // 创建合约实例
            const { ethers } = await import('ethers');
            this.contract = new ethers.Contract(
                contractAddress,
                contractABI,
                this.signer
            );

            return { success: true };
        } catch (error) {
            console.error('EthersService 初始化失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取合约实例
     * @returns {ethers.Contract|null}
     */
    getContract() {
        return this.contract;
    }

    /**
     * 获取 Provider
     * @returns {ethers.BrowserProvider|null}
     */
    getProvider() {
        return this.provider;
    }

    /**
     * 获取 Signer
     * @returns {ethers.JsonRpcSigner|null}
     */
    getSigner() {
        return this.signer;
    }

    /**
     * 获取当前账户地址
     * @returns {Promise<string|null>}
     */
    async getCurrentAddress() {
        try {
            if (this.signer) {
                return await this.signer.getAddress();
            }
            return walletService.getCurrentAccount();
        } catch (error) {
            console.error('获取账户地址失败:', error);
            return null;
        }
    }

    /**
     * 获取网络信息
     * @returns {Promise<{chainId: number, name: string}|null>}
     */
    async getNetwork() {
        try {
            if (this.provider) {
                return await this.provider.getNetwork();
            }
            return null;
        } catch (error) {
            console.error('获取网络信息失败:', error);
            return null;
        }
    }

    /**
     * 获取账户余额
     * @param {string} address 账户地址（可选，默认当前账户）
     * @returns {Promise<string>} 余额（ETH）
     */
    async getBalance(address = null) {
        try {
            if (!this.provider) {
                throw new Error('Provider 未初始化');
            }

            const targetAddress = address || await this.getCurrentAddress();
            if (!targetAddress) {
                throw new Error('无法获取账户地址');
            }

            const balance = await this.provider.getBalance(targetAddress);
            const { ethers } = await import('ethers');
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('获取余额失败:', error);
            throw error;
        }
    }

    /**
     * 等待交易确认
     * @param {string} txHash 交易哈希
     * @param {number} confirmations 确认数（默认 1）
     * @returns {Promise<ethers.TransactionReceipt>}
     */
    async waitForTransaction(txHash, confirmations = 1) {
        try {
            if (!this.provider) {
                throw new Error('Provider 未初始化');
            }

            return await this.provider.waitForTransaction(txHash, confirmations);
        } catch (error) {
            console.error('等待交易确认失败:', error);
            throw error;
        }
    }

    /**
     * 估算 Gas 费用
     * @param {Object} transaction 交易对象
     * @returns {Promise<bigint>}
     */
    async estimateGas(transaction) {
        try {
            if (!this.provider) {
                throw new Error('Provider 未初始化');
            }

            return await this.provider.estimateGas(transaction);
        } catch (error) {
            console.error('估算 Gas 失败:', error);
            throw error;
        }
    }

    /**
     * 获取 Gas 价格
     * @returns {Promise<bigint>}
     */
    async getGasPrice() {
        try {
            if (!this.provider) {
                throw new Error('Provider 未初始化');
            }

            const feeData = await this.provider.getFeeData();
            return feeData.gasPrice || feeData.maxFeePerGas;
        } catch (error) {
            console.error('获取 Gas 价格失败:', error);
            throw error;
        }
    }
}

export const ethersService = new EthersService();

