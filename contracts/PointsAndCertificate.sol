// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PointsAndCertificate
 * @dev 积分和证书上链合约
 * 功能：
 * 1. 记录积分上链（活动、签到等）
 * 2. 确保证书唯一性（通过IPFS哈希）
 * 3. 查询积分和证书记录
 */
contract PointsAndCertificate {
    // 事件定义
    event PointsAwarded(
        address indexed user,
        uint256 points,
        string sourceType,
        uint256 sourceId,
        string ipfsHash,
        uint256 timestamp
    );

    event CertificateIssued(
        address indexed user,
        string certificateNumber,
        string ipfsHash,
        uint256 timestamp
    );

    // 积分记录结构
    struct PointsRecord {
        address user;
        uint256 points;
        string sourceType; // "activity", "checkin", "manual"
        uint256 sourceId;
        string ipfsHash;
        uint256 timestamp;
        uint256 blockNumber;
    }

    // 证书记录结构
    struct CertificateRecord {
        address user;
        string certificateNumber;
        string ipfsHash;
        uint256 timestamp;
        uint256 blockNumber;
    }

    // 管理员地址
    address public admin;

    // 存储用户的积分记录
    mapping(address => PointsRecord[]) public userPointsRecords;
    
    // 存储证书记录（通过证书编号索引）
    mapping(string => CertificateRecord) public certificates;
    
    // 存储用户的所有证书编号
    mapping(address => string[]) public userCertificates;

    // 用户总积分（从链上记录计算）
    mapping(address => uint256) public userTotalPoints;

    // 修饰符：仅管理员
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev 发放积分（活动、签到等）
     * @param user 用户地址
     * @param points 积分数量
     * @param sourceType 来源类型（"activity", "checkin", "manual"）
     * @param sourceId 来源ID（活动ID、签到ID等）
     * @param ipfsHash IPFS哈希值
     */
    function awardPoints(
        address user,
        uint256 points,
        string memory sourceType,
        uint256 sourceId,
        string memory ipfsHash
    ) public onlyAdmin {
        require(user != address(0), "Invalid user address");
        require(points > 0, "Points must be greater than 0");

        PointsRecord memory record = PointsRecord({
            user: user,
            points: points,
            sourceType: sourceType,
            sourceId: sourceId,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        userPointsRecords[user].push(record);
        userTotalPoints[user] += points;

        emit PointsAwarded(
            user,
            points,
            sourceType,
            sourceId,
            ipfsHash,
            block.timestamp
        );
    }

    /**
     * @dev 批量发放积分（活动结束后批量发放）
     * @param users 用户地址数组
     * @param points 积分数量数组
     * @param sourceType 来源类型
     * @param sourceId 来源ID
     * @param ipfsHashes IPFS哈希数组
     */
    function batchAwardPoints(
        address[] memory users,
        uint256[] memory points,
        string memory sourceType,
        uint256 sourceId,
        string[] memory ipfsHashes
    ) public onlyAdmin {
        require(users.length == points.length, "Arrays length mismatch");
        require(users.length == ipfsHashes.length, "Arrays length mismatch");

        for (uint256 i = 0; i < users.length; i++) {
            awardPoints(users[i], points[i], sourceType, sourceId, ipfsHashes[i]);
        }
    }

    /**
     * @dev 发行证书（确保证书唯一性）
     * @param user 用户地址
     * @param certificateNumber 证书编号（必须唯一）
     * @param ipfsHash IPFS哈希值
     */
    function issueCertificate(
        address user,
        string memory certificateNumber,
        string memory ipfsHash
    ) public onlyAdmin {
        require(user != address(0), "Invalid user address");
        require(bytes(certificateNumber).length > 0, "Certificate number cannot be empty");
        require(bytes(certificates[certificateNumber].certificateNumber).length == 0, "Certificate number already exists");

        CertificateRecord memory record = CertificateRecord({
            user: user,
            certificateNumber: certificateNumber,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        certificates[certificateNumber] = record;
        userCertificates[user].push(certificateNumber);

        emit CertificateIssued(user, certificateNumber, ipfsHash, block.timestamp);
    }

    /**
     * @dev 查询用户积分记录数量
     */
    function getUserPointsRecordCount(address user) public view returns (uint256) {
        return userPointsRecords[user].length;
    }

    /**
     * @dev 查询用户积分记录
     */
    function getUserPointsRecord(address user, uint256 index) public view returns (PointsRecord memory) {
        require(index < userPointsRecords[user].length, "Index out of bounds");
        return userPointsRecords[user][index];
    }

    /**
     * @dev 查询用户总积分
     */
    function getUserTotalPoints(address user) public view returns (uint256) {
        return userTotalPoints[user];
    }

    /**
     * @dev 查询证书信息
     */
    function getCertificate(string memory certificateNumber) public view returns (CertificateRecord memory) {
        return certificates[certificateNumber];
    }

    /**
     * @dev 验证证书是否存在
     */
    function certificateExists(string memory certificateNumber) public view returns (bool) {
        return bytes(certificates[certificateNumber].certificateNumber).length > 0;
    }

    /**
     * @dev 查询用户的所有证书编号
     */
    function getUserCertificates(address user) public view returns (string[] memory) {
        return userCertificates[user];
    }

    /**
     * @dev 转移管理员权限
     */
    function transferAdmin(address newAdmin) public onlyAdmin {
        require(newAdmin != address(0), "Invalid admin address");
        admin = newAdmin;
    }
}

