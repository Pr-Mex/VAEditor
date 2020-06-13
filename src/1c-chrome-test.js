window.onload = () => {

    let content = '\
# language: ru\n\# encoding: utf-8\n\@UA30_Прочие_макеты\n\n\
Функциональность: Браузер\n\n\Контекст:\n\
\tДано Я запускаю сценарий открытия TestClient или подключаю уже существующий\n\n\
Сценарий:\n\t*Открытие формы элемента\n\
\t\tЕсли Версия платформы ">=" "8.3.6" Тогда \n\
\t\tИ видеовставка картинки "$ИмяКнопки$" \'$ИмяРеквизита$\' \n\
\t\tИ это значит что в таблице "$ИмяТаблицы$" есть колонка с именем \'$ИмяРеквизита$\' Тогда\
\n';

    if (!(['file:', 'http:'].includes(window.location.protocol))) return;
    VanessaGherkinProvider.setKeywords('["и","и это значит что","вот почему","когда","тогда","затем","дано","функция","функционал","функциональность","свойство","предыстория","контекст","сценарий","структура сценария","примеры","допустим","пусть","если","иначеесли","иначе","то","к тому же","также","но","а","feature","functionality","business need","ability","background","scenario outline","scenario","examples","given","when","then","and","but","if","elseif","else"]');

    let steps = [{
        "filterText": "Версия платформы \">=\" \"8.3.6\" Тогда",
        "insertText": "Если Версия платформы \">=\" \"8.3.6\" Тогда",
        "sortText": "",
        "documentation": "",
        "kind": 0,
        "section": "Прочее.Версия платформы"
    },
    {
        "filterText": "в окне предупреждения нет текста \"Нужный текст\" тогда",
        "insertText": "Если в окне предупреждения нет текста \"Нужный текст\" тогда",
        "sortText": "",
        "documentation": "Условие. Истинно, когда в окне предупреждения нет искомого текста.",
        "kind": 0,
        "section": "UI.Всплывающие окна"
    },
    {
        "filterText": "в панели открытых есть команда \"ИмяКоманды\" Тогда",
        "insertText": "Если в панели открытых есть команда \"ИмяКоманды\" Тогда",
        "sortText": "",
        "documentation": "Условие. Проверяет наличие команды в панели открытых.",
        "kind": 0,
        "section": "UI.Командный интерфейс.Панель открытых"
    },
    {
        "filterText": "в панели разделов есть команда \"ИмяКоманды\" Тогда",
        "insertText": "Если в панели разделов есть команда \"ИмяКоманды\" Тогда",
        "sortText": "",
        "documentation": "Условие. Проверяет наличие команды в панели разделов.",
        "kind": 0,
        "section": "UI.Командный интерфейс.Панель разделов"
    },
    {
        "filterText": "в панели функций есть команда \"ИмяКоманды\" Тогда",
        "insertText": "Если в панели функций есть команда \"ИмяКоманды\" Тогда",
        "sortText": "",
        "documentation": "Условие. Проверяет наличие команды в панели функций.",
        "kind": 0,
        "section": "UI.Командный интерфейс.Панель функций"
    },
    {
        "filterText": "в сообщениях пользователю есть строка \"МояСтрока\" Тогда",
        "insertText": "Если в сообщениях пользователю есть строка \"МояСтрока\" Тогда",
        "sortText": "",
        "documentation": "Условие. Проверяет, что в сообщениях пользователю содержится нужная строка или подстрока.",
        "kind": 0,
        "section": "UI.Сообщения пользователю.Условие"
    },
    {
        "filterText": "в таблице \"ИмяТаблицы\" есть колонка с именем \"ИмяКолонки\" Тогда",
        "insertText": "Если в таблице \"ИмяТаблицы\" есть колонка с именем \"ИмяКолонки\" Тогда",
        "sortText": "",
        "documentation": "Условие.Проверяет наличие колонки в таблице.",
        "kind": 0,
        "section": "UI.Таблицы.Колонки"
    },
    {
        "filterText": "видеовставка картинки \"ИмяКартинки\" \"ТекстДиктора\"",
        "insertText": "И видеовставка картинки \"ИмяКартинки\" \"ТекстДиктора\"",
        "sortText": "",
        "documentation": "Добавляет в видео вставку из указанной картинки с указанным текстом диктора.",
        "kind": 4,
        "section": "Прочее.SikuliX"
    },
    {
        "filterText": "Я запускаю сценарий открытия TestClient или подключаю уже существующий",
        "insertText": "Дано Я запускаю сценарий открытия TestClient или подключаю уже существующий",
        "sortText": "",
        "documentation": "Подсценарий. Подключает новый TestClient если необходимо и закрывает в нём все окна",
        "kind": 17,
        "section": "Подключение TestClient.Новое подключение к базе.Текущая база"
    },
    {
        "filterText": "Я запускаю сценарий открытия TestClient или подключаю уже существующий",
        "insertText": "Дано Я запускаю сценарий открытия TestClient или подключаю уже существующий",
        "sortText": "",
        "documentation": "Подсценарий. Подключает новый TestClient если необходимо и закрывает в нём все окна",
        "kind": 17,
        "section": "Подключение TestClient.Новое подключение к базе.Текущая база"
    },
    ];
    VanessaGherkinProvider.setStepList(JSON.stringify(steps));

    let elements = {
        "ИмяКоманды": "ЗаписатьИЗакрыть",
        "ИмяКнопки": "ФормаЗаписать",
        "ИмяТаблицы": "Номенклатура",
        "ИмяРеквизита": "Количество",
    };
    VanessaGherkinProvider.setElements(JSON.stringify(elements));

    let variables = {
        "ИмяКоманды": "ЗаписатьИЗакрыть",
        "ИмяКнопки": "ФормаЗаписать",
        "ИмяТаблицы": "Номенклатура",
        "ИмяРеквизита": "Количество",
    };
    VanessaGherkinProvider.setVariables(JSON.stringify(variables));

    createVanessaEditor(content, 'turbo-gherkin');

    let commands = [
        { eventId: "Win+F6", keyCode: "F6", keyMod: ["WinCtrl"] },
        { eventId: "Shift+F6", keyCode: "F6", keyMod: ["Shift"], title: "Some new command!" },
        { eventId: "Ctrl+Alt+F6", keyCode: "F6", keyMod: ["CtrlCmd", "Alt"] },
        { eventId: "CREATE_STEP", title: "Create new step!", script: "alert('New step!')" },
        { eventId: "CODE_LENS_DATA", codeLens: "Details", script: "alert('Details!')" },
        { eventId: "CODE_LENS_COPY", codeLens: "Copy error", script: "alert('Copy error!')" },
    ];
    VanessaEditor.addCommands(JSON.stringify(commands));

    let problems = [{
		"lineNumber": 11,
		"severity": "Hint",
		"message": "Runtime error",
		"code": "0x1005",
		"source": "Data info",
    }];
    VanessaEditor.decorateProblems(JSON.stringify(problems));

    let error = "Runtime error info";
    VanessaEditor.setRuntimeProgress("error", "[13]");
	VanessaEditor.showRuntimeError(13, 2, error);
}
