/**
 * 钱包服务 - MetaMask 连接管理
 * 基于 ethers.js 实现
 */

class WalletService {
    constructor() {
        this.isConnected = false;
        this.account = null;
        this.chainId = null;
        this.provider = null;
        this.signer = null;
    }

    /**
     * 检查 MetaMask 是否安装
     * @returns {boolean}
     */
    isMetaMaskInstalled() {
        return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
    }

    /**
     * 连接 MetaMask 钱包
     * @returns {Promise<{success: boolean, account?: string, chainId?: string, error?: string}>}
     */
    async connectWallet() {
        try {
            if (!this.isMetaMaskInstalled()) {
                throw new Error('请先安装 MetaMask 浏览器插件');
            }

            // 请求账户访问权限
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                throw new Error('未获取到账户，请确保 MetaMask 已解锁');
            }

            this.account = accounts[0];
            this.chainId = await window.ethereum.request({ method: 'eth_chainId' });
            this.isConnected = true;

            // 初始化 ethers provider 和 signer
            const { ethers } = await import('ethers');
            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();

            // 监听账户变化
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.account = accounts[0];
                    this.signer = this.provider.getSigner();
                    window.dispatchEvent(new CustomEvent('wallet_accountChanged', { 
                        detail: { account: this.account } 
                    }));
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
            console.error('连接 MetaMask 失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 断开连接
     */
    disconnect() {
        this.isConnected = false;
        this.account = null;
        this.chainId = null;
        this.provider = null;
        this.signer = null;
        window.dispatchEvent(new CustomEvent('wallet_disconnected'));
    }

    /**
     * 获取当前账户地址
     * @returns {string|null}
     */
    getCurrentAccount() {
        return this.account;
    }

    /**
     * 检查是否已连接
     * @returns {boolean}
     */
    isWalletConnected() {
        return this.isConnected && this.account !== null;
    }

    /**
     * 获取 ethers provider
     * @returns {ethers.BrowserProvider|null}
     */
    getProvider() {
        return this.provider;
    }

    /**
     * 获取 ethers signer
     * @returns {ethers.JsonRpcSigner|null}
     */
    getSigner() {
        return this.signer;
    }

    /**
     * 切换到指定网络
     * @param {string|number} chainId 链 ID（十进制或十六进制）
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async switchToNetwork(chainId = '0x7A69') { // 31337 in hex (Hardhat)
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

    /**
     * 签名消息（用于验证钱包所有权）
     * @param {string} message 要签名的消息
     * @returns {Promise<{success: boolean, signature?: string, error?: string}>}
     */
    async signMessage(message) {
        try {
            if (!this.isWalletConnected()) {
                throw new Error('请先连接 MetaMask');
            }

            if (!this.signer) {
                throw new Error('Signer 未初始化');
            }

            const signature = await this.signer.signMessage(message);

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

    /**
     * 绑定钱包地址到用户账户
     * @param {number} userId 用户 ID
     * @returns {Promise<{success: boolean, walletAddress?: string, error?: string}>}
     */
    async bindWalletToUser(userId) {
        try {
            if (!this.isWalletConnected()) {
                const connectResult = await this.connectWallet();
                if (!connectResult.success) {
                    throw new Error(connectResult.error);
                }
            }

            // 确保在正确的网络
            const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (currentChainId !== '0x7A69') {
                const switchResult = await this.switchToNetwork();
                if (!switchResult.success) {
                    throw new Error(switchResult.error);
                }
            }

            // 发送绑定请求到后端
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            const response = await fetch(`${API_BASE_URL}/api/user/wallet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    userId,
                    walletAddress: this.account
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '绑定失败');
            }

            return {
                success: true,
                message: data.message,
                walletAddress: this.account
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

export const walletService = new WalletService();

