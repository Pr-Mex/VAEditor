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

| Event                | Description              |
| -------------------- | ------------------------ |
| `START_DEBUGGING`    | on F5 pressed            |
| `CONTENT_DID_CHANGE` | after content did chenge |

1C:Enterprise example:

```bsl
Function OnReceiveAction(Event, Arg)

  If Event = "CONTENT_DID_CHANGE" Then
    ContentDidChange = True;
  EndIf;

EndFunction
```
