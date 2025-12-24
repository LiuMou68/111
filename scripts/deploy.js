// 使用正确的文件名引用hardhat配置
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  try {
    console.log("开始部署证书合约...");
    
    // 获取合约工厂
    const CertificateNFT = await ethers.getContractFactory("CertificateNFT");
    
    // 获取部署者账户作为系统钱包
    const [deployer] = await ethers.getSigners();
    const systemWallet = deployer.address;
    console.log("使用系统钱包地址:", systemWallet);

    // 部署合约
    console.log("部署合约中...");
    const certificateContract = await CertificateNFT.deploy("University Certificate", "UCERT", systemWallet);
    
    // 等待合约部署完成
    console.log("等待交易确认...");
    await certificateContract.waitForDeployment();
    
    // 获取合约地址
    const contractAddress = await certificateContract.getAddress();
    console.log("证书合约部署成功，地址:", contractAddress);
    
    // 自动更新 .env 文件
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env');
    
    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        // 更新或添加 CONTRACT_ADDRESS
        if (envContent.includes('CONTRACT_ADDRESS=')) {
            envContent = envContent.replace(/CONTRACT_ADDRESS=.*/g, `CONTRACT_ADDRESS=${contractAddress}`);
        } else {
            envContent += `\nCONTRACT_ADDRESS=${contractAddress}`;
        }
        // 同时更新 VITE_CONTRACT_ADDRESS (如果存在，用于前端)
        if (envContent.includes('VITE_CONTRACT_ADDRESS=')) {
            envContent = envContent.replace(/VITE_CONTRACT_ADDRESS=.*/g, `VITE_CONTRACT_ADDRESS=${contractAddress}`);
        } else {
            envContent += `\nVITE_CONTRACT_ADDRESS=${contractAddress}`;
        }
        
        fs.writeFileSync(envPath, envContent);
        console.log(`已自动更新 .env 文件中的合约地址: ${contractAddress}`);
    } else {
        console.log(`未找到 .env 文件，请手动创建并添加: CONTRACT_ADDRESS=${contractAddress}`);
    }
  } catch (error) {
    console.error("部署失败:", error);
    console.error("错误详情:", error.message);
    process.exit(1);
  }
}

// 运行部署函数
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("部署失败:", error);
    console.error("错误详情:", error.message);
    process.exit(1);
  });

