/**
 * NFT 证书服务 - 证书 NFT 操作
 * 基于 ethers.js 和 ERC721 标准
 */

import { ethersService } from './ethersService';
import { walletService } from './walletService';

class NFTService {
    constructor() {
        this.contract = null;
        this.contractAddress = null;
    }

    /**
     * 初始化 NFT 服务
     * @param {string} contractAddress 合约地址
     * @param {Array} contractABI 合约 ABI
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async init(contractAddress, contractABI) {
        try {
            const initResult = await ethersService.init(contractAddress, contractABI);
            if (!initResult.success) {
                return initResult;
            }

            this.contract = ethersService.getContract();
            this.contractAddress = contractAddress;

            return { success: true };
        } catch (error) {
            console.error('NFTService 初始化失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 铸造证书 NFT（铸造到系统钱包）
     * @param {string} certificateNumber 证书编号（唯一标识）
     * @param {string} metadataURI IPFS metadata URI (格式: ipfs://metadataCID)
     * @returns {Promise<{success: boolean, tokenId?: number, txHash?: string, error?: string}>}
     */
    async mintCertificate(certificateNumber, metadataURI) {
        try {
            if (!this.contract) {
                throw new Error('合约未初始化，请先调用 init()');
            }

            if (!certificateNumber || !metadataURI) {
                throw new Error('证书编号和 metadata URI 不能为空');
            }

            // 确保 metadataURI 格式正确
            if (!metadataURI.startsWith('ipfs://')) {
                metadataURI = `ipfs://${metadataURI}`;
            }

            console.log('开始铸造证书 NFT:', { certificateNumber, metadataURI });

            // 调用合约的 mintCertificate 函数（铸造到系统钱包）
            const tx = await this.contract.mintCertificate(certificateNumber, metadataURI);
            
            console.log('交易已发送，等待确认...', tx.hash);

            // 等待交易确认
            const receipt = await tx.wait();
            console.log('交易已确认:', receipt);

            // 从事件中获取 tokenId
            let tokenId = null;
            if (receipt.logs && receipt.logs.length > 0) {
                // 解析事件日志获取 tokenId
                const { ethers } = await import('ethers');
                const iface = new ethers.Interface(this.contract.interface);
                
                for (const log of receipt.logs) {
                    try {
                        const parsedLog = iface.parseLog(log);
                        if (parsedLog && parsedLog.name === 'CertificateMinted') {
                            tokenId = parsedLog.args.tokenId.toString();
                            break;
                        }
                    } catch (e) {
                        // 忽略解析失败的事件
                    }
                }
            }

            // 如果无法从事件获取，尝试查询下一个 tokenId - 1
            if (!tokenId) {
                try {
                    const nextTokenId = await this.contract.getNextTokenId();
                    tokenId = (BigInt(nextTokenId) - 1n).toString();
                } catch (e) {
                    console.warn('无法获取 tokenId，请手动查询');
                }
            }

            return {
                success: true,
                tokenId: tokenId ? parseInt(tokenId) : null,
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber
            };
        } catch (error) {
            console.error('铸造证书 NFT 失败:', error);
            
            // 处理用户拒绝交易的情况
            if (error.code === 4001 || error.message.includes('User rejected')) {
                return {
                    success: false,
                    error: '用户拒绝了交易'
                };
            }

            return {
                success: false,
                error: error.message || '铸造失败'
            };
        }
    }

    /**
     * 查询 tokenId 的所有者
     * @param {number} tokenId Token ID
     * @returns {Promise<string>} 所有者地址
     */
    async ownerOf(tokenId) {
        try {
            if (!this.contract) {
                throw new Error('合约未初始化');
            }

            return await this.contract.ownerOf(tokenId);
        } catch (error) {
            console.error('查询所有者失败:', error);
            throw error;
        }
    }

    /**
     * 查询 tokenId 的 URI
     * @param {number} tokenId Token ID
     * @returns {Promise<string>} IPFS metadata URI
     */
    async tokenURI(tokenId) {
        try {
            if (!this.contract) {
                throw new Error('合约未初始化');
            }

            return await this.contract.tokenURI(tokenId);
        } catch (error) {
            console.error('查询 tokenURI 失败:', error);
            throw error;
        }
    }

    /**
     * 通过证书编号查询 tokenId
     * @param {string} certificateNumber 证书编号
     * @returns {Promise<number>} tokenId
     */
    async getTokenIdByCertificateNumber(certificateNumber) {
        try {
            if (!this.contract) {
                throw new Error('合约未初始化');
            }

            return await this.contract.getTokenIdByCertificateNumber(certificateNumber);
        } catch (error) {
            console.error('查询 tokenId 失败:', error);
            throw error;
        }
    }

    /**
     * 通过 tokenId 查询证书编号
     * @param {number} tokenId Token ID
     * @returns {Promise<string>} 证书编号
     */
    async getCertificateNumberByTokenId(tokenId) {
        try {
            if (!this.contract) {
                throw new Error('合约未初始化');
            }

            return await this.contract.getCertificateNumberByTokenId(tokenId);
        } catch (error) {
            console.error('查询证书编号失败:', error);
            throw error;
        }
    }

    /**
     * 验证证书是否存在
     * @param {string} certificateNumber 证书编号
     * @returns {Promise<{exists: boolean, tokenId: number}>}
     */
    async verifyCertificate(certificateNumber) {
        try {
            if (!this.contract) {
                throw new Error('合约未初始化');
            }

            const result = await this.contract.verifyCertificate(certificateNumber);
            return {
                exists: result.exists,
                tokenId: result.tokenId ? parseInt(result.tokenId.toString()) : null
            };
        } catch (error) {
            console.error('验证证书失败:', error);
            throw error;
        }
    }

    /**
     * 查询系统钱包拥有的证书数量
     * @returns {Promise<number>} 证书数量
     */
    async systemWalletBalance() {
        try {
            if (!this.contract) {
                throw new Error('合约未初始化');
            }

            return await this.contract.systemWalletBalance();
        } catch (error) {
            console.error('查询系统钱包余额失败:', error);
            throw error;
        }
    }

    /**
     * 获取下一个 tokenId
     * @returns {Promise<number>}
     */
    async getNextTokenId() {
        try {
            if (!this.contract) {
                throw new Error('合约未初始化');
            }

            return await this.contract.getNextTokenId();
        } catch (error) {
            console.error('获取下一个 tokenId 失败:', error);
            throw error;
        }
    }

    /**
     * 获取总供应量
     * @returns {Promise<number>}
     */
    async totalSupply() {
        try {
            if (!this.contract) {
                throw new Error('合约未初始化');
            }

            return await this.contract.totalSupply();
        } catch (error) {
            console.error('获取总供应量失败:', error);
            throw error;
        }
    }

    /**
     * 验证证书（通过证书编号）
     * 注意：证书由系统钱包持有，通过证书编号和 metadata 中的学生信息来验证
     * @param {string} certificateNumber 证书编号
     * @returns {Promise<{exists: boolean, tokenId: number, tokenURI: string}>}
     */
    async verifyCertificateByNumber(certificateNumber) {
        try {
            const verifyResult = await this.verifyCertificate(certificateNumber);
            if (!verifyResult.exists) {
                return {
                    exists: false,
                    tokenId: null,
                    tokenURI: null
                };
            }

            const tokenURI = await this.tokenURI(verifyResult.tokenId);
            return {
                exists: true,
                tokenId: verifyResult.tokenId,
                tokenURI: tokenURI
            };
        } catch (error) {
            console.error('验证证书失败:', error);
            return {
                exists: false,
                tokenId: null,
                tokenURI: null
            };
        }
    }

    /**
     * 获取合约地址
     * @returns {string|null}
     */
    getContractAddress() {
        return this.contractAddress;
    }
}

export const nftService = new NFTService();

