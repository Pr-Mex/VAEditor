/* global VanessaGherkinProvider, createVanessaTabs */

window.onload = () => {
  // eslint-disable-next-line
  const content = '\
# language: ru\n# encoding: utf-8\n@UA30_Прочие_макеты\n\n\
Функциональность: Браузер\n\tКак специалист по тестированию\n\nКонтекст:\n\
\tДано Я запускаю сценарий открытия TestClient или подключаю уже существующий\n\
\tОткрывается тест-клиент\n\nСтруктура сценария:\n\t* Открытие формы элемента\n\
\t\tЕсли Версия платформы ">=" "8.3.6" Тогда \n\
\t\tИ я показываю подсказку "ТекстПодсказки" EnjoyHint у элемента "ИмяЭлемента"\n\
\t\t\t|"shape"|"rect"|\n\t\t\t|"timeout"|"5000"\n\
\t\tИ видеовставка картинки "$ИмяКнопки$" \'$ИмяРеквизита$\' \n\
\t\tИ это значит что в таблице "$ИмяТаблицы$" есть колонка с именем \'$ИмяРеквизита$\' Тогда\n\
\t\tЕсли в панели открытых есть команда "ЗаписатьИЗакрыть" Тогда\n\
\t\tЕсли в таблице <Номенклатура> есть колонка с именем "ИмяКолонки" Тогда\n\
\t\tЕсли в окне предупреждения нет текста "Нужный текст" тогда\n\
\t\tЕсли в панели открытых есть команда "ЗаписатьИЗакрыть" Тогда\n\
\t\tИ видеовставка картинки "ИмяКартинки" "ТекстДиктора"\n\
\t* Проверка шагов\n\
\t\tЕсли в сообщениях пользователю есть строка \'МояСтрока\' Тогда\n\
\t\tК тому же в окне предупреждения нет текста \'Нужный текст\' тогда\n\
\t\tЕсли в панели открытых есть команда \'ЗаписатьИЗакрыть\' Тогда\n\
\t\tЕсли в таблице \'Номенклатура\' есть колонка с именем \'ИмяКолонки\' Тогда\n\
\t\tИ видеовставка картинки "ИмяКартинки" "ТекстДиктора"\n\
\t\tИ это значит что в таблице "$ИмяТаблицы$" есть колонка с именем \'$ИмяРеквизита$\' Тогда\n\
\t\tЕсли в панели открытых есть команда "ЗаписатьИЗакрыть" Тогда\n\
\n'

  if (!(['file:', 'http:'].includes(window.location.protocol))) return

  VanessaGherkinProvider.setKeywords('["и","и это значит что", "к тому же","вот почему","когда","тогда","затем","дано","функция","функционал","функциональность","свойство","предыстория","контекст","сценарий","структура сценария","примеры","допустим","пусть","если","иначеесли","иначе","то","к тому же","также","но","а","feature","functionality","business need","ability","background","scenario outline","scenario","examples","given","when","then","and","but","if","elseif","else"]')

  const steps = [{
    filterText: 'Версия платформы ">=" "8.3.6" Тогда',
    insertText: 'Если Версия платформы ">=" "8.3.6" Тогда',
    sortText: '',
    documentation: '',
    kind: 0,
    section: 'Прочее.Версия платформы'
  },
  {
    filterText: 'я показываю подсказку \'ТекстПодсказки\' EnjoyHint у элемента \'ИмяЭлемента\'\n\u0009\u0009|"selector"|"button"|\n\u0009\u0009|"showSkip"|"false"|\n\u0009\u0009|"shape"|"rect"|\n\u0009\u0009|"timeout"|"5000"|',
    insertText: 'И я показываю подсказку \'ТекстПодсказки\' EnjoyHint у элемента \'ИмяЭлемента\'\n\u0009\u0009|"selector"|"button"|\n\u0009\u0009|"showSkip"|"false"|\n\u0009\u0009|"shape"|"rect"|\n\u0009\u0009|"timeout"|"5000"|',
    sortText: 'И я показываю подсказку \'ТекстПодсказки\' EnjoyHint у элемента \'ИмяЭлемента\'\n\u0009\u0009|"selector"|"button"|\n\u0009\u0009|"showSkip"|"false"|\n\u0009\u0009|"shape"|"rect"|\n\u0009\u0009|"timeout"|"5000"|',
    documentation: 'Рисует фигуры в барузере. Параметры описаны тут: https://github.com/xbsoftware/enjoyhint/blob/master/README.md',
    kind: 4,
    section: 'Прочее.Браузер'
  },
  {
    filterText: 'в окне предупреждения нет текста "Нужный текст" тогда',
    insertText: 'Если в окне предупреждения нет текста "Нужный текст" тогда',
    sortText: '',
    documentation: 'Условие. Истинно, когда в окне предупреждения нет искомого текста.',
    kind: 0,
    section: 'UI.Всплывающие окна'
  },
  {
    filterText: 'в панели открытых есть команда "ИмяКоманды" Тогда',
    insertText: 'Если в панели открытых есть команда "ИмяКоманды" Тогда',
    sortText: '',
    documentation: 'Условие. Проверяет наличие команды в панели открытых.',
    kind: 0,
    section: 'UI.Командный интерфейс.Панель открытых'
  },
  {
    filterText: 'в панели разделов есть команда "ИмяКоманды" Тогда',
    insertText: 'Если в панели разделов есть команда "ИмяКоманды" Тогда',
    sortText: '',
    documentation: 'Условие. Проверяет наличие команды в панели разделов.',
    kind: 0,
    section: 'UI.Командный интерфейс.Панель разделов'
  },
  {
    filterText: 'в панели функций есть команда "ИмяКоманды" Тогда',
    insertText: 'Если в панели функций есть команда "ИмяКоманды" Тогда',
    sortText: '',
    documentation: 'Условие. Проверяет наличие команды в панели функций.',
    kind: 0,
    section: 'UI.Командный интерфейс.Панель функций'
  },
  {
    filterText: 'в сообщениях пользователю есть строка "МояСтрока" Тогда',
    insertText: 'Если в сообщениях пользователю есть строка "МояСтрока" Тогда',
    sortText: '',
    documentation: 'Условие. Проверяет, что в сообщениях пользователю содержится нужная строка или подстрока.',
    kind: 0,
    section: 'UI.Сообщения пользователю.Условие'
  },
  {
    filterText: 'в таблице "ИмяТаблицы" есть колонка с именем "ИмяКолонки" Тогда',
    insertText: 'Если в таблице "ИмяТаблицы" есть колонка с именем "ИмяКолонки" Тогда',
    sortText: '',
    documentation: 'Условие.Проверяет наличие колонки в таблице.',
    kind: 0,
    section: 'UI.Таблицы.Колонки'
  },
  {
    filterText: 'видеовставка картинки "ИмяКартинки" "ТекстДиктора"',
    insertText: 'И видеовставка картинки "ИмяКартинки" "ТекстДиктора"',
    sortText: '',
    documentation: 'Добавляет в видео вставку из указанной картинки с указанным текстом диктора.',
    kind: 4,
    section: 'Прочее.SikuliX'
  },
  {
    filterText: 'Я запускаю сценарий открытия TestClient или подключаю уже существующий',
    insertText: 'Дано Я запускаю сценарий открытия TestClient или подключаю уже существующий',
    sortText: '',
    documentation: 'Подсценарий. Подключает новый TestClient если необходимо и закрывает в нём все окна',
    kind: 17,
    section: 'Подключение TestClient.Новое подключение к базе.Текущая база'
  },
  {
    filterText: 'Я запускаю сценарий открытия TestClient или подключаю уже существующий',
    insertText: 'Дано Я запускаю сценарий открытия TestClient или подключаю уже существующий',
    sortText: '',
    documentation: 'Подсценарий. Подключает новый TestClient если необходимо и закрывает в нём все окна',
    kind: 17,
    section: 'Подключение TestClient.Новое подключение к базе.Текущая база'
  }
  ]

  VanessaGherkinProvider.setStepList(JSON.stringify(steps))

  const elements = {
    ИмяКоманды: 'ЗаписатьИЗакрыть',
    ИмяКнопки: 'ФормаЗаписать',
    ИмяТаблицы: 'Номенклатура',
    ИмяРеквизита: 'Количество'
  }

  VanessaGherkinProvider.setElements(JSON.stringify(elements))

  const variables = {
    ИмяКоманды: 'ЗаписатьИЗакрыть',
    ИмяКнопки: 'ФормаЗаписать',
    ИмяТаблицы: 'Номенклатура',
    ИмяРеквизита: 'Количество'
  }

  VanessaGherkinProvider.setVariables(JSON.stringify(variables))

  VanessaGherkinProvider.setSyntaxMsg('Step not found')

  const tabs = createVanessaTabs()
  const editor = tabs.edit(content, 'Браузер.feature', 'Браузер.feature', 'Браузер.feature', 0, false, true)

  const commands = [
    { eventId: 'Win+F6', keyCode: 'F6', keyMod: ['WinCtrl'] },
    { eventId: 'Shift+F6', keyCode: 'F6', keyMod: ['Shift'], title: 'Some new command!' },
    { eventId: 'Ctrl+Alt+F6', keyCode: 'F6', keyMod: ['CtrlCmd', 'Alt'] },
    { eventId: 'CREATE_STEP', title: 'Create new step!', script: 'alert("New step!")' },
    { eventId: 'CODE_LENS_DATA', errorLink: 'Details', script: 'alert("Details!")' },
    { eventId: 'CODE_LENS_COPY', errorLink: 'Copy error', script: 'alert("Copy error!")' }
  ]
  editor.addCommands(JSON.stringify(commands))

  const errorLinks = [
    { id: 'CODE_LENS_DATA', title: 'Details' },
    { id: 'CODE_LENS_COPY', title: 'Copy error' }
  ]
  VanessaGherkinProvider.setErrorLinks(JSON.stringify(errorLinks))

  // eslint-disable-next-line
  const subcode = '\tК тому же шаг подсценария 1\n\t\tИ шаг подсценария 2\n\t\t\tИ шаг подсценария 3\n\t\t\tИ шаг подсценария 4\n\t\
  И шаг подсценария 5\n\t\t\tИ шаг подсценария 6\n\t\tИ шаг подсценария 7\n\t\t\tИ шаг подсценария 8\n\tИ шаг подсценария 9'

  editor.showRuntimeCode(20, subcode)
  editor.showRuntimeCode(28, subcode)

  tabs.edit(
    subcode,
    'Подсценарий.feature',
    'Подсценарий.feature',
    'Подсценарий.feature',
    0,
    false,
    true
  )
  tabs.diff(
    subcode,
    'blob:Подсценарий.text',
    'blob:Подсценарий.text',
    subcode,
    'Подсценарий.feature',
    'Подсценарий.feature',
    'Подсценарий.feature',
    0,
    true,
    true
  )

  /*
    setInterval(() => VanessaEditor.runtimeManager.next(), 500);
    let problems = [{
      'lineNumber': 12,
      'severity': 'Warning',
      'message': 'Runtime error',
      'code': '0x1005',
      'source': 'Data info',
    }];
    VanessaEditor.decorateProblems(JSON.stringify(problems));
  */

  const error = 'Runtime error info'
  editor.setRuntimeProgress('complete', 15)
  editor.setRuntimeProgress('error', 17)
  editor.setRuntimeProgress('disabled', 19)
  editor.setRuntimeProgress('pending', 24)
  editor.setCurrentProgress(21)
  editor.showRuntimeError(17, 0, '0x01', error)

  setTimeout(() => {
    editor.setRuntimeProgress('error', 3, 'b1')
    editor.showRuntimeError(3, 'b1', '0x01', error)
  }, 1000)
}
