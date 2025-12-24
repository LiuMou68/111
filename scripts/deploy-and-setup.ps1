# 完整部署脚本 - 编译、部署合约并配置环境
# PowerShell脚本
# 使用英文提示避免编码问题

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Complete Deployment Process" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 获取脚本所在目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir

Set-Location $projectRoot

# 步骤1: 编译合约
Write-Host "Step 1/4: Compiling smart contracts..." -ForegroundColor Yellow
Write-Host ""
try {
    npx hardhat compile
    if ($LASTEXITCODE -ne 0) {
        throw "Compilation failed"
    }
    Write-Host "Contract compilation successful!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "Contract compilation failed: $_" -ForegroundColor Red
    exit 1
}

# 步骤2: 检查Hardhat节点是否运行
Write-Host "Step 2/4: Checking Hardhat node..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Please ensure Hardhat node is running!" -ForegroundColor Yellow
Write-Host "If not running, please run in another terminal: npm run start:blockchain" -ForegroundColor Yellow
Write-Host ""
$continue = Read-Host "Is Hardhat node running? (y/n)"
if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host "Please start Hardhat node first, then run this script again" -ForegroundColor Yellow
    exit 0
}

# 步骤3: 部署合约
Write-Host ""
Write-Host "Step 3/4: Deploying smart contracts..." -ForegroundColor Yellow
Write-Host ""
try {
    npx hardhat run scripts/deploy-points-certificate.js --network localhost
    if ($LASTEXITCODE -ne 0) {
        throw "Deployment failed"
    }
    Write-Host ""
    Write-Host "Contract deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Please copy the contract address and admin address above, then run:" -ForegroundColor Yellow
    Write-Host "  .\scripts\setup-blockchain.ps1" -ForegroundColor Cyan
} catch {
    Write-Host "Contract deployment failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Hardhat node is running" -ForegroundColor White
    Write-Host "  2. Network configuration is correct" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
