// MetaMask钱包服务
import { web3Service } from './web3Service.js';

class MetaMaskService {
    constructor() {
        this.isConnected = false;
        this.account = null;
        this.chainId = null;
    }

    // 检查MetaMask是否安装
    isMetaMaskInstalled() {
        return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
    }

    // 连接MetaMask
    async connect() {
        try {
            if (!this.isMetaMaskInstalled()) {
                throw new Error('请先安装MetaMask浏览器插件');
            }

            // 请求账户访问权限
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                throw new Error('未获取到账户，请确保MetaMask已解锁');
            }

            this.account = accounts[0];
            this.chainId = await window.ethereum.request({ method: 'eth_chainId' });
            this.isConnected = true;

            // 监听账户变化
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.account = accounts[0];
                    window.dispatchEvent(new CustomEvent('metamask_accountChanged', { detail: this.account }));
                }
            });

            // 监听网络变化
            window.ethereum.on('chainChanged', (chainId) => {
                this.chainId = chainId;
                window.location.reload(); // 网络变化时重新加载页面
            });

            return {
                success: true,
                account: this.account,
                chainId: this.chainId
            };
        } catch (error) {
            console.error('连接MetaMask失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 断开连接
    disconnect() {
        this.isConnected = false;
        this.account = null;
        this.chainId = null;
        window.dispatchEvent(new CustomEvent('metamask_disconnected'));
    }

    // 获取当前账户
    getAccount() {
        return this.account;
    }

    // 检查是否已连接
    checkConnection() {
        return this.isConnected && this.account !== null;
    }

    // 切换到指定网络（Hardhat本地网络）
    async switchToNetwork(chainId = '0x7A69') { // 31337 in hex
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId }],
            });
            return { success: true };
        } catch (switchError) {
            // 如果网络不存在，尝试添加
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId,
                            chainName: 'Hardhat Local',
                            nativeCurrency: {
                                name: 'ETH',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            rpcUrls: ['http://localhost:8545'],
                            blockExplorerUrls: null
                        }],
                    });
                    return { success: true };
                } catch (addError) {
                    return {
                        success: false,
                        error: '无法添加网络: ' + addError.message
                    };
                }
            }
            return {
                success: false,
                error: '切换网络失败: ' + switchError.message
            };
        }
    }

    // 签名消息（用于验证钱包所有权）
    async signMessage(message) {
        try {
            if (!this.checkConnection()) {
                throw new Error('请先连接MetaMask');
            }

            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, this.account],
            });

            return {
                success: true,
                signature
            };
        } catch (error) {
            console.error('签名失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 绑定钱包地址到用户账户
    async bindWalletToUser(userId, account) {
        try {
            if (!this.checkConnection()) {
                const connectResult = await this.connect();
                if (!connectResult.success) {
                    throw new Error(connectResult.error);
                }
            }

            // 使用传入的 account 或当前的 account
            const walletToBind = account || this.account;

            // 确保在正确的网络
            const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (currentChainId !== '0x7A69') {
                const switchResult = await this.switchToNetwork();
                if (!switchResult.success) {
                    throw new Error(switchResult.error);
                }
            }

            // 发送绑定请求到后端
            const base = import.meta.env?.VITE_API_BASE_URL || '/api';
            const RAW_BASE = import.meta.env?.VITE_API_BASE_URL || '/api';
            const API_BASE = RAW_BASE.endsWith('/api') ? RAW_BASE : `${RAW_BASE}/api`;
            const response = await fetch(`${API_BASE}/user/wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    walletAddress: walletToBind
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '绑定失败');
            }

            return {
                success: true,
                message: data.message,
                walletAddress: walletToBind
            };
        } catch (error) {
            console.error('绑定钱包失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export const metamaskService = new MetaMaskService();

