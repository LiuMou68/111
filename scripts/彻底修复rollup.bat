@echo off
chcp 65001 >nul
title 彻底修复 Rollup 问题
echo ==========================================
echo    彻底修复 Rollup 路径问题
echo ==========================================
echo.

cd /d "%~dp0.."

echo [步骤 1/5] 停止所有服务...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
echo    完成
echo.

echo [步骤 2/5] 删除整个 node_modules...
if exist node_modules (
    echo    正在删除 node_modules（这可能需要一些时间）...
    rmdir /s /q node_modules 2>nul
    if exist node_modules (
        echo    [错误] 删除失败，请手动删除 node_modules 文件夹后重新运行
        pause
        exit /b 1
    ) else (
        echo    [成功] 已删除 node_modules
    )
) else (
    echo    node_modules 不存在，跳过
)
echo.

echo [步骤 3/5] 删除 package-lock.json...
if exist package-lock.json (
    del /f /q package-lock.json
    echo    [成功] 已删除 package-lock.json
) else (
    echo    package-lock.json 不存在，跳过
)
echo.

echo [步骤 4/5] 清除 npm 缓存...
call npm cache clean --force
echo    [成功] 缓存已清除
echo.

echo [步骤 5/5] 重新安装所有依赖...
echo    这可能需要 5-10 分钟，请耐心等待...
echo    建议使用国内镜像以加快速度...
echo.

REM 设置国内镜像
call npm config set registry https://registry.npmmirror.com
echo    已设置国内镜像源
echo.

call npm install

if errorlevel 1 (
    echo.
    echo [错误] 安装失败
    echo.
    echo 建议：
    echo 1. 检查网络连接
    echo 2. 尝试手动运行: npm install
    echo 3. 如果问题持续，考虑将项目移动到没有中文的路径
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    [成功] 修复完成！
echo ==========================================
echo.
echo 现在可以运行: npm run start:all:win
echo.
pause

