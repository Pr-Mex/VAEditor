# Vanessa Editor

Code editor which powers by [Monaco](https://github.com/Microsoft/monaco-editor) and interaction with [1C:Enterprise](https://1c-dn.com/) 8.3.15+.

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

Vanessa Editor can be controlled with send action. If editor get action it update its internal state and render the decoration.

| Action                | Description                                                              |
| --------------------- | ------------------------------------------------------------------------ |
| `setContent`          | load `arg` to the editor                                                 |
| `getContent`          | return editor content                                                    |
| `revealLine`          | scrolling to the `arg` line number                                       |
| `enableEdit`          | disable read only mode                                                   |
| `disableEdit`         | set read only mode                                                       |
| `decorateBreakpoints` | update breakpoint by json description in  `arg`, see Breakpoints chapter |

1C:Enterprise script example:

```bsl
VanessaEditorSendAction("setValue", "Text to edit")
```


### Events

Vanessa Editor can fire events that can be handled in 1C:Enterprise script.

| Event                                  | Description                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `START_DEBUGGING`                      | on F5 pressed                                                                |
| `START_DEBUGGING_AT_STEP`              | on Ctrl+F5 pressed, `arg` is line number                                     |
| `START_DEBUGGING_AT_STEP_AND_CONTINUE` | on Ctrl+Shift+F5 pressed, `arg` is line number                               |
| `START_DEBUGGING_AT_ENTRY`             | on Alt+F5 pressed                                                            |
| `UPDATE_BREAKPOINTS`                   | on F9 pressed, `arg` is breakpoint json description, see Breakpoints chapter |
| `STEP_OVER`                            | on F11 pressed, `arg` is line number                                         |
| `CONTENT_DID_CHANGE`                   | after content did change                                                     |

1C:Enterprise script example:

```bsl
Function VanessaEditorOnReceiveEvent(Event, Arg)

  If Event = "CONTENT_DID_CHANGE" Then
    ContentDidChange = True;
  EndIf;

EndFunction
```

### Json

In most of exchange cases the Vanessa Editor protocol use json message format.
To dump or load json messages in 1C:Enterprise script you can use pattern:

```bsl
&AtClient
Function JsonDump(Value)

	JSONWriter = New JSONWriter;
	JSONWriter.SetString();
	WriteJSON(JSONWriter, Value);
	Return JSONWriter.Close();

EndFunction

&AtClient
Function JsonLoad(Json)

	JSONReader = New JSONReader;
	JSONReader.SetString(Json);
	Value = ReadJSON(JSONReader);
	JSONReader.Close();
	Return Value;

EndFunction
```

### Breakpoints

The editor in any case if is toggling breakpoints will send `UPDATE_BREAKPOINTS` event without decorate breakpoints in editor.
You can verify the breakpoints, for example set the next non blank line if blank line is toggled or decline set the breakpoint into the end of file.
To update the editor you must send `decorateBreakpoints` action with the json description of a new state of all breakpoints, after that the editor will delta the decoration of breakpoints.

Sample json breakpoint description:

```json
[
  {
  "lineNumber": 3,
  "enable": true
  },
  {
  "lineNumber": 27,
  "enable": false
  }
]
```

To generate this description you can use this 1C:Enterprise script pattern:

```bsl
&AtClient
Procedure DecorateBreakpoints()

	BreakpointsPacket = New Array;

	For Each Row In Breakpoints Do
		Chunk = New Structure;
		Chunk.Insert("lineNumber", Row.Value);
		Chunk.Insert("enable", Row.Check);
		BreakpointsPacket.Add(Chunk);
	EndDo;

	VanessaEditorSendAction("decorateBreakpoints", JsonDump(BreakpointsPacket));

EndProcedure
```

To parse this description you can use this 1C:Enterprise script pattern:

```bsl
&AtClient
Procedure UpdateBreakpoints(Json)

	BreakpointsPacket = JsonLoad(Json);

	Breakpoints.Clear();
	For Each Chunk In BreakpointsPacket Do
		Breakpoints.Add(Chunk.lineNumber,, Chunk.enable);
	EndDo;

	Breakpoints.SortByValue();

EndProcedure
```
