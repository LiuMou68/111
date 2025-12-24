@echo off
chcp 65001 >nul
title 创建符号链接解决路径问题
echo ==========================================
echo    创建符号链接（解决中文路径问题）
echo ==========================================
echo.

REM 检查是否以管理员身份运行
net session >nul 2>&1
if errorlevel 1 (
    echo [错误] 需要管理员权限！
    echo.
    echo 请右键点击此文件，选择"以管理员身份运行"
    pause
    exit /b 1
)

cd /d "%~dp0.."

set SYMLINK_PATH=C:\Projects\cert-system
set CURRENT_PATH=%CD%

echo 当前项目路径: %CURRENT_PATH%
echo 符号链接路径: %SYMLINK_PATH%
echo.

if exist "%SYMLINK_PATH%" (
    echo [警告] 目标路径已存在: %SYMLINK_PATH%
    echo 是否删除并重新创建？(Y/N)
    set /p CONFIRM=
    if /i not "%CONFIRM%"=="Y" (
        echo 操作已取消
        pause
        exit /b 1
    )
    rmdir "%SYMLINK_PATH%" 2>nul
)

echo 正在创建符号链接...
mklink /D "%SYMLINK_PATH%" "%CURRENT_PATH%"

if errorlevel 1 (
    echo [错误] 创建符号链接失败
    pause
    exit /b 1
)

echo.
echo [成功] 符号链接已创建！
echo.
echo 现在可以在以下路径运行项目：
echo   %SYMLINK_PATH%
echo.
echo 使用方式：
echo   1. cd %SYMLINK_PATH%
echo   2. npm run start:all:win
echo.
pause

