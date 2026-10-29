param(
    [Parameter(Mandatory = $true)][string]$PlatformBin,
    [string]$Root = '',
    [int]$TestTimeoutSeconds = 300,
    # Параметр запуска обработки: autotest — прогон тестов,
    # probeenv — натурный эксперимент с возможностями WebKit (TextDecoder и пр.).
    [string]$Launch = 'autotest'
)

# Корень проекта считаем в теле скрипта: в блоке param() $PSScriptRoot может быть
# ещё не заполнен (в частности при запуске через powershell -File относительным путём).
if (-not $Root) {
    $scriptDir = $PSScriptRoot
    if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition }
    $Root = Split-Path $scriptDir -Parent
}

# Локальный прогон того же сценария, что выполняет CI (GitHub Actions,
# .github/workflows/build.yml): сборка фронта -> макеты из dist -> чистая база
# -> epf -> автотест. В CI автотест идёт в headless-браузере, здесь — в WebView
# платформы: только так проверяются file://, старый WebKit и blob-воркеры.
#
# Запуск (из корня репозитория):
#   powershell -ExecutionPolicy Bypass -File tools\local-check.ps1 "C:\Program Files (x86)\1cv8t\8.3.27.2342\bin"
#   powershell -ExecutionPolicy Bypass -File tools\local-check.ps1 "C:\Program Files\1cv8\8.5.4.1878\bin"
#
# Аргумент — каталог bin платформы или путь к её exe. Имена файлов различаются
# между «учебной» поставкой (1cv8t.exe / 1cv8ct.exe) и обычной установкой
# (1cv8.exe / 1cv8c.exe), поэтому exe ищутся по списку.
#
# Зачем нужен: единственная проверка, которая реально ловит проблемы загрузки
# страницы в поле HTML 1С (file://, порядок исполнения скриптов, синтаксис,
# который не понимает встроенный WebKit).
#
# Важно: клиент возвращает управление раньше, чем движок завершит работу,
# поэтому ждём не код возврата, а результат (каталог базы, epf, success.txt)
# и завершения процессов 1С.

$ErrorActionPreference = 'Stop'

# Прогресс идёт в консоль и одновременно в tools\.agent-log.txt: транскрипт
# записывает всё, что попадает в host — Write-Host, вывод npm и 1cv8. Поэтому в
# check.cmd перенаправление убрано: с ним на экране не видно ничего до конца
# прогона и запуск выглядит зависшим. Транскрипт закрывается сам при выходе.
$agentLog = Join-Path $Root 'tools\.agent-log.txt'
Start-Transcript -Path $agentLog -Force | Out-Null

# 1cv8.exe пишет /Out-лог в UTF-8, но в консоль он попадает через перенаправление
# в tools/.agent-log.txt, а кодировка перенаправления зависит от кодовой страницы
# консоли (см. chcp в check.cmd). Читаем явно как UTF-8.
function Read-1CLog([string]$Path) {
    return Get-Content $Path -Encoding UTF8 -Raw
}

if (Test-Path $PlatformBin -PathType Leaf) {
    $binDir = Split-Path -Parent $PlatformBin
} else {
    $binDir = $PlatformBin
}

function Resolve-1CExe([string]$dir, [string[]]$names, [string]$what) {
    foreach ($name in $names) {
        $path = Join-Path $dir $name
        if (Test-Path $path) { return $path }
    }
    throw ($what + ' not found in ' + $dir + ' (looked for: ' + ($names -join ', ') + ')')
}

# Конфигуратор: в обычной установке это толстый клиент 1cv8.exe.
$designer = Resolve-1CExe $binDir @('1cv8t.exe', '1cv8.exe') 'Designer'
# Клиент — тонкий. Это не косметика: внешняя обработка в тонком клиенте
# исполняется на сервере, где некому подтверждать «Разрешить открывать файл?»,
# поэтому защита от опасных действий не показывает диалог и прогон идёт сам.
# В толстом клиенте тот же запуск встаёт на этом диалоге.
$client = Resolve-1CExe $binDir @('1cv8ct.exe', '1cv8c.exe', '1cv8.exe') 'Client'
$procNames = @('1cv8t', '1cv8ct', '1cv8', '1cv8c', '1cv8p32', '1cv8p64')

# Защита от опасных действий спрашивает «Да/Нет» перед запуском внешней
# обработки, но только в толстом клиенте. Тонкий клиент исполняет обработку на
# сервере, где подтверждать некому, — поэтому прогон идёт без диалога.
# Глобальный conf.cfg платформы скрипт не правит: настройка касается всей установки.

function Wait-1CIdle([int]$seconds) {
    $deadline = (Get-Date).AddSeconds($seconds)
    $lastReport = Get-Date
    while ((Get-Date) -lt $deadline) {
        $alive = Get-Process -Name $procNames -ErrorAction SilentlyContinue
        if (-not $alive) { return $true }
        if (((Get-Date) - $lastReport).TotalSeconds -ge 5) {
            $lastReport = Get-Date
            $names = ($alive | ForEach-Object { $_.ProcessName + ' pid=' + $_.Id }) -join ', '
            Write-Host ('  still running: ' + $names)
        }
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

function Invoke-1C([string]$exe, [string[]]$arguments, [int]$idleTimeoutSeconds = 60) {
    Write-Host ('> ' + (Split-Path $exe -Leaf) + ' ' + ($arguments -join ' '))
    $out = & $exe @arguments 2>&1
    Write-Host ('exit=' + $LASTEXITCODE)
    if ($out) { $out | ForEach-Object { Write-Host ('  ' + $_) } }
    if (-not (Wait-1CIdle $idleTimeoutSeconds)) {
        Write-Host '  warning: 1C processes are still running (probably a dialog window is open)'
    }
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

Write-Host '=== 0. Kill stray 1C processes and remove old databases ==='
Stop-1C
Start-Sleep -Seconds 2

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
if (Test-Path $log3) { Write-Host '--- step3.log ---'; Write-Host (Read-1CLog $log3); Write-Host '--- end ---' }

Write-Host '=== 4. Build epf ==='
$epf = Join-Path $Root 'VAEditorSample.epf'
$log = Join-Path $Root 'example.log'
if (Test-Path $epf) { Remove-Item -Force $epf }
if (Test-Path $log) { Remove-Item -Force $log }
Invoke-1C $designer @('DESIGNER', "/F$db", '/LoadExternalDataProcessorOrReportFromFiles', (Join-Path $Root 'example\VAEditorSample.xml'), $epf, '/DisableStartupDialogs', '/DisableStartupMessages', '/Out', $log)
if (Test-Path $log) { Write-Host '--- example.log ---'; Write-Host (Read-1CLog $log); Write-Host '--- end ---' }
if (-not (Wait-Path $epf 120)) { throw 'epf build failed: file not created' }

Write-Host ("=== 5. Run autotest (timeout " + $TestTimeoutSeconds + "s) ===")
$success = Join-Path $Root 'success.txt'
if (Test-Path $success) { Remove-Item -Force $success }
# Обработку открывает платформа (/Execute), а модуль приложения успевает снять
# предупреждения защиты от опасных действий у текущего пользователя базы.
$arguments = @('ENTERPRISE', '/LRU', "/F$db", "/Execute$epf", '/C', $Launch)
# Если обработка не открылась, клиент просто висит без окон и прогон ждёт полный
# таймаут — поэтому ждём ещё и файл, который пишет модуль приложения при ошибке.
$failure = "$epf.error.txt"
if (Test-Path $failure) { Remove-Item -Force $failure }
Start-Process -FilePath $client -ArgumentList $arguments | Out-Null

$deadline = (Get-Date).AddSeconds($TestTimeoutSeconds)
# Даём клиенту подняться, иначе «процессов нет» сработает сразу после старта.
Start-Sleep -Seconds 2
while ((Get-Date) -lt $deadline) {
    if ((Test-Path $success) -or (Test-Path $failure)) { break }
    # Клиент закрылся (например, форма вызвала Exit), а success.txt не появился —
    # незачем ждать полный таймаут.
    if (-not (Get-Process -Name $procNames -ErrorAction SilentlyContinue)) { break }
    Start-Sleep -Milliseconds 500
}

# Отчёт натурного эксперимента с возможностями WebKit (режим probeenv).
$envProbe = Join-Path $Root 'env-probe.txt'
if (Test-Path $envProbe) {
    Write-Host '--- env-probe.txt ---'
    Get-Content $envProbe -Encoding UTF8 | ForEach-Object { Write-Host ('  ' + $_) }
    Write-Host '--- end ---'
}

if (Test-Path $success) {
    Write-Host 'RESULT: success.txt created - autotest passed'
} elseif (Test-Path $failure) {
    Write-Host 'RESULT: обработка не открылась - автотест не запустился'
    Get-Content $failure -Encoding UTF8 | ForEach-Object { Write-Host ('  ' + $_) }
    Stop-1C
    exit 1
} else {
    Write-Host 'RESULT: success.txt NOT created - autotest did not finish'
    # Отчёт формы: сколько тестов прошло и сколько упало.
    $report = Join-Path $Root 'autotest-result.txt'
    if (Test-Path $report) {
        Get-Content $report -Encoding UTF8 | ForEach-Object { Write-Host ('  ' + $_) }
    } else {
        Write-Host '  autotest-result.txt нет: страница не досигналила о конце прогона'
    }
    Stop-1C
    exit 1
}
