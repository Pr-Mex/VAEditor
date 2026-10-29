@echo off
rem One-click check: build, pack templates, fresh infobase, epf, autotest.
rem Usage: check.cmd                - run tests on the default platform
rem        check.cmd autotest "C:\Program Files\1cv8\<version>\bin"
rem        check.cmd probestorage   - temp storage experiment
rem Keep this file ASCII-only: cmd.exe reads batch files in the OEM codepage,
rem so any non-ASCII text here turns into garbage and breaks parsing.
setlocal
cd /d "%~dp0"

rem Platform folder is looked up under C:\Program Files\1cv8: among the
rem installed versions the last one found wins, and the subfolder holding
rem 1cv8.exe is taken (names are not assumed).
set "PLATFORM=%~2"
if not "%PLATFORM%"=="" goto platform_ready
for /d %%D in ("C:\Program Files\1cv8\*") do (
    for /d %%B in ("%%~fD\bin*") do (
        if exist "%%~fB\1cv8.exe" set "PLATFORM=%%~fB"
    )
)
if "%PLATFORM%"=="" (
    echo No platform found under C:\Program Files\1cv8
    echo Pass the folder with 1cv8.exe as the second argument
    exit /b 2
)
:platform_ready
if not exist "%PLATFORM%\1cv8.exe" (
    echo Platform folder not found: %PLATFORM%
    exit /b 2
)
set "LAUNCH=%~1"
if "%LAUNCH%"=="" set "LAUNCH=autotest"

pwsh -NoProfile -ExecutionPolicy Bypass -File "tools\local-check.ps1" "%PLATFORM%" -Launch "%LAUNCH%" > "tools\.agent-log.txt" 2>&1

echo.
echo === tail of tools\.agent-log.txt ===
pwsh -NoProfile -Command "Get-Content 'tools\.agent-log.txt' -Tail 45"

if exist "autotest-result.txt" (
    echo.
    echo === autotest-result.txt ===
    pwsh -NoProfile -Command "Get-Content 'autotest-result.txt' -Encoding UTF8"
)

if exist "storage-probe.txt" (
    echo.
    echo === storage-probe.txt ===
    pwsh -NoProfile -Command "Get-Content 'storage-probe.txt' -Encoding UTF8"
)

echo.
echo Done. Full log: tools\.agent-log.txt
pause
