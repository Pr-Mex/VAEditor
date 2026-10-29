---
name: avtotesty-1c-bez-dialogov-zashchity
display_name: Прогон автотестов 1С без диалогов защиты
description: Как запускать автотесты VAEditor в 1С, чтобы неинтерактивный прогон не висел на диалоге «Разрешить открывать данный файл?»
---

# Прогон автотестов без диалогов защиты

## Проблема

Когда клиент открывает внешнюю обработку, платформа показывает модальный диалог
«Разрешить открывать данный файл?». В неинтерактивном прогоне (CI, скрипт) подтверждать
некому: скрипт ждёт `success.txt` до таймаута и падает.

## Способы снять диалог

1. **`conf.cfg` платформы** — единственный работающий способ, проверен на 8.3.27.2342.
   Для учебной поставки файл читается из каталога установки:
   `C:\Program Files (x86)\1cv8t\conf\conf.cfg`. Нужны права администратора:

   ```powershell
   Set-Content -Path 'C:\Program Files (x86)\1cv8t\conf\conf.cfg' -Encoding ASCII -Value @(
       'SystemLanguage=System'
       'DisableUnsafeActionProtection=.*'
   )
   ```

   Параметр подтверждён ИТС: `DisableUnsafeActionProtection=.*`
   (https://its.1c.ru/db/freshpub#content:105:hdoc, раздел «Отключение защиты
   от опасных действий»).

2. **Интерактивно** — нажать «Да» руками.

Чего делать не нужно: UI Automation из `local-check.ps1` убран — он не находил
модальное окно предупреждения (смотрел только главное окно процесса), и диалоги
всё равно подтверждались вручную.

## Грабли conf.cfg

- **`Add-Content` склеивает строки.** Если в файле нет перевода строки в конце
  (типичный `conf.cfg` поставки — одна строка `SystemLanguage=System`), `Add-Content`
  допишет значение в ту же строку: `SystemLanguage=SystemDisableUnsafeActionProtection=.*`.
  Параметр молча не работает. Писать только `Set-Content` с массивом строк.
- **Каталог `conf` рядом с версией не помогает.** Файл
  `...\1cv8t\8.3.27.2342\conf\conf.cfg` платформа не прочитала; рабочий —
  на уровне установки, рядом с деревом версий.
- Правка каталога платформы требует администратора: из агента запись в
  `C:\Program Files (x86)` не проходит.

## Диагностика зависшего прогона в CI

`autotest did not finish in Ns: success.txt not created` — это ещё не «клиент завис».
Порядок разбора:

1. **Лог шага GitHub Actions** — самый информативный источник. Прогоны и шаги:
   `https://api.github.com/repos/<owner>/<repo>/actions/runs?branch=<branch>&per_page=3`,
   затем `.../actions/runs/<run_id>/jobs` (у каждого шага `conclusion`).
   Локально тот же сценарий даёт `tools/.agent-log.txt` (транскрипт прогона).
2. **Метки формы `Autotest`** (пишутся в режиме `autotest` рядом с обработкой):
   `client-started.txt` — форма открылась, `page-loaded.txt` — сработал
   `DocumentComplete`, `autotest-result.txt` — тесты досчитали. Где метки
   оборвались, там и встали: до первой — диалог/запуск, после второй без третьей —
   страница или сами тесты.
3. **`example.log`** — только сборка обработки, к зависанию отношения не имеет.

## Кодировка логов в консоли

Симптом: в `check.cmd` содержимое `step3.log` / `example.log` печатается как `?????`
или как мусор `?�?????`.

Сам `/Out`-лог платформа пишет в **UTF-8** (проверяется чтением файла напрямую).
Порча шла от перенаправления: `pwsh ... > tools\.agent-log.txt` пишет в кодировке
кодовой страницы консоли (по умолчанию OEM 866), а читается файл как UTF-8.

Лечение — выровнять обе стороны, а не угадывать кодировку источника: `chcp 65001`
в начале `check.cmd`, `-Encoding UTF8` при чтении логов платформы. Перекодирование
из cp1251 делает только хуже.

## Живой вывод вместо дампа в конце

Симптом: после запуска `check.cmd` несколько минут пусто, потом сразу весь лог —
выглядит как зависание.

Причина: вывод `pwsh` перенаправлялся в `tools\.agent-log.txt`, а в консоль он
попадал только хвостом в конце прогона.

Решение: в `tools/local-check.ps1` включён `Start-Transcript -Path tools\.agent-log.txt`
(пишет всё, что попадает в host, — `Write-Host`, вывод npm и 1cv8), а в `check.cmd`
перенаправление убрано. Прогресс виден сразу и параллельно копится в лог.

## Падение сборки в GitHub Actions: как читать

`conclusion: failure` сам по себе ничего не говорит — смотреть надо, какой шаг упал.

```
/actions/runs?branch=<branch>&per_page=3     # последние прогоны, head_sha, status
/actions/runs/<run_id>/jobs                   # шаги прогона с conclusion каждого
```

Первым делом — шаг: падение на `Check ES level` и на `Build epf` означают совершенно
разные причины. Если прогон отменён (`cancelled`), это `concurrency`: новый пуш
отменил старый, и это не ошибка.

### Падение «Check ES level»

`tools/check-es-level.js` вырезает инлайновые `<script>` из `dist/*.html` и гоняет
`es-check` на ES2015. Ошибка `SyntaxError: Unexpected token` в минифицированном
файле чаще всего означает **ошибку самого скрипта вырезания**, а не новый синтаксис:
тело скрипта надо искать по тому `</script>`, при котором текст разбирается как JS,
а не по первому вхождению.

### Падение `Build epf`

Каждая команда `1cv8` проверяется по `errorlevel` отдельно: раньше падение
`CREATEINFOBASE` проглатывалось следующей командой и всплывало позже невнятной
ошибкой. Логи `/Out` первых шагов лежат в артефактах.

### ps-блок падает целиком из-за одной строки

PowerShell-блок сначала разбирается целиком, и одна синтаксическая ошибка отменяет
весь блок: до 1С дело не доходит.

Реальный случай: `Write-Host "--- $name: нет ---"` → `$name:` PowerShell читает как
переменную области видимости:

```
Variable reference is not valid. ':' was not followed by a valid variable name character.
Consider using ${} to delimit the name.
```

Лечится `${name}:`. Признак именно этой ошибки: в логе нет строки `> 1cv8ct ENTERPRISE ...`,
артефактов-меток нет, а шаг «падал» минуты.

## Прогон на Linux (GitHub Actions, ubuntu-22.04)

Проверено: учебная 8.3.27.2342, автотест в WebView платформы проходит 51/51.

- **Раннер — только `ubuntu-22.04`.** Бинарь собран под WebKitGTK 4.0
  (`libwebkit2gtk-4.0-37`, `libjavascriptcoregtk-4.0-18`, `libsoup2.4-1`).
  В 24.04 стоят 4.1 и libsoup3 — клиент не стартует. Проверять через `ldd`.
- **Дистрибутив**: `lintest/tools1c@platform-linux`, 17 томов `linux1c.7z.0NN`
  (~1.5 ГБ), архив зашифрован — пароль из секрета `KEY_1CV8T`.
  Внутри `setup-training-8.3.27.2342-x86_64.run`; ставится unattended в
  `/opt/1cv8t/x86_64/<версия>`, бинари `1cv8t` (конфигуратор/толстый)
  и `1cv8ct` (тонкий). Лицензия не нужна.
- **`timeout -k 10` обязателен на каждом вызове 1С.** Клиент обрабатывает
  SIGTERM и без добивания висит до `timeout-minutes` шага. Именно так
  «висел» `1cv8t --version` — диагностический вызов, который вообще не нужен.
- **`conf.cfg`** (снять защиту от опасных действий): писать в
  `/opt/1cv8t/conf/conf.cfg` (каталог установки, не версии), плюс дубли в
  `/opt/1cv8/conf/` и `~/.1cv8/1C/1cv8/conf/`. Нужен `sudo`.
  Параметр тот же, что на Windows: `DisableUnsafeActionProtection=.*`.
- **Xvfb поднимать один раз на job**:
  `pgrep -f 'Xvfb :99' > /dev/null || (Xvfb :99 -screen 0 1680x1050x24 -shmem &)`.
  Повторный запуск падает с «Server is already active for display 99».
- **Порядок шагов**: `npm run build:test` → макеты (zip `dist/index.html` и
  `dist/test.html` в `example/VAEditorSample/Templates/*/Ext/Template.bin`) →
  `CREATEINFOBASE` → `DESIGNER /LoadConfigFromFiles config /UpdateDBCfg` →
  `DESIGNER /LoadExternalDataProcessorOrReportFromFiles example/VAEditorSample.xml` →
  `1cv8ct ENTERPRISE /LRU /F<база> /Execute<epf> /C autotest`.
- **Признак успеха** — `success.txt`, как и на Windows. Промежуточные метки:
  `client-started.txt` (форма открылась), `page-loaded.txt` (DocumentComplete),
  `autotest-result.txt` (раннер дошёл до конца, `passes=/failures=`).
  Без них шаг не отличить «не открылось» от «тесты встали».
- **Диагностика зависания**: `xwininfo -root -tree` показывает заголовки окон —
  по ним видно висящий диалог. Скриншот root-окна на Xvfb выходит **чёрным**;
  снимать нужно конкретное окно по id (`xdotool search --name ...` → `import -window`).
  Предупреждения `libsoup: database is locked` и `AT-SPI: ... ServiceUnknown` —
  шум WebKitGTK, к делу не относятся.
- `/Out <файл>` у клиента полезен: служебные сообщения платформы попадают
  в файл, а не только в stdout.

## Грабли

- Признак успеха прогона — файл `success.txt` в корне проекта, а не код возврата клиента.
- `check.cmd` ищет платформу в двух деревьях: `C:\Program Files\1cv8\*\bin*` по
  `1cv8.exe` и `C:\Program Files (x86)\1cv8t\*\bin*` по `1cv8t.exe`. У учебной
  поставки нет `1cv8.exe`, поэтому проверять только его — ошибка: скрипт скажет
  «Platform folder not found» на существующем каталоге.
- Маршрутизация запуска — форма `Initialize`: `autotest`, `probestorage`, `probeenv`
  открывают форму `Autotest`, всё остальное — `MainForm`. Проба, попавшая в `MainForm`,
  падает на макетах `Keywords`/`StepList` (их содержимое не в репозитории) с
  «Некорректный формат файла» в `ZipFileReader`.
- Ожидание процесса 1С делать с таймаутом и периодическим выводом имён живых процессов,
  иначе непонятно, зависло или думает.
- Если клиент закрылся, а `success.txt` не появился, ждать полный таймаут незачем.
- Тестовая конфигурация в `config/` использует `ScriptVariant = English`: код, который
  в неё попадает, обязан быть на английском (`StrStartsWith` и т.п.), иначе не соберётся.
- Отчёт `autotest-result.txt` может остаться от прошлого прогона: ориентироваться на время
  файла и на имя базы в логе.
