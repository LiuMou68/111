# 检查数据库表是否存在
# PowerShell脚本
# 使用UTF-8编码，英文提示避免编码问题

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Check Database Tables" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 提示用户输入MySQL密码
$password = Read-Host -AsSecureString "Enter MySQL root password"
$passwordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

# 需要检查的表
$requiredTables = @(
    "activity",
    "activity_participation",
    "points_blockchain",
    "certificate_blockchain",
    "user_wallet",
    "certificate_rules",
    "points_event",
    "check_in"
)

Write-Host "Checking database tables..." -ForegroundColor Yellow
Write-Host ""

$missingTables = @()
$existingTables = @()

foreach ($table in $requiredTables) {
    $query = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'certificate_db' AND TABLE_NAME = '$table'"
    
    try {
        $result = mysql -u root -p"$passwordPlain" certificate_db -e $query 2>&1
        if ($LASTEXITCODE -eq 0 -and $result -match $table) {
            Write-Host "  [OK] $table" -ForegroundColor Green
            $existingTables += $table
        } else {
            Write-Host "  [MISSING] $table" -ForegroundColor Red
            $missingTables += $table
        }
    } catch {
        Write-Host "  [ERROR] $table (Check failed)" -ForegroundColor Red
        $missingTables += $table
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Check Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Existing tables: $($existingTables.Count)/$($requiredTables.Count)" -ForegroundColor Green
Write-Host "Missing tables: $($missingTables.Count)/$($requiredTables.Count)" -ForegroundColor $(if ($missingTables.Count -eq 0) { "Green" } else { "Red" })

if ($missingTables.Count -gt 0) {
    Write-Host ""
    Write-Host "Missing tables:" -ForegroundColor Yellow
    foreach ($table in $missingTables) {
        Write-Host "  - $table" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Solution:" -ForegroundColor Yellow
    Write-Host "  Run: npm run update:database" -ForegroundColor Cyan
    Write-Host "  Or execute: mysql -u root -p certificate_db < database\add_activity_system.sql" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "All required tables exist!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
