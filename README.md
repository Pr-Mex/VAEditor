# Vanessa Editor

Code editor which powers by [Monaco](https://github.com/Microsoft/monaco-editor) and interaction with [1C:Enterprise](https://1c-dn.com/) 8.3.15+.

Build for [Vanessa Automation](https://github.com/Pr-Mex/vanessa-automation).


## Build

Install
```
npm install .
```

Debug
```
npm run debug
```

Build production to `./dist/index.html`
```
npm run build
```

## Fast start

1. Create new data processor.
2. Create new template with name **VanessaEditor** and selected type **Binary data**.
3. Click **Restore from file** of the binary date template and chose **./dist/index.html**.
4. Add a new form to the data processor.
5. Create string attribute **VanessaEditor** into this form.
6. Drug and drop the attribute to the items panel. The new item shuld have name **VanessaEditor**.
7. Change type of the form item to **HTML document field**.
8. Create **VanessaEditorOnClick** item event handler.
9. Create **VanessaEditorDocumentComplete** item event handler.
10. Create **OnCreateAtServer** form event handler.
11. Add the next code to the form module:

```bsl
#Region FormEvents

&AtServer
Procedure OnCreateAtServer(Cancel, StandardProcessing)

	VanessaEditorLoad();

EndProcedure

#EndRegion

#Region VanessaEditor

#Region Public

&AtClient
Procedure VanessaEditorOnReceiveEventHandler(Event, Arg)

	// Call your event handlers here.

EndProcedure

#EndRegion

#Region Public

&AtServer
Procedure VanessaEditorLoad()

	VanessaEditor = GetInfoBaseURL() + "/" + PutToTempStorage(
		FormAttributeToValue("Object").GetTemplate("VanessaEditor"), UUID);

EndProcedure

&AtClient
Function VanessaEditorSendAction(Action, Arg = Undefined)

	Return Items.VanessaEditor.Document.defaultView.VanessaEditor.SendAction(Action, Arg);

EndFunction

#EndRegion

#Region Private

&AtClient
Procedure VanessaEditorOnClick(Item, EventData, StandardProcessing)

	Element = EventData.Element;
	If Element.id = "VanessaEditorEventForwarder" Then
		VanessaEditorOnReceiveEventHandler(Element.title, Element.value);
	EndIf;

EndProcedure

&AtClient
Procedure VanessaEditorDocumentComplete(Item)

	Items.VanessaEditor.Document.defaultView.createVanessaEditor("", "turbo-gherkin");

EndProcedure

#EndRegion

#EndRegion
```

## API

### Actions

Vanessa Editor can be controlled with send action. If editor get action it update its internal state and render the decoration.

| Action                         | Description                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `setTheme`                     | set etitor theme from `arg`, avaliable values: `vs`, `vs-dark`, and `hc-black`                  |
| `setContent`                   | load `arg` to the editor                                                                        |
| `getContent`                   | return editor content                                                                           |
| `revealLine`                   | scrolling to the `arg` line number                                                              |
| `enableEdit`                   | disable read only mode                                                                          |
| `disableEdit`                  | set read only mode                                                                              |
| `decorateBreakpoints`          | update breakpoint by json description in `arg`, see Breakpoints chapter                         |
| `decorateProblems`             | update problems by json description in `arg`, see Problems chapter                              |
| `decorateCurrentStep`          | update runtime process current step, `arg` line number, see Runtime process chapter             |
| `decorateCompleteSteps`        | update runtime process complete steps by json description in `arg`, see Runtime process chapter |
| `decorateErrorSteps`           | update runtime process error steps by json description in `arg`, see Runtime process chapter    |
| `cleanDecorateRuntimeProgress` | clean runtime process, see Runtime process chapter                                              |

1C:Enterprise script example:

```bsl
VanessaEditorSendAction("setContent", "Text to edit")
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
Function VanessaEditorOnReceiveEventHandler(Event, Arg)

  If Event = "CONTENT_DID_CHANGE" Then
    ContentDidChange = True;
  EndIf;

EndFunction
```

## Samples

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

### Problems

Sample json problems description:

```json
[
  {
    "lineNumber": 3,
    "severity": "Warning",
    "message": "Warning! Step was found in the library, but source data process was not found.",
    "code": "",
    "source": ""
  },
  {
    "lineNumber": 3,
    "severity": "Error",
    "message": "Error! Step have no definitions in the library.",
    "code": "",
    "source": ""
  }
]
```

To generate this description you can use this 1C:Enterprise script pattern:

```bsl
&AtClient
Procedure DecorateProblems()

	ProblemsPacket = New Array;

	For Each Row In Problems Do
		Chunk = New Structure;
		Chunk.Insert("lineNumber", Row.LineNumber);
		Chunk.Insert("severity", Row.Severity);
		Chunk.Insert("message", Row.Message);
		Chunk.Insert("code", Row.Code);
		Chunk.Insert("source", Row.Source);
		ProblemsPacket.Add(Chunk);
	EndDo;

	VanessaEditorSendAction("decorateProblems", JsonDump(ProblemsPacket));

EndProcedure
```

### Runtime process

Runtime is showning how the debug process is decorated.

#### Curent step

```bsl
VanessaEditorSendAction("decorateCurrentStep", CurrentStep);
```

#### Complete steps

Sample json complete steps description:

```json
[
  {
    "lineNumber": 3
  },
  {
    "lineNumber": 4
  }
]
```

To generate this description you can use this 1C:Enterprise script pattern:

```bsl
&AtClient
Procedure SendCompleteSteps(Command)

	CompleteStepsPacket = New Array;

	For Each Row In CompleteSteps Do
		Chunk = New Structure;
		Chunk.Insert("lineNumber", Row.LineNumber);
		CompleteStepsPacket.Add(Chunk);
	EndDo;

	VanessaEditorSendAction("decorateCompleteSteps", JsonDump(CompleteStepsPacket));

EndProcedure
```

#### Error steps

Sample json complete steps description:

```json
[
  {
		"lineNumber": 3,
		"UID": "ID1",
		"title": "Error description"
  },
  {
    "lineNumber": 6,
		"UID": "ID2",
		"title": "Error description"
  }
]
```

To generate this description you can use this 1C:Enterprise script pattern:

```bsl
&AtClient
Procedure SendErrorSteps(Command)

	ErrorStepsPacket = New Array;

	For Each Row In ErrorSteps Do
		Chunk = New Structure;
		Chunk.Insert("lineNumber", Row.LineNumber);
		Chunk.Insert("UID", Row.UID);
		Chunk.Insert("title", Row.Title);
		ErrorStepsPacket.Add(Chunk);
	EndDo;

	VanessaEditorSendAction("decorateErrorSteps", JsonDump(ErrorStepsPacket));

EndProcedure
```

#### Clean runtime progress

```bsl
VanessaEditorSendAction("cleanDecorateRuntimeProgress");

```