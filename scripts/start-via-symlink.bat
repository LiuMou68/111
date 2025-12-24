@echo off
chcp 65001 >nul
title 通过符号链接启动前端
echo ==========================================
echo    通过符号链接启动（解决路径问题）
echo ==========================================
echo.

set SYMLINK_PATH=C:\Projects\cert-system

if not exist "%SYMLINK_PATH%" (
    echo [错误] 符号链接不存在: %SYMLINK_PATH%
    echo.
    echo 请先运行: scripts\create-symlink.bat
    echo （需要管理员权限）
    pause
    exit /b 1
)

echo 切换到符号链接路径: %SYMLINK_PATH%
cd /d "%SYMLINK_PATH%"

echo 当前工作目录: %CD%
echo.

echo 正在启动前端服务...
call npm run start:frontend

