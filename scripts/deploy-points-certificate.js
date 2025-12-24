// 部署PointsAndCertificate合约
// 使用正确的文件名引用hardhat配置
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  try {
    console.log("开始部署 PointsAndCertificate 合约...");

    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("账户余额:", ethers.formatEther(balance), "ETH");

    // 获取合约工厂
    const PointsAndCertificate = await ethers.getContractFactory("PointsAndCertificate");
    
    // 部署合约
    console.log("正在部署合约...");
    const contract = await PointsAndCertificate.deploy();
    
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("\n✅ 合约部署成功！");
    console.log("合约地址:", contractAddress);
    console.log("部署账户:", deployer.address);
    console.log("\n请将以下信息添加到 .env 文件：");
    console.log(`CONTRACT_ADDRESS=${contractAddress}`);
    console.log(`ADMIN_WALLET_ADDRESS=${deployer.address}`);
    console.log("\n⚠️  注意：请保存管理员私钥到 .env 文件的 ADMIN_WALLET_PRIVATE_KEY（不含0x前缀）");
    console.log("   可以从 Hardhat 账户列表中获取私钥（前20个账户）");
  } catch (error) {
    console.error("部署失败:", error);
    console.error("错误详情:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

