param(
    [Parameter(Mandatory = $true)][string]$PlatformBin,
    [string]$Root = '',
    [int]$TestTimeoutSeconds = 300
)

# Корень проекта считаем в теле скрипта: в блоке param() $PSScriptRoot может быть
# ещё не заполнен (в частности при запуске через powershell -File относительным путём).
if (-not $Root) {
    $scriptDir = $PSScriptRoot
    if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition }
    $Root = Split-Path $scriptDir -Parent
}

# Локальный прогон того же сценария, что выполняет AppVeyor:
# сборка фронта -> макеты из dist -> чистая база -> epf -> автотест.
#
# Запуск (из корня репозитория):
#   powershell -ExecutionPolicy Bypass -File tools\local-check.ps1 "C:\Program Files (x86)\1cv8t\8.3.27.2342\bin"
#
# Зачем нужен: единственная проверка, которая реально ловит проблемы загрузки
# страницы в поле HTML 1С (file://, порядок исполнения скриптов, синтаксис,
# который не понимает встроенный WebKit).
#
# Важно: 1cv8t.exe возвращает управление раньше, чем движок завершит работу,
# поэтому ждём не код возврата, а результат (каталог базы, epf, success.txt)
# и завершения процессов 1С.

$ErrorActionPreference = 'Stop'

$designer = Join-Path $PlatformBin '1cv8t.exe'
$client = Join-Path $PlatformBin '1cv8ct.exe'
$procNames = @('1cv8t', '1cv8ct', '1cv8p32', '1cv8p64')

foreach ($exe in @($designer, $client)) {
    if (-not (Test-Path $exe)) { throw "Not found: $exe" }
}

function Wait-1CIdle([int]$seconds) {
    $deadline = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $deadline) {
        if (-not (Get-Process -Name $procNames -ErrorAction SilentlyContinue)) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

function Wait-Path([string]$path, [int]$seconds) {
    $deadline = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-Path $path) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return (Test-Path $path)
}

function Stop-1C {
    Get-Process -Name $procNames -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host ("kill " + $_.ProcessName + " pid=" + $_.Id)
        try { $_.Kill() } catch { Write-Host '  kill failed' }
    }
}

function Invoke-1C([string]$exe, [string[]]$arguments) {
    Write-Host ('> ' + (Split-Path $exe -Leaf) + ' ' + ($arguments -join ' '))
    $out = & $exe @arguments 2>&1
    Write-Host ('exit=' + $LASTEXITCODE)
    if ($out) { $out | ForEach-Object { Write-Host ('  ' + $_) } }
    if (-not (Wait-1CIdle 300)) { Write-Host '  warning: 1C processes are still running' }
}

# Шаблон макета 1С — это zip с html внутри; Compress-Archive умеет только .zip,
# поэтому создаём zip и переименовываем в Template.bin.
function New-TemplateBin([string]$source, [string]$dest) {
    $zip = [System.IO.Path]::ChangeExtension($dest, '.zip')
    if (Test-Path $zip) { Remove-Item -Force $zip }
    Compress-Archive -Force -Path $source -DestinationPath $zip
    if (Test-Path $dest) { Remove-Item -Force $dest }
    Move-Item -Force $zip $dest
}

Set-Location $Root

Write-Host '=== 0. Kill stray 1C processes ==='
Stop-1C
Start-Sleep -Seconds 2

Write-Host '=== 0b. Remove old databases ==='
Get-ChildItem -Path $Root -Directory -Filter 'database-*' -ErrorAction SilentlyContinue | ForEach-Object {
    try { Remove-Item -Recurse -Force $_.FullName } catch { Write-Host ("skip " + $_.Name) }
}

Write-Host '=== 1. Build frontend ==='
& npm run build:test
if ($LASTEXITCODE -ne 0) { throw 'npm run build:test failed' }

Write-Host '=== 2. Pack templates ==='
$vaExt = Join-Path $Root 'example\VAEditorSample\Templates\VAEditor\Ext'
$atExt = Join-Path $Root 'example\VAEditorSample\Templates\AutoTest\Ext'
New-Item -ItemType Directory -Force -Path $vaExt, $atExt | Out-Null

New-TemplateBin (Join-Path $Root 'dist\index.html') (Join-Path $vaExt 'Template.bin')
New-TemplateBin (Join-Path $Root 'dist\test.html') (Join-Path $atExt 'Template.bin')

Write-Host '=== 3. Fresh infobase and config load ==='
$db = Join-Path $Root ("database-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$log3 = Join-Path $Root 'step3.log'
if (Test-Path $log3) { Remove-Item -Force $log3 }
Invoke-1C $designer @('CREATEINFOBASE', "File=$db")
if (-not (Wait-Path $db 60)) { throw 'CREATEINFOBASE failed: base directory not created' }
Invoke-1C $designer @('DESIGNER', "/F$db", '/LoadConfigFromFiles', (Join-Path $Root 'config'), '/UpdateDBCfg', '/DisableStartupDialogs', '/DisableStartupMessages', '/Out', $log3)
if (Test-Path $log3) { Write-Host '--- step3.log ---'; Get-Content $log3; Write-Host '--- end ---' }

Write-Host '=== 4. Build epf ==='
$epf = Join-Path $Root 'VAEditorSample.epf'
$log = Join-Path $Root 'example.log'
if (Test-Path $epf) { Remove-Item -Force $epf }
if (Test-Path $log) { Remove-Item -Force $log }
Invoke-1C $designer @('DESIGNER', "/F$db", '/LoadExternalDataProcessorOrReportFromFiles', (Join-Path $Root 'example\VAEditorSample.xml'), $epf, '/DisableStartupDialogs', '/DisableStartupMessages', '/Out', $log)
if (Test-Path $log) { Write-Host '--- example.log ---'; Get-Content $log; Write-Host '--- end ---' }
if (-not (Wait-Path $epf 120)) { throw 'epf build failed: file not created' }

Write-Host ("=== 5. Run autotest (timeout " + $TestTimeoutSeconds + "s) ===")
$success = Join-Path $Root 'success.txt'
if (Test-Path $success) { Remove-Item -Force $success }
$arguments = @('ENTERPRISE', '/LRU', "/F$db", "/Execute$epf", '/C', 'autotest')
Start-Process -FilePath $client -ArgumentList $arguments | Out-Null

if (Wait-Path $success $TestTimeoutSeconds) {
    Write-Host 'RESULT: success.txt created - autotest passed'
} else {
    Write-Host 'RESULT: success.txt NOT created - autotest did not finish'
    Stop-1C
    exit 1
}
