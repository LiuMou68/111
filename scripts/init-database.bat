@echo off
chcp 65001 >nul
title 初始化数据库
echo ==========================================
echo    初始化数据库
echo ==========================================
echo.

cd /d "%~dp0.."

echo 正在检查数据库脚本...
if not exist "database\database.sql" (
    echo [错误] 找不到 database\database.sql 文件
    pause
    exit /b 1
)

echo 数据库脚本位置: %CD%\database\database.sql
echo.

echo 请确保 MySQL 服务已启动，然后按任意键继续...
pause >nul

echo.
echo 正在导入数据库...
echo 提示: 需要输入 MySQL root 密码
echo.

mysql -u root -p < database\database.sql

if errorlevel 1 (
    echo.
    echo [错误] 数据库导入失败
    echo.
    echo 可能的原因：
    echo 1. MySQL 服务未启动
    echo 2. 密码错误
    echo 3. 数据库已存在
    echo.
    echo 如果数据库已存在，可以忽略此错误
    pause
    exit /b 1
) else (
    echo.
    echo [成功] 数据库初始化完成！
    echo.
    echo 数据库名称: certificate_db
    echo 默认账号: admin / 123456
    echo 默认学生: student / 123456
    echo.
)

pause

