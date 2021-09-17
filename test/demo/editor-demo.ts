import { content } from './example.file.js'
import { initGherkinProvider } from '../provider'
import { WelcomeParams } from '../../src/vanessa-viewer.js';

export function show() {

  //@ts-ignore
  const tabs = window.createVanessaTabs()
  const provider = initGherkinProvider();

  const elements = {
    ИмяКоманды: 'ЗаписатьИЗакрыть',
    ИмяКнопки: 'ФормаЗаписать',
    ИмяТаблицы: 'Номенклатура',
    ИмяРеквизита: 'Количество'
  }

  const variables = {
    ИмяКоманды: 'ЗаписатьИЗакрыть',
    ИмяКнопки: 'ФормаЗаписать',
    ИмяТаблицы: 'Номенклатура',
    ИмяРеквизита: 'Количество'
  }

  const messages = {
    syntaxMsg: "Ошибка синтаксиса",
    soundHint: "Озвучить"
  }

  const keypairs = { if: ['then'], Если: ['Тогда'] }

  provider.setElements(JSON.stringify(elements))
  provider.setKeypairs(JSON.stringify(keypairs))
  provider.setMessages(JSON.stringify(messages))
  provider.setVariables(JSON.stringify(variables))

  const editor = tabs.edit(content, 'Браузер.feature', 'Браузер.feature', 'Браузер.feature', 0, false, true)

  const welcome: WelcomeParams = {
    title: "Vanessa Automation",
    subtitle: "Сценарное тестирование",
    sections: [
      {
        name: "Запуск", items: [
          { event: "WELCOME_LAUNCH", href: "new-file", gliph: "new-file", name: "Создать файл…" },
          { event: "WELCOME_LAUNCH", href: "open-file", gliph: "go-to-file", name: "Открыть файл…" },
          { event: "WELCOME_LAUNCH", href: "open-folder", gliph: "folder-opened", name: "Открыть папку…" },
          { event: "WELCOME_LAUNCH", href: "execute-command", gliph: "symbol-color", name: "Выполнить команду…" },
        ]
      },
      {
        name: "Последние", items: [
          { event: "WELCOME_RECENT", href: "C:\\vanessa\\file.feature", name: "Добро пожаловать", path: "C:\\vanessa" },
        ]
      },
      {
        name: "Обучение", items: [
          { event: "WELCOME_LAUNCH", href: "guide", gliph: "mortar-board", name: "Интерактивная справка" },
        ]
      },
    ]
  }

  return

  tabs.welcome("Добро пожаловать!", JSON.stringify(welcome))

  // eslint-disable-next-line
  const subcode = '\tК тому же шаг подсценария 1\n\t\tИ шаг подсценария 2\n\t\t\tИ шаг подсценария 3\n\t\t\tИ шаг подсценария 4\n\t\
  И шаг подсценария 5\n\t\t\tИ шаг подсценария 6\n\t\tИ шаг подсценария 7\n\t\t\tИ шаг подсценария 8\n\tИ шаг подсценария 9'

  editor.showRuntimeCode(20, subcode)
  editor.showRuntimeCode(28, subcode)

  let text = content.replace(/(\r\n|\n|\r)/gm, '\n\n')
  const viewer = tabs.view('Markdown', 'Markdown.txt', text)

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
  provider.setErrorLinks(JSON.stringify(errorLinks))

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

  tabs.tab(0).select();
}