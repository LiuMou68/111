@echo off
chcp 65001 >nul
title 迁移项目到新位置
echo ==========================================
echo    迁移项目到新位置
echo ==========================================
echo.
echo 当前项目路径包含中文字符，导致 rollup 无法运行
echo.
echo 此脚本将帮助您将项目移动到新位置
echo.
echo ==========================================
echo.

cd /d "%~dp0.."
set CURRENT_PATH=%CD%

echo 当前项目路径: %CURRENT_PATH%
echo.

echo 请输入新的项目路径（不能包含中文）:
echo 例如: C:\Projects\certificate-system
set /p NEW_PATH=

if "%NEW_PATH%"=="" (
    echo [错误] 路径不能为空
    pause
    exit /b 1
)

echo.
echo 新路径: %NEW_PATH%
echo.
echo 确认移动项目？(Y/N)
set /p CONFIRM=

if /i not "%CONFIRM%"=="Y" (
    echo 操作已取消
    pause
    exit /b 1
)

echo.
echo [步骤 1/3] 停止所有服务...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
echo    完成
echo.

echo [步骤 2/3] 创建目标目录...
if not exist "%NEW_PATH%" (
    mkdir "%NEW_PATH%"
    echo    已创建目录
) else (
    echo    [警告] 目标目录已存在
    echo    是否清空目标目录？(Y/N)
    set /p CLEAR=
    if /i "%CLEAR%"=="Y" (
        rmdir /s /q "%NEW_PATH%"
        mkdir "%NEW_PATH%"
    )
)
echo.

echo [步骤 3/3] 复制项目文件...
echo    这可能需要几分钟...
xcopy "%CURRENT_PATH%\*" "%NEW_PATH%\" /E /I /H /Y /Q

if errorlevel 1 (
    echo    [错误] 复制失败
    pause
    exit /b 1
)

echo    [成功] 文件复制完成
echo.

echo ==========================================
echo    迁移完成！
echo ==========================================
echo.
echo 新项目位置: %NEW_PATH%
echo.
echo 下一步操作：
echo   1. cd "%NEW_PATH%"
echo   2. npm install
echo   3. npm run start:all:win
echo.
pause

