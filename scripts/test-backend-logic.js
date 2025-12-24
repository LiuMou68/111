import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    try {
        console.log('开始测试上链逻辑...');
        
        // 1. 连接 Web3
        const rpcUrl = 'http://localhost:8545';
        const web3 = new Web3(rpcUrl);
        console.log('Web3 连接成功:', rpcUrl);

        // 2. 获取账户
        const accounts = await web3.eth.getAccounts();
        if (accounts.length === 0) throw new Error('没有可用账户');
        const adminAccount = accounts[0];
        console.log('使用管理员账户:', adminAccount);

        // 3. 加载合约
        const contractAddress = '0x0165878A594ca255338adfa4d48449f69242Eb8F';
        // 尝试加载 Artifact
        const artifactPath = path.join(__dirname, '../src/artifacts/contracts/CertificateNFT.sol/CertificateNFT.json');
        if (!fs.existsSync(artifactPath)) throw new Error('找不到 Artifact 文件');
        
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
        const abi = artifact.abi;
        
        const contract = new web3.eth.Contract(abi, contractAddress);
        console.log('合约加载成功:', contractAddress);

        // 4. 调用 test()
        try {
            const testResult = await contract.methods.test().call();
            console.log('Test function result:', testResult);
        } catch (e) {
            console.error('Test function failed:', e.message);
        }

        // 5. 尝试调用 mintCertificate
        const certificateNumber = 'TEST-' + Date.now();
        const metadataURI = 'ipfs://QmTest';

        console.log('准备铸造证书:', { certificateNumber, metadataURI });

        // 6. 估算 Gas
        try {
            const gas = await contract.methods.mintCertificate(certificateNumber, metadataURI).estimateGas({ from: adminAccount });
            console.log('Gas 估算成功:', gas);
        } catch (e) {
            console.error('Gas 估算失败:', e.message);
             if (e.data) console.error('Data:', e.data);
        }

        // 7. 发送交易
        console.log('发送交易...');
        const result = await contract.methods.mintCertificate(certificateNumber, metadataURI).send({
            from: adminAccount,
            gas: 500000
        });

        console.log('交易成功!');
        console.log('Tx Hash:', result.transactionHash);
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

main();
