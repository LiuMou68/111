const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateContract", function () {
  let certificateContract;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const CertificateContract = await ethers.getContractFactory("CertificateContract");
    certificateContract = await CertificateContract.deploy();
    await certificateContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("应该设置正确的所有者", async function () {
      expect(await certificateContract.owner()).to.equal(owner.address);
    });
  });

  describe("证书颁发", function () {
    it("应该能够颁发证书", async function () {
      const certificateId = "CERT001";
      const studentName = "张三";
      const studentId = "2021001";
      const certificateType = "优秀学生";
      const organization = "XX大学";
      const issueDate = "2024-01-01";
      const description = "优秀学生证书";
      const certificateHash = "QmTestHash";

      await expect(
        certificateContract.issueCertificate(
          certificateId,
          studentName,
          studentId,
          certificateType,
          organization,
          issueDate,
          description,
          certificateHash
        )
      ).to.emit(certificateContract, "CertificateIssued");
    });
  });
});

