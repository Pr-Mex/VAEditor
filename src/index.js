import './style.css'
import * as monaco from 'monaco-editor'

// Worker loader

// eslint-disable-next-line no-undef
self.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    // eslint-disable-next-line import/no-webpack-loader-syntax
    return require('blob-url-loader?type=application/javascript!compile-loader?target=worker&emit=false!monaco-editor/esm/vs/editor/editor.worker')
  }
}

// Turbo-Gherkin definitions

monaco.languages.register({ id: 'turbo-gherkin' })

monaco.languages.setMonarchTokensProvider('turbo-gherkin', {
  keywords: [
    'Функционал',
    'Сценарий',
    'Контекст', 'Допустим', 'Дано',
    'Когда',
    'И',
    'Тогда', 'Затем',
    'Если',
    'Примеры'
  ],

  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  tokenizer: {
    root: [
      [/[A-zА-я][A-zА-я]*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier'
        },
        log: 'test $1'
      }],
      { include: '@whitespace' },
      { include: '@numbers' },
      [/@.*/, 'annotation'],
      [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
      [/'([^'\\]|\\.)*$/, 'string.invalid'], // non-teminated string
      [/"/, 'string', '@string_double'],
      [/'/, 'string', '@string_single']
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/(^#.*$)/, 'comment'],
      [/(^\/\/.*$)/, 'comment']
    ],

    numbers: [
      [/-?(\d*\.)?\d+([eE][+-]?\d+)?[jJ]?[lL]?/, 'number']
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop']
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop']
    ]
  }
})

monaco.languages.setLanguageConfiguration('turbo-gherkin', {
  comments: {
    lineComment: '//'
  }
})

// monaco.languages.registerHoverProvider('turbo-gherkin', {
//   provideHover: function (model, position) {
//     return {
//       range: model.getFullModelRange(),
//       contents: [
//         { value: '**DESCRIPTION**\n```html\nЭто тестовое описание при наведении.\n```' }
//       ]
//     }
//   }
// })

monaco.languages.registerCompletionItemProvider('turbo-gherkin', {
  provideCompletionItems: function () {
    var suggestions = [{
      label: 'сцен',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'Сценарий: ${1:condition}\n\tКогда $0', // eslint-disable-line no-template-curly-in-string
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
  toggleBreakpoint(editor.getPosition().lineNumber)
})

editor.addCommand(monaco.KeyCode.F11, function () {
  V8Proxy.SendAction('STEP_OVER', editor.getPosition().lineNumber)
})

editor.onDidChangeModelContent(function () {
  V8Proxy.SendAction('CONTENT_DID_CHANGE')
})

editor.onMouseDown(function (e) {
  breakpointOnMouseDown(e)
})

editor.onMouseMove(function (e) {
  breakpointsOnMouseMove(e)
})

var model = editor.getModel()

model.onDidChangeDecorations(function (e) {
  breakpointOnDidChangeDecorations()
})

// Breakpoints

var breakpointList = [] // { id, range, enable, verified }
var breakpointDecorationIds = []
var breakpointHintDecorationIds = []
var breakpointUnverifiedDecorationIds = []
var checkBreakpointChangeDecorations = true

function decorateBreakpoints (breakpoints) {
  const decorations = []
  breakpoints.forEach(breakpoint => {
    decorations.push({
      range: new monaco.Range(breakpoint.lineNumber, 1, breakpoint.lineNumber, 1),
      options: {
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        glyphMarginClassName: breakpoint.enable ? 'debug-breakpoint-glyph' : 'debug-breakpoint-disabled-glyph'
      }
    })
  })

  checkBreakpointChangeDecorations = false
  breakpointDecorationIds = editor.deltaDecorations(breakpointDecorationIds, decorations)
  breakpointUnverifiedDecorationIds = editor.deltaDecorations(breakpointUnverifiedDecorationIds, [])
  checkBreakpointChangeDecorations = true

  breakpointList = breakpointDecorationIds.map((id, index) => ({
    id: id,
    range: decorations[index].range,
    enable: breakpoints[index].enable,
    verified: true
  }))
}

function breakpointsOnMouseMove (e) {
  const decorations = []
  if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
    const lineNumber = e.target.position.lineNumber
    if (breakpointIndexByLineNumber(lineNumber) === -1) {
      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          glyphMarginClassName: 'debug-breakpoint-hint-glyph'
        }
      })
    }
  }
  breakpointHintDecorationIds = editor.deltaDecorations(breakpointHintDecorationIds, decorations)
}

function breakpointOnDidChangeDecorations () {
  if (!checkBreakpointChangeDecorations) {
    return
  }
  let somethingChanged = false
  breakpointList.forEach(breakpoint => {
    if (somethingChanged) {
      return
    }
    if (!breakpoint.verified) {
      return
    }
    const newBreakpointRange = model.getDecorationRange(breakpoint.id)
    if (newBreakpointRange && (!breakpoint.range.equalsRange(newBreakpointRange))) {
      somethingChanged = true
    }
  })
  if (somethingChanged) {
    updateBreakpoints()
  }
}

function breakpointOnMouseDown (e) {
  if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
    toggleBreakpoint(e.target.position.lineNumber)
  }
}

function toggleBreakpoint (lineNumber) {
  const breakpointIndex = breakpointIndexByLineNumber(lineNumber)
  if (breakpointIndex === -1) {
    checkBreakpointChangeDecorations = false
    breakpointHintDecorationIds = editor.deltaDecorations(breakpointHintDecorationIds, [])
    breakpointUnverifiedDecorationIds = editor.deltaDecorations(breakpointUnverifiedDecorationIds, [{
      range: new monaco.Range(lineNumber, 1, lineNumber, 1),
      options: {
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        glyphMarginClassName: 'debug-breakpoint-unverified-glyph'
      }
    }])
    checkBreakpointChangeDecorations = true
    breakpointList.push({
      id: breakpointUnverifiedDecorationIds[0],
      range: new monaco.Range(lineNumber, 1, lineNumber, 1),
      enable: true,
      verified: false
    })
  } else {
    breakpointList.splice(breakpointIndex, 1)
  }
  setTimeout(updateBreakpoints, 100)
}

function updateBreakpoints () {
  let breakpointPacket = []
  breakpointList.forEach(breakpoint => {
    let range = model.getDecorationRange(breakpoint.id)
    if (range !== null) {
      breakpointPacket.push({
        lineNumber: range.startLineNumber,
        enable: breakpoint.enable
      })
    }
  })
  V8Proxy.SendAction('UPDATE_BREAKPOINTS', JSON.stringify(breakpointPacket))
}

function breakpointIndexByLineNumber (lineNumber) {
  return breakpointList.findIndex(breakpoint => (breakpoint.range.startLineNumber === lineNumber))
}

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
      case 'decorateBreakpoints':
        decorateBreakpoints(JSON.parse(arg))
        return undefined
      default:
    }
  }
}

// eslint-disable-next-line no-undef
self.OnReceiveAction = V8Proxy.OnReceiveAction
