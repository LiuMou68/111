# 区块链环境配置脚本
# PowerShell脚本
# 使用英文提示避免编码问题

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Configure Blockchain Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 获取脚本所在目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir
$envFile = Join-Path $projectRoot ".env"

# 检查.env文件是否存在
$envExists = Test-Path $envFile

if (-not $envExists) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item (Join-Path $projectRoot ".env.example") $envFile -ErrorAction SilentlyContinue
    if (-not (Test-Path $envFile)) {
        # 如果.env.example不存在，创建新的.env文件
        New-Item -Path $envFile -ItemType File | Out-Null
    }
}

Write-Host "Current .env file path: $envFile" -ForegroundColor Green
Write-Host ""

# 读取现有配置
$envContent = @{}
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $envContent[$matches[1].Trim()] = $matches[2].Trim()
        }
    }
}

# 配置区块链相关环境变量
Write-Host "Configure blockchain environment variables:" -ForegroundColor Cyan
Write-Host ""

# RPC URL
if (-not $envContent.ContainsKey("RPC_URL")) {
    $rpcUrl = Read-Host "Enter RPC URL (default: http://localhost:8545)"
    if ([string]::IsNullOrWhiteSpace($rpcUrl)) {
        $rpcUrl = "http://localhost:8545"
    }
    $envContent["RPC_URL"] = $rpcUrl
    Write-Host "RPC_URL = $rpcUrl" -ForegroundColor Green
}

# 合约地址
if (-not $envContent.ContainsKey("CONTRACT_ADDRESS")) {
    $contractAddress = Read-Host "Enter contract address (if not deployed yet, run deployment script first)"
    if (-not [string]::IsNullOrWhiteSpace($contractAddress)) {
        $envContent["CONTRACT_ADDRESS"] = $contractAddress
        Write-Host "CONTRACT_ADDRESS = $contractAddress" -ForegroundColor Green
    }
}

# 管理员钱包地址
if (-not $envContent.ContainsKey("ADMIN_WALLET_ADDRESS")) {
    $adminAddress = Read-Host "Enter admin wallet address (if not deployed yet, run deployment script first)"
    if (-not [string]::IsNullOrWhiteSpace($adminAddress)) {
        $envContent["ADMIN_WALLET_ADDRESS"] = $adminAddress
        Write-Host "ADMIN_WALLET_ADDRESS = $adminAddress" -ForegroundColor Green
    }
}

# 管理员私钥
if (-not $envContent.ContainsKey("ADMIN_WALLET_PRIVATE_KEY")) {
    Write-Host ""
    Write-Host "Admin private key configuration (sensitive information)" -ForegroundColor Yellow
    $configurePrivateKey = Read-Host "Configure admin private key now? (y/n)"
    if ($configurePrivateKey -eq "y" -or $configurePrivateKey -eq "Y") {
        $privateKey = Read-Host "Enter admin private key (without 0x prefix)" -AsSecureString
        $privateKeyPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($privateKey))
        $envContent["ADMIN_WALLET_PRIVATE_KEY"] = $privateKeyPlain
        Write-Host "ADMIN_WALLET_PRIVATE_KEY configured" -ForegroundColor Green
    } else {
        Write-Host "Skipped private key configuration, you can add it manually to .env file later" -ForegroundColor Yellow
    }
}

# 写入.env文件
Write-Host ""
Write-Host "Updating .env file..." -ForegroundColor Yellow

$newContent = @()
$existingKeys = New-Object System.Collections.ArrayList

# 读取现有文件内容，保留注释和格式
if (Test-Path $envFile) {
    $lines = Get-Content $envFile
    foreach ($line in $lines) {
        if ($line -match '^([^#][^=]+)=') {
            $key = $matches[1].Trim()
            if ($envContent.ContainsKey($key)) {
                $newContent += "$key=$($envContent[$key])"
                [void]$existingKeys.Add($key)
            } else {
                $newContent += $line
            }
        } else {
            $newContent += $line
        }
    }
}

# 添加新的配置项
foreach ($key in $envContent.Keys) {
    if (-not $existingKeys.Contains($key)) {
        $newContent += "$key=$($envContent[$key])"
    }
}

# 写入文件
$newContent | Set-Content $envFile

Write-Host ""
Write-Host "Environment variables configuration completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration file location: $envFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
