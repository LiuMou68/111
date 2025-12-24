/**
 * CertificateNFT 合约 ABI
 * 从编译后的 artifacts 自动生成，或手动维护
 */

// ERC721 标准 ABI（基础功能）
export const ERC721_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

// CertificateNFT 合约完整 ABI
export const CertificateNFT_ABI = [
  // ERC721 标准函数
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  
  // CertificateNFT 特有函数
  "function mintCertificate(address to, string memory metadataURI) external returns (uint256)",
  "function mintCertificatesBatch(address[] memory recipients, string[] memory metadataURIs) external returns (uint256[] memory)",
  "function getNextTokenId() view returns (uint256)",
  "function setAdmin(address _admin) external",
  
  // 管理员和所有者
  "function admin() view returns (address)",
  "function owner() view returns (address)",
  
  // 事件
  "event CertificateMinted(address indexed to, uint256 indexed tokenId, string metadataURI)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

// 如果合约已编译，可以从 artifacts 导入
// import CertificateNFTArtifact from '../artifacts/contracts/CertificateNFT.sol/CertificateNFT.json';
// export const CertificateNFT_ABI = CertificateNFTArtifact.abi;

export default CertificateNFT_ABI;

