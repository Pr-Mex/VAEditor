@echo off
rem One-click check: build, pack templates, fresh infobase, epf, autotest.
rem Usage: check.cmd                - run tests on the default platform
rem        check.cmd autotest "C:\Program Files\1cv8\<version>\bin"
rem        check.cmd probestorage   - temp storage experiment
rem Keep this file ASCII-only: cmd.exe reads batch files in the OEM codepage,
rem so any non-ASCII text here turns into garbage and breaks parsing.
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

rem Console codepage 65001 makes pwsh write its redirected output to
rem tools\.agent-log.txt as UTF-8. Without it Cyrillic from 1C logs turns
rem into question marks on the way through the redirect.
chcp 65001 >nul

rem Platform folder is looked up under C:\Program Files\1cv8: among the
rem installed versions the last one found wins, and the subfolder holding
rem 1cv8.exe is taken (names are not assumed).
rem Delayed expansion (!PLATFORM!) is used below on purpose: a path like
rem "Program Files (x86)" contains a closing bracket, and inside a block
rem in brackets cmd would end the block early ("was unexpected at this time").
set "PLATFORM=%~2"
if not "%~2"=="" goto platform_ready
for /d %%D in ("C:\Program Files\1cv8\*") do (
    for /d %%B in ("%%~fD\bin*") do (
        if exist "%%~fB\1cv8.exe" set "PLATFORM=%%~fB"
    )
)

:platform_ready
if not defined PLATFORM goto no_platform
if not exist "!PLATFORM!\1cv8.exe" goto bad_platform

set "LAUNCH=%~1"
if not "%~1"=="" goto launch_ready
set "LAUNCH=autotest"
:launch_ready
echo Running: !LAUNCH! on !PLATFORM!
echo Live log is duplicated to tools\.agent-log.txt
echo.

pwsh -NoProfile -ExecutionPolicy Bypass -File "tools\local-check.ps1" "!PLATFORM!" -Launch "!LAUNCH!"

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
exit /b 0

:no_platform
echo No platform found under C:\Program Files\1cv8
echo Pass the folder with 1cv8.exe as the second argument
exit /b 2

:bad_platform
echo Platform folder not found: !PLATFORM!
exit /b 2
