# 更新数据库脚本 - 执行 add_activity_system.sql
# PowerShell脚本
# 使用UTF-8 with BOM编码保存

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   更新数据库 - 活动管理系统" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 获取脚本所在目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir
$sqlFile = Join-Path $projectRoot "database\add_activity_system.sql"

# 检查SQL文件是否存在
if (-not (Test-Path $sqlFile)) {
    Write-Host "Error: SQL file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "SQL file path: $sqlFile" -ForegroundColor Green
Write-Host ""

# 提示用户输入MySQL密码
$password = Read-Host -AsSecureString "Enter MySQL root password"
$passwordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

# 执行SQL文件
try {
    Write-Host "Executing database update script..." -ForegroundColor Yellow
    $sqlContent = Get-Content $sqlFile -Raw -Encoding UTF8
    $sqlContent | mysql -u root -p"$passwordPlain" certificate_db 2>&1
    
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        throw "MySQL execution failed with exit code: $LASTEXITCODE"
    }
    
    Write-Host ""
    Write-Host "Database update successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Created tables:" -ForegroundColor Cyan
    Write-Host "  - activity (Activity table)" -ForegroundColor White
    Write-Host "  - activity_participation (Activity participation table)" -ForegroundColor White
    Write-Host "  - points_blockchain (Points blockchain table)" -ForegroundColor White
    Write-Host "  - certificate_blockchain (Certificate blockchain table)" -ForegroundColor White
    Write-Host "  - user_wallet (User wallet table)" -ForegroundColor White
    Write-Host ""
    Write-Host "Added activity admin role and test account:" -ForegroundColor Cyan
    Write-Host "  Username: activity_admin" -ForegroundColor White
    Write-Host "  Password: 123456" -ForegroundColor White
} catch {
    Write-Host ""
    Write-Host "Database update failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. MySQL service is running" -ForegroundColor White
    Write-Host "  2. Password is correct" -ForegroundColor White
    Write-Host "  3. certificate_db database exists" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
