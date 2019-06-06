import * as monaco from 'monaco-editor'

// Turbo-Gherkin definitions

monaco.languages.register({ id: 'turbo-gherkin' })

monaco.languages.registerHoverProvider('turbo-gherkin', {
  provideHover: function (model, position) {
    return {
      range: model.getFullModelRange(),
      contents: [
        { value: '**DESCRIPTION**\n```html\nЭто тестовое описание при наведении.\n```' }
      ]
    }
  }
})

monaco.languages.registerCompletionItemProvider('turbo-gherkin', {
  provideCompletionItems: function () {
    var suggestions = [{
      label: 'сцен',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'Сценарий: ${1:condition}\n\tКогда $0',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Сценарий'
    }]
    return { suggestions: suggestions }
  }
})

// Feature editor

var editor = monaco.editor.create(document.getElementById('container'), {
  language: 'turbo-gherkin',
  scrollBeyondLastLine: false,
  glyphMargin: true,
  automaticLayout: true
})

editor.addCommand(monaco.KeyCode.F5, function () {
  V8Proxy.SendAction('START_DEBUGGING')
})

editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F5, function () {
  V8Proxy.SendAction('START_DEBUGGING_AT_STEP', editor.getPosition().lineNumber)
})

editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.F5, function () {
  V8Proxy.SendAction('START_DEBUGGING_AT_STEP_AND_CONTINUE', editor.getPosition().lineNumber)
})

editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.F5, function () {
  V8Proxy.SendAction('START_DEBUGGING_AT_ENTRY')
})

editor.addCommand(monaco.KeyCode.F9, function () {
  V8Proxy.SendAction('TOGGLE_BREAKPOINT', editor.getPosition().lineNumber)
})

editor.addCommand(monaco.KeyCode.F11, function () {
  V8Proxy.SendAction('STEP_OVER', editor.getPosition().lineNumber)
})

editor.onDidChangeModelContent(function () {
  V8Proxy.SendAction('CONTENT_DID_CHANGE')
})

// It shuld be used on 1C:Enterprise Actions
// Need design the decoration types.
//
// editor.deltaDecorations([], [
//   {
//     range: new monaco.Range(2, 1, 2, 1),
//     options: {
//       isWholeLine: true,
//       className: 'line-selected',
//       glyphMarginClassName: 'breakpoint'
//     }
//   }
// ])

// 1C:Enterprise interactions.

var V8Proxy = {
  SendAction: function (event, arg) {
    console.debug('SendAction: ' + event + ' : ' + arg)

    var interaction = document.getElementById('interaction')
    interaction.title = event
    interaction.value = arg
    interaction.click()
  },
  OnReceiveAction: function (action, arg) {
    console.debug('OnReceiveAction: ' + action + ' : ' + arg)

    switch (action) {
      case 'setValue':
        editor.setValue(arg)
        return undefined
      case 'getValue':
        return editor.getValue()
      case 'revealLine':
        editor.revealLine(Number.parseInt(arg))
        return undefined
      case 'enableEdit':
        editor.updateOptions({
          readOnly: false
        })
        return undefined
      case 'disableEdit':
        editor.updateOptions({
          readOnly: true
        })
        return undefined
      default:
    }
  }
}

self.OnReceiveAction = V8Proxy.OnReceiveAction // eslint-disable-line no-undef
