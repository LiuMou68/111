// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateContract {
    // 证书结构体
    struct Certificate {
        string certificateId;
        string studentName;
        string studentId;
        string certificateType;
        string organization;
        string issueDate;
        string description;
        string certificateHash; // IPFS哈希值
        address issuer;
        bool isValid;
        uint256 timestamp;
    }

    // 状态变量
    Certificate[] public certificates;
    mapping(string => uint256) public certificateIdToIndex; // 证书ID到索引的映射
    mapping(string => bool) public certificateExists; // 检查证书ID是否存在
    uint256 public certificateCount;
    address public owner;

    // 事件
    event CertificateIssued(
        uint256 indexed certificateIndex,
        string indexed certificateId,
        string studentName,
        string studentId,
        address indexed issuer,
        uint256 timestamp
    );
    event CertificateRevoked(
        uint256 indexed certificateIndex,
        string indexed certificateId,
        string reason
    );
    event CertificateVerified(
        uint256 indexed certificateIndex,
        string indexed certificateId,
        bool isValid
    );

    // 修饰器
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // 颁发证书
    function issueCertificate(
        string memory _certificateId,
        string memory _studentName,
        string memory _studentId,
        string memory _certificateType,
        string memory _organization,
        string memory _issueDate,
        string memory _description,
        string memory _certificateHash
    ) public returns (uint256) {
        require(bytes(_certificateId).length > 0, "Certificate ID cannot be empty");
        require(!certificateExists[_certificateId], "Certificate ID already exists");
        require(bytes(_studentName).length > 0, "Student name cannot be empty");
        require(bytes(_studentId).length > 0, "Student ID cannot be empty");
        require(bytes(_certificateHash).length > 0, "Certificate hash cannot be empty");

        Certificate memory newCertificate = Certificate({
            certificateId: _certificateId,
            studentName: _studentName,
            studentId: _studentId,
            certificateType: _certificateType,
            organization: _organization,
            issueDate: _issueDate,
            description: _description,
            certificateHash: _certificateHash,
            issuer: msg.sender,
            isValid: true,
            timestamp: block.timestamp
        });

        certificates.push(newCertificate);
        uint256 index = certificateCount++;
        certificateIdToIndex[_certificateId] = index;
        certificateExists[_certificateId] = true;

        emit CertificateIssued(index, _certificateId, _studentName, _studentId, msg.sender, block.timestamp);
        return index;
    }

    // 获取证书详情
    function getCertificate(uint256 _index) public view returns (
        string memory certificateId,
        string memory studentName,
        string memory studentId,
        string memory certificateType,
        string memory organization,
        string memory issueDate,
        string memory description,
        string memory certificateHash,
        address issuer,
        bool isValid,
        uint256 timestamp
    ) {
        require(_index < certificateCount, "Certificate does not exist");
        Certificate memory cert = certificates[_index];
        return (
            cert.certificateId,
            cert.studentName,
            cert.studentId,
            cert.certificateType,
            cert.organization,
            cert.issueDate,
            cert.description,
            cert.certificateHash,
            cert.issuer,
            cert.isValid,
            cert.timestamp
        );
    }

    // 通过证书ID获取证书
    function getCertificateById(string memory _certificateId) public view returns (
        string memory certificateId,
        string memory studentName,
        string memory studentId,
        string memory certificateType,
        string memory organization,
        string memory issueDate,
        string memory description,
        string memory certificateHash,
        address issuer,
        bool isValid,
        uint256 timestamp
    ) {
        require(certificateExists[_certificateId], "Certificate does not exist");
        uint256 index = certificateIdToIndex[_certificateId];
        return getCertificate(index);
    }

    // 撤销证书
    function revokeCertificate(string memory _certificateId, string memory _reason) public onlyOwner {
        require(certificateExists[_certificateId], "Certificate does not exist");
        uint256 index = certificateIdToIndex[_certificateId];
        require(certificates[index].isValid, "Certificate is already revoked");
        
        certificates[index].isValid = false;
        emit CertificateRevoked(index, _certificateId, _reason);
    }

    // 验证证书
    function verifyCertificate(string memory _certificateId) public view returns (bool) {
        if (!certificateExists[_certificateId]) {
            return false;
        }
        uint256 index = certificateIdToIndex[_certificateId];
        return certificates[index].isValid;
    }

    // 获取证书总数
    function getCertificateCount() public view returns (uint256) {
        return certificateCount;
    }
}

