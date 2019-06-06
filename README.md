# Turbo-Gherkin editor

Code editor which powers by [Monaco](https://github.com/Microsoft/monaco-editor) and interaction with [1C:Enterprise](https://1c-dn.com/) 8.3.14+.

Build for [Vanessa Automation](https://github.com/Pr-Mex/vanessa-automation).


## Build commands

Install
```
npm install .
```

Debug
```
npm run debug
```

Build production to `/dist/`
```
npm run build
```

## API

### Actions

| Action       | Description                        |
| ------------ | ---------------------------------- |
| `setValue`   | load `arg` to the editor           |
| `getValue`   | return editor content              |
| `revealLine` | scrolling to the `arg` line number |

1C:Enterprise example:

```bsl
SendAction("setValue", "Text to edit")
```

### Events

| Event                                  | Description                                    |
| -------------------------------------- | ---------------------------------------------- |
| `START_DEBUGGING`                      | on F5 pressed                                  |
| `START_DEBUGGING_AT_STEP`              | on Ctrl+F5 pressed, `arg` is line number       |
| `START_DEBUGGING_AT_STEP_AND_CONTINUE` | on Ctrl+Shift+F5 pressed, `arg` is line number |
| `START_DEBUGGING_AT_ENTRY`             | on Alt+F5 pressed                              |
| `TOGGLE_BREAKPOINT`                    | on F9 pressed, `arg` is line number            |
| `STEP_OVER`                            | on F11 pressed, `arg` is line number           |
| `CONTENT_DID_CHANGE`                   | after content did change                       |

1C:Enterprise example:

```bsl
Function OnReceiveAction(Event, Arg)

  If Event = "CONTENT_DID_CHANGE" Then
    ContentDidChange = True;
  EndIf;

EndFunction
```
