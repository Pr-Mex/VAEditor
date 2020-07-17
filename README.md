# Vanessa Automation Editor

Редактор сценариев, созданный с помощью [Monaco](https://github.com/Microsoft/monaco-editor) и поддерживающий взаимодействие с платформой [1C:Предприятие](https://1c-dn.com/) 8.3.15+.

Собрано для [Vanessa Automation](https://github.com/Pr-Mex/vanessa-automation).


## Сборка

Для установки выполните команду (необходим установленный node.js для сборки)
```
npm install .
```

Для запуска отлидки в браузере во встроенном сервре для разработки выполните команду
```
npm run debug
```

Для сборки финального файла `./dist/index.html`, встраиваемого в проект выполните команду
```
npm run build
```

Для сборки примера внешней обработки из исходников в epf файл выполните команду
```
npm run compile
```

Для разборки примера внешней обработки из epf в исходники выполните команду
```
npm run decompile
```

## Как использовать в своем проекте

Смотрите пример использования во внешней обработке с примером [Example](./example)

## API

### Действия (Actions)

Для управления редактором кода из 1С:Предпрития вы можете вызывать методы-действия объекта редактора, полученного из HTML-документа расположенного на форме.

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

Пример:

```bsl
VanessaEditorSendAction("setContent", "Text to edit")
```

### События(Events)

Редактор может отправлять события, которые будут получены и могут быть обработаны на стороне 1С:Предприятия.

| Event                                  | Description                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `START_DEBUGGING`                      | on F5 pressed                                                                |
| `START_DEBUGGING_AT_STEP`              | on Ctrl+F5 pressed, `arg` is line number                                     |
| `START_DEBUGGING_AT_STEP_AND_CONTINUE` | on Ctrl+Shift+F5 pressed, `arg` is line number                               |
| `START_DEBUGGING_AT_ENTRY`             | on Alt+F5 pressed                                                            |
| `UPDATE_BREAKPOINTS`                   | on F9 pressed, `arg` is breakpoint json description, see Breakpoints chapter |
| `STEP_OVER`                            | on F11 pressed, `arg` is line number                                         |
| `CONTENT_DID_CHANGE`                   | after content did change                                                     |

Пример:

```bsl
Function VanessaEditorOnReceiveEventHandler(Event, Arg)

  If Event = "CONTENT_DID_CHANGE" Then
    ContentDidChange = True;
  EndIf;

EndFunction
```

## Примеры

### Json

В большинстве случаев обмен редактора и 1С:Предприятия осуществляется с помощью сообщений в json формете.
Для быстрой сериализации и десериализации объектов 1С:Предпрития в json формат Вы можете воспользоваться функциями:

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

### Брейкпоинты (Breakpoints)

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

### Пробелмы (Problems)

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

**Правила сворачивания строк:**

1) ключевые слова верхнего уровня делят файл на секции и сворачиваются сами по себе, независимо от наличия отступов

2) комментарии которые идут подряд сворачиваются к первой строке комментариев тоже независимо от отступов. Пустая строка прерывает группу комментариев

3) параметры шага, строки начинающиеся с символа "|" сворачиваются к своей строке шага. Если внутри комментарии, они сворачиваются независимо сами в себя

4) инструкции, которые начинаются с собаки "@", группируются внутри себя

5) всё остальное сворачивается внутри секций по числу пробелов и табуляторов
