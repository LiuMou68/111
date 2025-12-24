// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CertificateNFT
 * @dev ERC721 NFT 证书合约
 * 功能：
 * 1. 管理员可以铸造证书 NFT（铸造到系统钱包）
 * 2. 每张证书对应一个唯一的 tokenId
 * 3. tokenURI 指向 IPFS metadata（包含学生信息）
 * 4. 支持通过证书编号查询 tokenId
 * 5. 证书不可销毁（不可篡改）
 * 
 * 设计说明：
 * - 所有证书都铸造到系统钱包（管理员钱包）
 * - 学生信息存储在 metadata 中
 * - 通过证书编号可以查询和验证证书
 */
contract CertificateNFT is ERC721URIStorage, Ownable {
    
    // Token ID 计数器
    uint256 private _tokenIdCounter;
    
    // 管理员地址（可以铸造证书）
    address public admin;
    
    // 系统钱包地址（持有所有证书）
    address public systemWallet;
    
    // 证书编号到 tokenId 的映射（用于快速查询）
    mapping(string => uint256) public certificateNumberToTokenId;
    
    function test() external pure returns (bool) {
        return true;
    }
    
    // tokenId 到证书编号的映射（反向查询）
    mapping(uint256 => string) public tokenIdToCertificateNumber;
    
    // 事件：证书铸造
    event CertificateMinted(
        address indexed to,
        uint256 indexed tokenId,
        string certificateNumber,
        string metadataURI
    );
    
    /**
     * @dev 构造函数
     * @param _name NFT 名称
     * @param _symbol NFT 符号
     * @param _systemWallet 系统钱包地址（持有所有证书）
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _systemWallet
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        admin = msg.sender;
        systemWallet = _systemWallet != address(0) ? _systemWallet : msg.sender;
        // 从 1 开始计数
        _tokenIdCounter = 1;
    }
    
    /**
     * @dev 设置管理员地址
     * @param _admin 新的管理员地址
     */
    function setAdmin(address _admin) external onlyOwner {
        require(_admin != address(0), "Invalid admin address");
        admin = _admin;
    }
    
    /**
     * @dev 设置系统钱包地址
     * @param _systemWallet 新的系统钱包地址
     */
    function setSystemWallet(address _systemWallet) external onlyOwner {
        require(_systemWallet != address(0), "Invalid system wallet address");
        systemWallet = _systemWallet;
    }
    
    /**
     * @dev 修饰符：仅管理员
     */
    modifier onlyAdmin() {
        require(msg.sender == admin || msg.sender == owner(), "Only admin can call this function");
        _;
    }
    
    /**
     * @dev 铸造证书 NFT（铸造到系统钱包）
     * @param certificateNumber 证书编号（唯一标识）
     * @param metadataURI IPFS metadata URI (格式: ipfs://metadataCID)
     * @return tokenId 返回铸造的 tokenId
     */
    function mintCertificate(
        string memory certificateNumber,
        string memory metadataURI
    ) external onlyAdmin returns (uint256) {
        require(bytes(certificateNumber).length > 0, "Certificate number cannot be empty");
        require(bytes(metadataURI).length > 0, "Metadata URI cannot be empty");
        
        // 检查证书编号是否已存在
        require(certificateNumberToTokenId[certificateNumber] == 0, "Certificate number already exists");
        
        // 获取当前 tokenId 并递增
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter += 1;
        
        // 铸造 NFT 到系统钱包
        _safeMint(systemWallet, tokenId);
        
        // 设置 tokenURI（指向 IPFS metadata）
        _setTokenURI(tokenId, metadataURI);
        
        // 建立证书编号与 tokenId 的映射
        certificateNumberToTokenId[certificateNumber] = tokenId;
        tokenIdToCertificateNumber[tokenId] = certificateNumber;
        
        // 触发事件
        emit CertificateMinted(systemWallet, tokenId, certificateNumber, metadataURI);
        
        return tokenId;
    }
    
    /**
     * @dev 批量铸造证书
     * @param certificateNumbers 证书编号数组
     * @param metadataURIs IPFS metadata URI 数组
     * @return tokenIds 返回铸造的 tokenId 数组
     */
    function mintCertificatesBatch(
        string[] memory certificateNumbers,
        string[] memory metadataURIs
    ) external onlyAdmin returns (uint256[] memory) {
        require(certificateNumbers.length == metadataURIs.length, "Arrays length mismatch");
        
        uint256[] memory tokenIds = new uint256[](certificateNumbers.length);
        
        for (uint256 i = 0; i < certificateNumbers.length; i++) {
            require(bytes(certificateNumbers[i]).length > 0, "Certificate number cannot be empty");
            require(bytes(metadataURIs[i]).length > 0, "Metadata URI cannot be empty");
            require(certificateNumberToTokenId[certificateNumbers[i]] == 0, "Certificate number already exists");
            
            uint256 tokenId = _tokenIdCounter;
            _tokenIdCounter += 1;
            
            _safeMint(systemWallet, tokenId);
            _setTokenURI(tokenId, metadataURIs[i]);
            
            certificateNumberToTokenId[certificateNumbers[i]] = tokenId;
            tokenIdToCertificateNumber[tokenId] = certificateNumbers[i];
            
            emit CertificateMinted(systemWallet, tokenId, certificateNumbers[i], metadataURIs[i]);
            
            tokenIds[i] = tokenId;
        }
        
        return tokenIds;
    }
    
    /**
     * @dev 通过证书编号查询 tokenId
     * @param certificateNumber 证书编号
     * @return tokenId Token ID，如果不存在返回 0
     */
    function getTokenIdByCertificateNumber(string memory certificateNumber) external view returns (uint256) {
        return certificateNumberToTokenId[certificateNumber];
    }
    
    /**
     * @dev 通过 tokenId 查询证书编号
     * @param tokenId Token ID
     * @return certificateNumber 证书编号
     */
    function getCertificateNumberByTokenId(uint256 tokenId) external view returns (string memory) {
        return tokenIdToCertificateNumber[tokenId];
    }
    
    /**
     * @dev 验证证书是否存在
     * @param certificateNumber 证书编号
     * @return exists 是否存在
     * @return tokenId Token ID（如果存在）
     */
    function verifyCertificate(string memory certificateNumber) external view returns (bool exists, uint256 tokenId) {
        tokenId = certificateNumberToTokenId[certificateNumber];
        exists = tokenId != 0 && _ownerOf(tokenId) != address(0);
    }
    
    /**
     * @dev 获取下一个 tokenId
     * @return 下一个 tokenId
     */
    function getNextTokenId() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev 获取总铸造数量
     * @return 总数量
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter - 1;
    }
    
    /**
     * @dev 查询系统钱包拥有的证书数量
     * @return 证书数量
     */
    function systemWalletBalance() external view returns (uint256) {
        return balanceOf(systemWallet);
    }
    
    /**
     * @dev 查询 tokenId 的所有者（始终是系统钱包）
     * @param tokenId Token ID
     * @return 所有者地址（系统钱包）
     */
    function ownerOf(uint256 tokenId) public view override(ERC721, IERC721) returns (address) {
        return super.ownerOf(tokenId);
    }
    
    /**
     * @dev 查询 tokenId 的 URI
     * @param tokenId Token ID
     * @return IPFS metadata URI
     */
    function tokenURI(uint256 tokenId) public view override(ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    /**
     * @dev 重写 _update 函数，禁止转账（证书不可转让）
     * 所有证书由系统钱包持有，不允许转账
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) returns (address) {
        // 只允许从零地址铸造（首次铸造）
        if (to != address(0) && _ownerOf(tokenId) != address(0)) {
            revert("Certificates are non-transferable");
        }
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev 必须重写 supportsInterface
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
