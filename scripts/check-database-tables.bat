@echo off
SETLOCAL
chcp 65001 >nul

REM 检查数据库表是否存在
REM 批处理文件版本，避免PowerShell编码问题

ECHO.
ECHO ========================================
ECHO    检查数据库表
ECHO ========================================
ECHO.

REM 需要检查的表
SET TABLES=activity activity_participation points_blockchain certificate_blockchain user_wallet certificate_rules points_event check_in

ECHO 正在检查数据库表...
ECHO.

SET EXISTING_COUNT=0
SET MISSING_COUNT=0

FOR %%T IN (%TABLES%) DO (
    mysql -u root -p certificate_db -e "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'certificate_db' AND TABLE_NAME = '%%T'" 2>nul | findstr /C:"%%T" >nul
    IF %ERRORLEVEL% EQU 0 (
        ECHO   [OK] %%T
        SET /A EXISTING_COUNT+=1
    ) ELSE (
        ECHO   [缺失] %%T
        SET /A MISSING_COUNT+=1
    )
)

ECHO.
ECHO ========================================
ECHO    检查结果
ECHO ========================================
ECHO.

ECHO 已存在的表: %EXISTING_COUNT%/8
ECHO 缺失的表: %MISSING_COUNT%/8
ECHO.

IF %MISSING_COUNT% GTR 0 (
    ECHO 解决方案:
    ECHO   运行: npm run update:database
    ECHO   或执行: mysql -u root -p certificate_db ^< database\add_activity_system.sql
) ELSE (
    ECHO 所有必需的表都已存在！
)

ECHO.
PAUSE
ENDLOCAL

