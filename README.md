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

| Action                | Description                                                              |
| --------------------- | ------------------------------------------------------------------------ |
| `setValue`            | load `arg` to the editor                                                 |
| `getValue`            | return editor content                                                    |
| `revealLine`          | scrolling to the `arg` line number                                       |
| `enableEdit`          | disable read only mode                                                   |
| `disableEdit`         | set read only mode                                                       |
| `decorateBreakpoints` | update breakpoint by json description in  `arg`, see Breakpoints chapter |

1C:Enterprise script example:

```bsl
SendAction("setValue", "Text to edit")
```


### Events

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
Function OnReceiveAction(Event, Arg)

  If Event = "CONTENT_DID_CHANGE" Then
    ContentDidChange = True;
  EndIf;

EndFunction
```


### Breakpoints

The editor in any case if is toggling breakpoint will send `UPDATE_BREAKPOINTS` event without decorate breakpoint in editor.
You can verify the breakpoint to set, for example set the next non blank line if blank line is toggled or decline set the breakpoint into the end of file.
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

To genarate this descripton you can use this 1C:Enterprise script pattern:

```bsl
&AtClient
Procedure DecorateBreakpoints()

	BreakpointsPacket = New Array;

	For Each Breakpoint In Breakpoints Do
		BreakpointsPacketChunk = New Structure;
		BreakpointsPacketChunk.Insert("lineNumber", Breakpoint.Value);
		BreakpointsPacketChunk.Insert("enable", Breakpoint.Check);
		BreakpointsPacket.Add(BreakpointsPacketChunk);
	EndDo;

	SendAction("decorateBreakpoints", JsonDump(BreakpointsPacket));

EndProcedure

&AtClient
Function JsonDump(Value)

	JSONWriter = New JSONWriter;
	JSONWriter.SetString();
	WriteJSON(JSONWriter, Value);
	Return JSONWriter.Close();

EndFunction
```

To parse this descripton you can use this 1C:Enterprise script pattern:

```bsl
&AtClient
Procedure UpdateBreakpoints(Json)

	BreakpointsPacket = JsonLoad(Json);

	Breakpoints.Clear();
	For Each BreakpointsPacketChunk In BreakpointsPacket Do
		Breakpoint = Breakpoints.Add(
			BreakpointsPacketChunk.lineNumber,
			,
			BreakpointsPacketChunk.enable
		);
	EndDo;

	Breakpoints.SortByValue();

EndProcedure

&AtClient
Function JsonLoad(Json)

	JSONReader = New JSONReader;
	JSONReader.SetString(Json);
	Value = ReadJSON(JSONReader);
	JSONReader.Close();
	Return Value;

EndFunction
```
