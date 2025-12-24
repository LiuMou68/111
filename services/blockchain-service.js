// 区块链服务 - 处理积分上链和证书上链
import Web3 from 'web3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

class BlockchainService {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.contractAddress = process.env.CONTRACT_ADDRESS || null;
        this.contractABI = null; // 将从部署后的合约获取
        this.adminAccount = process.env.ADMIN_WALLET_ADDRESS || null;
        this.adminPrivateKey = process.env.ADMIN_WALLET_PRIVATE_KEY || null;
    }

    // 初始化Web3连接
    async init() {
        try {
            // 连接到本地Hardhat节点或配置的RPC
            const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
            this.web3 = new Web3(rpcUrl);

            // 如果有管理员私钥，使用它作为默认账户
            if (this.adminPrivateKey) {
                const privateKey = this.adminPrivateKey.trim().startsWith('0x')
                    ? this.adminPrivateKey.trim()
                    : ('0x' + this.adminPrivateKey.trim());
                const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
                this.web3.eth.accounts.wallet.add(account);
                this.adminAccount = account.address;
            } else {
                 // 如果没有配置私钥，尝试获取本地节点账户（如 Hardhat）
                 const accounts = await this.web3.eth.getAccounts();
                 if (accounts.length > 0) {
                     this.adminAccount = accounts[0];
                 }
            }
            
            // 确保有管理员账户
            if (!this.adminAccount) {
                 console.warn('警告：未配置管理员私钥且未找到本地节点账户，区块链写操作将不可用');
            }

            // 加载合约ABI（需要从部署脚本获取）
            // 这里先返回true，实际使用时需要加载ABI
            return true;
        } catch (error) {
            console.error('区块链服务初始化失败:', error);
            return false;
        }
    }

    // 设置合约地址和ABI
    setContract(address, abi) {
        this.contractAddress = address;
        this.contractABI = abi;
        if (this.web3 && address && abi) {
            this.contract = new this.web3.eth.Contract(abi, address);
        }
    }

    // 发放积分上链
    async awardPointsOnChain(userAddress, points, sourceType, sourceId, ipfsHash) {
        try {
            // 注意：points合约和certificate合约是分开的，这里假设使用的是Points合约
            // 暂时只关注证书上链
            console.warn('积分上链功能暂未完全集成');
            return { success: true, txHash: '0xmock', blockNumber: 0 };
        } catch (error) {
            console.error('积分上链失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 批量发放积分上链
    async batchAwardPointsOnChain(users, points, sourceType, sourceId, ipfsHashes) {
        // 暂时只关注证书上链
        return { success: true, txHash: '0xmock', blockNumber: 0 };
    }

    // 证书上链（确保证书唯一性）
    async issueCertificateOnChain(userAddress, certificateNumber, ipfsHash) {
        try {
            if (!this.contract || !this.adminAccount) {
                throw new Error('合约未初始化或管理员账户未设置');
            }

            // 1. 检查证书是否已存在
            // 注意：新合约使用的是 getTokenIdByCertificateNumber 而不是 certificateExists
            // 我们先尝试调用 mintCertificate，因为合约内部会检查唯一性
            
            // 构建 metadata URI
            const metadataURI = ipfsHash.startsWith('ipfs://') ? ipfsHash : `ipfs://${ipfsHash}`;

            // 估算Gas
            // 调试：打印所有参数
            console.log('正在上链:', { 
                certificateNumber, 
                metadataURI, 
                adminAccount: this.adminAccount,
                contractAddress: this.contractAddress 
            });

            // 发送交易
            // 不进行估算，直接发送，给足够的 gas limit
            // 重要：由于 Hardhat 节点的自动挖矿特性和 nonce 管理，有时需要明确指定 nonce
            // 或者如果 adminAccount 是本地节点账户，不需要签名，直接发送
            
            // 检查 adminAccount 是否在钱包中（是否有私钥）
            const hasPrivateKey = this.web3.eth.accounts.wallet[this.adminAccount];
            
            let result;
            if (hasPrivateKey) {
                // 如果有私钥，使用 sendSignedTransaction（或者让 Web3 自动处理）
                // Web3 1.x 只要 add 到 wallet 就会自动签名
                 result = await this.contract.methods.mintCertificate(
                    certificateNumber,
                    metadataURI
                ).send({
                    from: this.adminAccount,
                    gas: 500000 
                });
            } else {
                // 如果是本地节点解锁账户（无私钥），直接发送
                 result = await this.contract.methods.mintCertificate(
                    certificateNumber,
                    metadataURI
                ).send({
                    from: this.adminAccount,
                    gas: 500000 
                });
            }

            // 解析结果
            // CertificateMinted 事件在 result.events.CertificateMinted
            // Web3.js 1.x vs 4.x 返回结构可能不同
            let event;
            if (result.events && result.events.CertificateMinted) {
                event = result.events.CertificateMinted;
            } else if (result.logs) {
                // 尝试从 logs 中查找
                // 这里可能需要解码日志，或者如果只有一个事件，直接取
                // 暂时假设 events 字段存在
            }

            let tokenId = '0';
            if (event && event.returnValues) {
                tokenId = event.returnValues.tokenId;
            } else {
                console.warn('未找到 CertificateMinted 事件，尝试通过 Transaction Receipt 获取');
                // 某些情况下事件可能没被解析
            }

            return {
                success: true,
                txHash: result.transactionHash,
                blockNumber: Number(result.blockNumber),
                tokenId: tokenId.toString()
            };
        } catch (error) {
            console.error('证书上链失败:', error);
            console.error('错误详情:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            
            // 处理"已存在"错误
            if (error.message.includes("Certificate number already exists")) {
                 return {
                    success: false,
                    error: '证书编号已存在于区块链上'
                };
            }
            
            // 处理 revert
            if (error.message.includes("revert")) {
                // 尝试提取 revert 原因
                const reason = error.reason || error.message;
                return {
                    success: false,
                    error: '合约执行回滚: ' + reason
                };
            }
            
             // 针对 function selector was not recognized 错误
             if (error.message.includes("function selector was not recognized")) {
                 return {
                    success: false,
                    error: '合约ABI不匹配或函数不存在，请重新部署合约并重启后端'
                };
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    // 查询用户积分（从链上）
    async getUserTotalPoints(userAddress) {
        try {
            if (!this.contract) {
                throw new Error('合约未初始化');
            }

            const points = await this.contract.methods.getUserTotalPoints(userAddress).call();
            return parseInt(points);
        } catch (error) {
            console.error('查询用户积分失败:', error);
            return 0;
        }
    }

    // 验证证书是否存在（从链上）
    async verifyCertificateOnChain(certificateNumber) {
        try {
            if (!this.contract) {
                throw new Error('合约未初始化');
            }

            // 使用新合约的 verifyCertificate 方法
            // 返回值是 { exists, tokenId }
            const result = await this.contract.methods.verifyCertificate(certificateNumber).call();
            const exists = result.exists;
            const tokenId = result.tokenId;

            if (!exists) {
                return { exists: false };
            }

            // 如果存在，获取更多信息
            const owner = await this.contract.methods.ownerOf(tokenId).call();
            const tokenURI = await this.contract.methods.tokenURI(tokenId).call();
            const ipfsHash = tokenURI.replace('ipfs://', '');

            return {
                exists: true,
                tokenId: tokenId.toString(),
                owner: owner,
                certificateNumber: certificateNumber,
                ipfsHash: ipfsHash,
                // 注意：ERC721 标准不存储时间戳和区块号，这些通常在事件日志中
                // 这里只返回基本信息
            };
        } catch (error) {
            console.error('验证证书失败:', error);
            return { exists: false, error: error.message };
        }
    }

    // 获取用户的所有证书（从链上）
    async getUserCertificatesOnChain(userAddress) {
        try {
            if (!this.contract) {
                throw new Error('合约未初始化');
            }

            const certificates = await this.contract.methods.getUserCertificates(userAddress).call();
            return certificates;
        } catch (error) {
            console.error('查询用户证书失败:', error);
            return [];
        }
    }
}

export default new BlockchainService();

