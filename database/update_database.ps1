# PowerShell脚本：更新数据库表结构
# 使用方法：在PowerShell中执行 .\database\update_database.ps1

Write-Host "正在更新数据库表结构..." -ForegroundColor Green

# 读取SQL文件内容
$sqlFile = Join-Path $PSScriptRoot "update_user_table_simple.sql"
$sqlContent = Get-Content $sqlFile -Raw

# 提示输入MySQL密码
$password = Read-Host "请输入MySQL root密码" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

# 执行SQL
$sqlContent | mysql -u root -p$passwordPlain certificate_db

if ($LASTEXITCODE -eq 0) {
    Write-Host "数据库更新成功！" -ForegroundColor Green
} else {
    Write-Host "数据库更新失败，请检查错误信息" -ForegroundColor Red
}

