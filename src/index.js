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
  V8Proxy.SendAction('F5')
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
  SendAction: function (action, arg) {
    console.debug('SendAction: ' + action + ' : ' + arg)

    var interaction = document.getElementById('interaction')
    interaction.title = action
    interaction.value = arg
    interaction.click()
  },
  OnReceiveAction: function (action, arg) {
    console.debug('OnReceiveAction: ' + action + ' : ' + arg)

    switch (action) {
      case 'setValue':
        editor.setValue(arg)
        break
      case 'revealLine':
        editor.revealLine(Number.parseInt(arg))
        break
      default:
    }
  }
}

self.OnReceiveAction = V8Proxy.OnReceiveAction // eslint-disable-line no-undef
