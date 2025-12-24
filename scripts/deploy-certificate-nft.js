/**
 * 部署 CertificateNFT 合约脚本
 * 使用 Hardhat 部署 ERC721 NFT 证书合约
 */

const hre = require("hardhat");

async function main() {
  console.log("======================================");
  console.log("部署 CertificateNFT 合约");
  console.log("======================================\n");

  // 获取部署账户
  const [deployer] = await hre.ethers.getSigners();
  console.log("部署账户:", deployer.address);
  
  // 检查账户余额
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("账户余额:", hre.ethers.formatEther(balance), "ETH\n");

  // 合约参数
  const name = "社团证书 NFT";
  const symbol = "CERT";
  // 系统钱包地址（持有所有证书，默认使用部署者地址）
  const systemWallet = deployer.address;

  console.log("合约参数:");
  console.log("  Name:", name);
  console.log("  Symbol:", symbol);
  console.log("  System Wallet:", systemWallet);
  console.log("");

  // 部署合约
  console.log("正在部署合约...");
  const CertificateNFT = await hre.ethers.getContractFactory("CertificateNFT");
  const certificateNFT = await CertificateNFT.deploy(name, symbol, systemWallet);

  // 等待部署完成
  await certificateNFT.waitForDeployment();
  const contractAddress = await certificateNFT.getAddress();

  console.log("\n✅ 合约部署成功!");
  console.log("合约地址:", contractAddress);
  console.log("");

  // 验证部署
  console.log("验证部署...");
  const owner = await certificateNFT.owner();
  const admin = await certificateNFT.admin();
  const nextTokenId = await certificateNFT.getNextTokenId();

  console.log("合约所有者:", owner);
  console.log("管理员地址:", admin);
  console.log("下一个 Token ID:", nextTokenId.toString());
  console.log("");

  // 保存部署信息
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployer: deployer.address,
    name: name,
    symbol: symbol,
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };

  console.log("部署信息:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log("");

  // 输出环境变量配置
  console.log("======================================");
  console.log("请将以下内容添加到 .env 文件:");
  console.log("======================================");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`VITE_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("");

  // 如果是在本地网络，提示下一步操作
  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    console.log("======================================");
    console.log("下一步操作:");
    console.log("======================================");
    console.log("1. 将合约地址添加到 .env 文件");
    console.log("2. 在前端配置文件中设置合约地址");
    console.log("3. 确保 MetaMask 连接到本地网络 (http://localhost:8545)");
    console.log("4. 在 MetaMask 中添加合约地址以查看 NFT");
    console.log("");
  }

  return {
    contractAddress,
    deploymentInfo
  };
}

// 执行部署
main()
  .then((result) => {
    console.log("部署完成!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("部署失败:", error);
    process.exit(1);
  });

