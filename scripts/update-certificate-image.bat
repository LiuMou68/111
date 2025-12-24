@echo off
chcp 65001 >nul
echo ========================================
echo 更新证书表 - 添加图片字段
echo ========================================
echo.

cd /d "%~dp0\.."
mysql -u root -p certificate_db < "database\add_certificate_image.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo 更新成功！
    echo ========================================
) else (
    echo.
    echo ========================================
    echo 更新失败，请检查错误信息
    echo ========================================
)

pause

