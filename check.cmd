@echo off
rem One-click check: build, pack templates, fresh infobase, epf, autotest.
rem Usage: check.cmd                - run tests on the default platform
rem        check.cmd autotest "C:\Program Files\1cv8\8.3.27.2426\bin64"
rem        check.cmd probestorage   - temp storage experiment
rem Keep this file ASCII-only: cmd.exe reads batch files in the OEM codepage,
rem so any non-ASCII text here turns into garbage and breaks parsing.
setlocal
cd /d "%~dp0"

rem 8.5 keeps its executables in bin64, 8.3 also has a legacy bin folder.
set "PLATFORM=%~2"
if "%PLATFORM%"=="" set "PLATFORM=C:\Program Files\1cv8\8.5.5.1228\bin64"
if not exist "%PLATFORM%" (
    echo Platform folder not found: %PLATFORM%
    echo Pass it as the second argument, e.g. check.cmd autotest "C:\Program Files\1cv8\8.3.27.2426\bin64"
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
