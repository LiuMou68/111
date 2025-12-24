import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    try {
        const rpcUrl = 'http://localhost:8545';
        const web3 = new Web3(rpcUrl);
        const contractAddress = '0x0165878A594ca255338adfa4d48449f69242Eb8F';
        
        // 加载 ABI
        const artifactPath = path.join(__dirname, '../src/artifacts/contracts/CertificateNFT.sol/CertificateNFT.json');
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
        const contract = new web3.eth.Contract(artifact.abi, contractAddress);

        // 证书编号 (从之前的日志获取)
        const certNumber = 'CERT-2025-800376'; 
        console.log(`正在查询证书 ${certNumber} 的 Token ID...`);

        const result = await contract.methods.verifyCertificate(certNumber).call();
        
        if (result.exists) {
            console.log('\n=============================================');
            console.log('🎉 查询成功！');
            console.log(`Token ID: ${result.tokenId}`);
            console.log(`合约地址: ${contractAddress}`);
            console.log('=============================================\n');
            console.log('请在 MetaMask 中使用以上信息导入 NFT。');
        } else {
            console.error('❌ 链上未找到该证书，请确认证书编号是否正确。');
        }

    } catch (error) {
        console.error('查询失败:', error);
    }
}

main();
