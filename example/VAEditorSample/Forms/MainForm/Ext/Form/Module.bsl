&НаКлиенте
Var KeyCodeMap;

#Region FormEvents

&AtServer
Процедура OnCreateAtServer(Cancel, StandardProcessing)

	// Макеты отдаём на клиент адресами во временном хранилище: распаковка идёт
	// на клиенте (см. LoadEditor). В клиент-серверном варианте каталог,
	// распакованный на сервере, клиентскому браузеру недоступен, а работа
	// с файлами на сервере может быть запрещена настройками.
	DataObject = FormAttributeToValue("Object");
	EditorTemplateURL = PutToTempStorage(DataObject.GetTemplate("VAEditor"));
	StepListTemplateURL = PutToTempStorage(DataObject.GetTemplate("StepList"));
	KeywordsTemplateURL = PutToTempStorage(DataObject.GetTemplate("Keywords"));

	ErrorCode = New UUID;
	ErrorText = "Runtime error info";
	MessageText = "Hello, world!";
	RuntimeStatus = "complete";
	EditorTheme = "vs";
	ShowMinimap = True;
	LineNumber = 1;
	TabSize = 4;
	Column = 1;

КонецПроцедуры

&НаКлиенте
Процедура OnOpen(Cancel)
	KeyCodeMap = GetKeyCodeMap();
	LoadEditor();
КонецПроцедуры

&НаКлиенте
Процедура LoadFile(Command)

	Breakpoints.Clear();
	Problems.Clear();
	VanessaEditor().decorateBreakpoints(JsonDump(New Array));
	VanessaEditor().decorateProblems(JsonDump(New Array));

	Dialog = New FileDialog(FileDialogMode.Open);
	If Dialog.Choose() Then
		TextReader = New TextReader(Dialog.FullFileName, TextEncoding.UTF8);
		Text = TextReader.Read();
		VanessaEditor().setContent(Text);
	EndIf;

КонецПроцедуры

&НаКлиенте
Процедура GetValue(Command)

	UserMessage = New UserMessage;
	UserMessage.Text = VanessaEditor().getContent();
	UserMessage.Message();

КонецПроцедуры

&НаКлиенте
Процедура ReadOnlyModeOnChange(Item)

	VanessaEditor().setReadOnly(ReadOnlyMode);

КонецПроцедуры

&НаКлиенте
Процедура EditorThemeOnChange(Item)

	VanessaEditor().setTheme(EditorTheme);

КонецПроцедуры

&НаКлиенте
Процедура PositionOnChange(Item)

	VanessaEditor().setPosition(LineNumber, Column);
	VanessaEditor().revealLine(LineNumber);

КонецПроцедуры

&НаКлиенте
Процедура GetPosition(Command)

	Arg = VanessaEditor().getPosition();
	UserMessage = New UserMessage;
	UserMessage.Text = "Position: "
		+ "lineNumber = " + Format(Arg.lineNumber, "NG=") + ","
		+ "codeWidget = " + Format(Arg.codeWidget, "NG=") + ","
		+ "column = " + Format(Arg.column, "NG=");
	UserMessage.Message();

КонецПроцедуры

&НаКлиенте
Процедура GetLineContent(Command)

	UserMessage = New UserMessage;
	UserMessage.Text = VanessaEditor().getLineContent(lineNumber);
	UserMessage.Message();

КонецПроцедуры

&НаКлиенте
Процедура GetSelectedContent(Command)

	UserMessage = New UserMessage;
	UserMessage.Text = VanessaEditor().getSelectedContent();
	UserMessage.Message();

КонецПроцедуры

&НаКлиенте
Процедура GetCurrentStep(Command)

	UserMessage = New UserMessage;
	UserMessage.Text = "Current step: " + VanessaEditor().getRuntimeProgress("current");
	UserMessage.Message();

КонецПроцедуры

&НаКлиенте
Процедура GetProgress(Command)

	UserMessage = New UserMessage;
	UserMessage.Text = "Steps " + RuntimeStatus + ": " + VanessaEditor().getRuntimeProgress(RuntimeStatus);
	UserMessage.Message();

КонецПроцедуры

&НаКлиенте
Процедура InsertText(Command)
	VanessaEditor().insertText(MessageText);
КонецПроцедуры

&НаКлиенте
Процедура ReplaceText(Command)

	Map = New Map;
	Map.Insert("startLineNumber", LineNumber);
	Map.Insert("startColumn", 1);
	Map.Insert("endLineNumber", LineNumber);
	Map.Insert("endColumn", Column);
	VanessaEditor().insertText(MessageText, JsonDump(Map));

КонецПроцедуры

&НаКлиенте
Процедура ShowError(Command)

	VanessaEditor().setRuntimeProgress("error", CurrentStep);
	VanessaEditor().showRuntimeError(CurrentStep, 0, ErrorCode, ErrorText);

КонецПроцедуры

&НаКлиенте
Процедура ActionsSelection(Item, SelectedRow, Field, StandardProcessing)

	Data = Items.Actions.CurrentData;
	If Data = Undefined Then Return; EndIf;
	VanessaEditor().editor.trigger("", Data.Id);

КонецПроцедуры

#EndRegion

#Region FormActiond

&НаКлиенте
Процедура EditorAction(Command)

	Map = New Map;
	Map.Insert("ClipboardCut", "editor.action.clipboardCutAction");
	Map.Insert("ClipboardCopy", "editor.action.clipboardCopyAction");
	Map.Insert("ClipboardPaste", "editor.action.clipboardPasteAction");
	Map.Insert("EditFind", "actions.find");
	Map.Insert("EditFindNext", "editor.action.nextMatchFindAction");
	Map.Insert("EditFindPrevious", "editor.action.previousMatchFindAction");
	Map.Insert("EditUndo", "undo");
	Map.Insert("EditRedo", "redo");
	Map.Insert("EditReplace", "editor.action.startFindReplaceAction");
	Map.Insert("ViewFoldAll", "editor.foldAll");
	Map.Insert("ViewUnfold1", "editor.foldLevel1");
	Map.Insert("ViewUnfold2", "editor.foldLevel2");
	Map.Insert("ViewUnfold3", "editor.foldLevel3");
	Map.Insert("ViewUnfold4", "editor.foldLevel4");
	Map.Insert("ViewUnfold5", "editor.foldLevel5");
	Map.Insert("ViewUnfold6", "editor.foldLevel6");
	Map.Insert("ViewUnfold7", "editor.foldLevel7");
	Map.Insert("ViewUnfoldAll", "editor.unfoldAll");
	Map.Insert("ViewZoomIn", "editor.action.fontZoomIn");
	Map.Insert("ViewZoomOut", "editor.action.fontZoomOut");
	Map.Insert("ViewZoomReset", "editor.action.fontZoomReset");
	VanessaEditor().editor.trigger("", Map[Command.Name]);

КонецПроцедуры

&НаКлиенте
Процедура LoadStepsAll(Command)

	GherkinProvider().setStepList(VanessaStepList("en"), True);
	GherkinProvider().setStepList(VanessaStepList("ru"), False);

КонецПроцедуры

&НаКлиенте
Процедура LoadStepsEn(Command)

	GherkinProvider().setStepList(VanessaStepList("en"), True);

КонецПроцедуры

&НаКлиенте
Процедура LoadStepsRu(Command)

	GherkinProvider().setStepList(VanessaStepList("ru"), True);

КонецПроцедуры

&НаКлиенте
Процедура LoadKeywordsAll(Command)
	GherkinProvider().setKeywords(GetKeywords());
КонецПроцедуры

&НаКлиенте
Процедура LoadKeywordsEn(Command)
	GherkinProvider().setKeywords(GetKeywords("en"));
КонецПроцедуры

&НаКлиенте
Процедура LoadKeywordsRu(Command)
	GherkinProvider().setKeywords(GetKeywords("ru"));
КонецПроцедуры

&НаКлиенте
Процедура ShowMessage(Command)
	VanessaEditor().showMessage(MessageText);
КонецПроцедуры

&НаКлиенте
Функция GetKeyCodeMap()

	Map = New Map;
	Map.Insert(0, "Unknown");
	Map.Insert(1, "Backspace");
	Map.Insert(2, "Tab");
	Map.Insert(3, "Enter");
	Map.Insert(4, "Shift");
	Map.Insert(5, "Ctrl");
	Map.Insert(6, "Alt");
	Map.Insert(7, "PauseBreak");
	Map.Insert(8, "CapsLock");
	Map.Insert(9, "Escape");
	Map.Insert(10, "Space");
	Map.Insert(11, "PageUp");
	Map.Insert(12, "PageDown");
	Map.Insert(13, "End");
	Map.Insert(14, "Home");
	Map.Insert(15, "LeftArrow");
	Map.Insert(16, "UpArrow");
	Map.Insert(17, "RightArrow");
	Map.Insert(18, "DownArrow");
	Map.Insert(19, "Insert");
	Map.Insert(20, "Delete");
	Map.Insert(21, "KEY_0");
	Map.Insert(22, "KEY_1");
	Map.Insert(23, "KEY_2");
	Map.Insert(24, "KEY_3");
	Map.Insert(25, "KEY_4");
	Map.Insert(26, "KEY_5");
	Map.Insert(27, "KEY_6");
	Map.Insert(28, "KEY_7");
	Map.Insert(29, "KEY_8");
	Map.Insert(30, "KEY_9");
	Map.Insert(31, "KEY_A");
	Map.Insert(32, "KEY_B");
	Map.Insert(33, "KEY_C");
	Map.Insert(34, "KEY_D");
	Map.Insert(35, "KEY_E");
	Map.Insert(36, "KEY_F");
	Map.Insert(37, "KEY_G");
	Map.Insert(38, "KEY_H");
	Map.Insert(39, "KEY_I");
	Map.Insert(40, "KEY_J");
	Map.Insert(41, "KEY_K");
	Map.Insert(42, "KEY_L");
	Map.Insert(43, "KEY_M");
	Map.Insert(44, "KEY_N");
	Map.Insert(45, "KEY_O");
	Map.Insert(46, "KEY_P");
	Map.Insert(47, "KEY_Q");
	Map.Insert(48, "KEY_R");
	Map.Insert(49, "KEY_S");
	Map.Insert(50, "KEY_T");
	Map.Insert(51, "KEY_U");
	Map.Insert(52, "KEY_V");
	Map.Insert(53, "KEY_W");
	Map.Insert(54, "KEY_X");
	Map.Insert(55, "KEY_Y");
	Map.Insert(56, "KEY_Z");
	Map.Insert(57, "Meta");
	Map.Insert(58, "ContextMenu");
	Map.Insert(59, "F1");
	Map.Insert(60, "F2");
	Map.Insert(61, "F3");
	Map.Insert(62, "F4");
	Map.Insert(63, "F5");
	Map.Insert(64, "F6");
	Map.Insert(65, "F7");
	Map.Insert(66, "F8");
	Map.Insert(67, "F9");
	Map.Insert(68, "F10");
	Map.Insert(69, "F11");
	Map.Insert(70, "F12");
	Map.Insert(71, "F13");
	Map.Insert(72, "F14");
	Map.Insert(73, "F15");
	Map.Insert(74, "F16");
	Map.Insert(75, "F17");
	Map.Insert(76, "F18");
	Map.Insert(77, "F19");
	Map.Insert(78, "NumLock");
	Map.Insert(79, "ScrollLock");
	Map.Insert(80, "US_SEMICOLON");
	Map.Insert(81, "US_EQUAL");
	Map.Insert(82, "US_COMMA");
	Map.Insert(83, "US_MINUS");
	Map.Insert(84, "US_DOT");
	Map.Insert(85, "US_SLASH");
	Map.Insert(86, "US_BACKTICK");
	Map.Insert(87, "US_OPEN_SQUARE_BRACKET");
	Map.Insert(88, "US_BACKSLASH");
	Map.Insert(89, "US_CLOSE_SQUARE_BRACKET");
	Map.Insert(90, "US_QUOTE");
	Map.Insert(91, "OEM_8");
	Map.Insert(92, "OEM_102");
	Map.Insert(93, "NUMPAD_0");
	Map.Insert(94, "NUMPAD_1");
	Map.Insert(95, "NUMPAD_2");
	Map.Insert(96, "NUMPAD_3");
	Map.Insert(97, "NUMPAD_4");
	Map.Insert(98, "NUMPAD_5");
	Map.Insert(99, "NUMPAD_6");
	Map.Insert(100, "NUMPAD_7");
	Map.Insert(101, "NUMPAD_8");
	Map.Insert(102, "NUMPAD_9");
	Map.Insert(103, "NUMPAD_MULTIPLY");
	Map.Insert(104, "NUMPAD_ADD");
	Map.Insert(105, "NUMPAD_SEPARATOR");
	Map.Insert(106, "NUMPAD_SUBTRACT");
	Map.Insert(107, "NUMPAD_DECIMAL");
	Map.Insert(108, "NUMPAD_DIVIDE");
	Map.Insert(109, "KEY_IN_COMPOSITION");
	Map.Insert(110, "ABNT_C1");
	Map.Insert(111, "ABNT_C2");
	Map.Insert(112, "MAX_VALUE");
	Return Map;

КонецФункции

&НаКлиенте
Процедура TraceKeyboardOnChange(Item)
	VanessaEditor().traceKeyboard = TraceKeyboard;
КонецПроцедуры

&НаКлиенте
Процедура ClearEditorEvents(Command)
	EventLog.Clear();
КонецПроцедуры

#EndRegion

#Region Breakpoints

&НаКлиенте
Процедура BreakpointsOnChange(Item)

	DecorateBreakpoints(VanessaEditor());

КонецПроцедуры

&НаКлиенте
Процедура BreakpointsBeforeEditEnd(Item, NewRow, CancelEdit, Cancel)

	Breakpoints.Sort("codeWidget,lineNumber");

	//Value = 0;
	//For Each Row In Breakpoints Do
	//	If Value = Row.Value Then
	//		Cancel = True;
	//		Return;
	//	EndIf;
	//	Value = Row.Value;
	//EndDo;

КонецПроцедуры

&НаКлиенте
Процедура BreakpointsOnActivateRow(Item)

	If Item.CurrentData = Undefined Then
		Return;
	EndIf;

	If Item.CurrentData.codeWidget = 0 Then
		VanessaEditor().revealLine(Item.CurrentData.lineNumber);
	EndIf;

КонецПроцедуры

&НаКлиенте
Процедура UpdateBreakpoints(Json)

	BreakpointsPacket = JsonLoad(Json);

	Breakpoints.Clear();
	For Each Chunk In BreakpointsPacket Do
		FillPropertyValues(Breakpoints.Add(), Chunk);
	EndDo;

	Breakpoints.Sort("codeWidget,lineNumber");

	If EmulateBreakpointUpdateDelay Then
		Sleep();
	EndIf;

КонецПроцедуры

&НаКлиенте
Процедура DecorateBreakpoints(Editor)

	BreakpointsPacket = New Array;

	For Each Row In Breakpoints Do
		Chunk = New Structure("lineNumber,codeWidget,enable");
		FillPropertyValues(Chunk, Row);
		BreakpointsPacket.Add(Chunk);
	EndDo;

	Editor.decorateBreakpoints(JsonDump(BreakpointsPacket));

КонецПроцедуры

#EndRegion

#Region Problems

&НаКлиенте
Процедура ProblemsOnChange(Item)

	DecorateProblems();

КонецПроцедуры

&НаКлиенте
Процедура DecorateProblems()

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

	VanessaEditor().decorateProblems(JsonDump(ProblemsPacket));

КонецПроцедуры

#EndRegion

#Region RuntimeProgress

&НаКлиенте
Процедура CurrentStepOnChange(Item)
	VanessaEditor().setCurrentProgress(CurrentStep);
	VanessaEditor().revealLine(CurrentStep);
КонецПроцедуры

&НаКлиенте
Процедура SetProgress(Command)
	Map = New Map;
	For Each Row In CompleteSteps Do
		Steps = Map.Get(Row.codeWidget);
		If Steps = Undefined Then
			Steps = New Array;
			Map.Insert(Row.codeWidget, Steps);
		EndIf;
		Steps.Add(Row.LineNumber);
	EndDo;
	For each KeyValue In Map Do
		VanessaEditor().setRuntimeProgress(RuntimeStatus, JsonDump(KeyValue.Value), KeyValue.Key, InlineView);
	EndDo;
КонецПроцедуры

&НаКлиенте
Процедура CleanRuntimeProgress(Command)
	VanessaEditor().clearRuntimeProgress();
КонецПроцедуры

#EndRegion

#Region Json

&НаКлиенте
Функция JsonLoad(Json, ReadToMap = False)

	JSONReader = New JSONReader;
	JSONReader.SetString(Json);
	Value = ReadJSON(JSONReader, ReadToMap);
	JSONReader.Close();
	Return Value;

КонецФункции

&НаКлиенте
Функция JsonDump(Value)

	JSONWriter = New JSONWriter;
	JSONWriter.SetString();
	WriteJSON(JSONWriter, Value);
	Return JSONWriter.Close();

КонецФункции

#EndRegion

#Region Utils

Процедура Sleep(Delay = 1)

	RunApp("timeout " + Delay, , True);

КонецПроцедуры

#EndRegion

#Region VanessaEditor

#Region Public

&НаКлиенте
Процедура AppendEventLog(Event, Data)

	EventRecord = EventLog.Insert(0);
	EventRecord.Date = CurrentDate();
	EventRecord.Type = Event;
	EventRecord.Data = Data;
	Items.EventLog.CurrentRow = EventLog.IndexOf(EventRecord);

КонецПроцедуры

&НаКлиенте
Функция GetKeyInfo(Data)

	res = "";
	If Data.metaKey Then res = res + "Win+"; EndIf;
	If Data.ctrlKey Then res = res + "Ctrl+"; EndIf;
	If Data.altKey Then res = res + "Alt+"; EndIf;
	If Data.shiftKey Then res = res + "Shift+"; EndIf;
	Return res + KeyCodeMap[Data.keyCode] + " (" + Data.keyCode + ")";

КонецФункции

&НаКлиенте
Процедура CreateStep(Editor, lineNumber)

	Text = VanessaEditor().getLineContent(lineNumber);

	Map = New Map;
	Map.Insert("filterText", Text);
	Map.Insert("insertText", Text);
	Map.Insert("sortText", Text);
	Map.Insert("documentation", "New step, created by user");
	Map.Insert("kind", 0);
	Map.Insert("section", "Custom user step");

	Array = New Array;
	Array.Add(Map);

	GherkinProvider().setStepList(JsonDump(Array), False);

КонецПроцедуры

&НаКлиенте
Процедура VanessaEditorOnReceiveEventHandler(Editor, Event, Arg)

	If Event = "UPDATE_BREAKPOINTS" Then
		UpdateBreakpoints(Arg);
		DecorateBreakpoints(Editor);
	ElsIf Event = "F9" Then
		AppendEventLog(Event, Arg);
		Editor.toggleBreakpoint();
	ElsIf Event = "CREATE_STEP" Then
		AppendEventLog(Event, Arg);
		CreateStep(Editor, Arg);
	ElsIf Event = "SHOW_STEP_IN_TREE" Then
		// Редактор прислал контекст шага под курсором: в демо показываем его
		// текстом, в VA по нему раскрывается дерево библиотеки шагов.
		AppendEventLog(Event, Arg);
		ПоказатьПодсказку("Шаг под курсором: " + Arg);
	ElsIf Event = "OPEN_STEP_AS_FEATURE" Then
		AppendEventLog(Event, Arg);
		ПоказатьПодсказку("Открыть фичу шага: " + Arg);
	Else
		AppendEventLog(Event, Arg);
	EndIf;

КонецПроцедуры

#EndRegion

#Region Public

&НаКлиенте
Процедура LoadEditor()

	If Not ValueIsFilled(EditorTemplateURL) Then
		Return;
	EndIf;

	EditorDirectory = ExtractTemplates(GetFromTempStorage(EditorTemplateURL));
	VanessaEditorURL = EditorDirectory + "/index.html?localeCode=" + Left(CurrentSystemLanguage(), 2) + "#";

КонецПроцедуры

&НаКлиенте
Функция ExtractTemplates(BinaryData)

	Directory = GetTempFileName();
	DeleteFiles(Directory);
	CreateDirectory(Directory);

	ZipFileReader = New ZipFileReader(BinaryData.OpenStreamForRead());
	For Each ZipFileEntry In ZipFileReader.Items Do
		ZipFileReader.Extract(ZipFileEntry, Directory, ZIPRestoreFilePathsMode.Restore);
	EndDo;

	Return Directory;

КонецФункции

&НаКлиенте
Функция TemplateText(BinaryData, EntryBaseName = "")

	// EntryBaseName = "" — берётся первый файл архива.
	Directory = ExtractTemplates(BinaryData);
	Result = "";
	ZipFileReader = New ZipFileReader(BinaryData.OpenStreamForRead());
	For Each ZipFileEntry In ZipFileReader.Items Do
		If EntryBaseName = "" Or ZipFileEntry.BaseName = EntryBaseName Then
			TextReader = New TextReader(Directory + "/" + ZipFileEntry.FullName, TextEncoding.UTF8);
			Result = TextReader.Read();
			TextReader.Close();
			Break;
		EndIf;
	EndDo;
	DeleteFiles(Directory);

	Return Result;

КонецФункции

#EndRegion

#Region Private

&НаКлиенте
Процедура VanessaEditorOnClick(Item, EventData, StandardProcessing)

	Element = EventData.Element;
	If Lower(Element.tagName) = "body" Then
		StandardProcessing = false;
		If EventData.Event.type <> "click" Then
			Return;
		EndIf;
		EventDataFor1C = EventData.Event.detail;

		If EventDataFor1C = Undefined Или TypeOf(EventDataFor1C) = Type("Number") Then
			Return;
		EndIf;
		EventType = EventDataFor1C.name; //Строка
		Data = EventDataFor1C.data; // Неопределено, Строка, Произвольный
		If Not ValueIsFilled(EventType) Then
			Return;
		EndIf;
		VanessaEditorOnReceiveEventHandler(EventDataFor1C.editor, EventType, Data);
	ElsIf CharCode(Element.innerText, 1) = 60020 Then
		Message(Element.title);
	ElsIf CharCode(Element.innerText, 1) = 60277 Then
		Message(Element.title);
	EndIf;

КонецПроцедуры

&НаКлиенте
Процедура FillEditorActions(Editor)

	TextJSON = Editor.getActions();
	JSONReader = New JSONReader;
	JSONReader.SetString(TextJSON);
	ActionArray = ReadJSON(JSONReader);
	For Each Action In ActionArray Do
		FillPropertyValues(Actions.Add(), Action);
	EndDo;
	Actions.Sort("Id");

КонецПроцедуры

&НаКлиенте
Функция GetKeywords(Language = "")

	JsonText = TemplateText(GetFromTempStorage(KeywordsTemplateURL));

	JsonData = JsonLoad(JsonText, True);
	Keyrords = New Map;
	If IsBlankString(Language) Then
		Keyrords.Insert("en", JsonData.Get("en"));
		Keyrords.Insert("ru", JsonData.Get("ru"));
	Else
		Keyrords.Insert(Language, JsonData.Get(Language));
	EndIf;

	Return JsonDump(Keyrords);

КонецФункции

&НаКлиенте
Функция GetElements()

	Map = New Map;
	Map.Insert("ИмяКоманды", "ЗаписатьИЗакрыть");
	Map.Insert("ИмяКнопки", "ФормаЗаписать");
	Map.Insert("ИмяТаблицы", "Номенклатура");
	Map.Insert("ИмяРеквизита", "Количество");
	Return JsonDump(Map);

КонецФункции

&НаКлиенте
Функция GetVariables()

	Map = New Map;
	Map.Insert("ИмяКоманды", "ЗаписатьИЗакрыть");
	Map.Insert("ИмяКнопки", "ФормаЗаписать");
	Map.Insert("ИмяТаблицы", "Номенклатура");
	Map.Insert("ИмяРеквизита", "Количество");
	Return JsonDump(Map);

КонецФункции

&НаКлиенте
Функция GetMetatags()

	words = "
		|try
		|except
		|endtry
		|попытка
		|исключение
		|конецпопытки
		|";

	split = "
	|";

	Metatags = StrSplit(words, split, False);

	Return JsonDump(Metatags);

КонецФункции

&НаКлиенте
Функция GetDirectives()

	Map = New Map;
	Map.Insert("if", StrSplit("Если,If", ","));
	Map.Insert("elsif", StrSplit("ИначеЕсли,Иначе,ElseIf,Else", ","));
	Map.Insert("endif", StrSplit("КонецЕсли,EndIf", ","));
	Return JsonDump(Map);

КонецФункции

&НаКлиенте
Функция VanessaStepList(Language)

	Return TemplateText(GetFromTempStorage(StepListTemplateURL), Language);

КонецФункции

&НаКлиенте
Функция GetCommands()

	CmdList = New Array;

	KeyMod = New Array;
	CmdList.Add(New Structure("eventId,keyCode,keyMod", "F5", "F5", KeyMod));

	KeyMod = New Array;
	KeyMod.Add("Alt");
	CmdList.Add(New Structure("eventId,keyCode,keyMod", "Alt+F5", "F5", KeyMod));

	KeyMod = New Array;
	KeyMod.Add("Shift");
	KeyMod.Add("CtrlCmd");
	CmdList.Add(New Structure("eventId,keyCode,keyMod", "Ctrl+Shift+F5", "F5", KeyMod));

	KeyMod = New Array;
	CmdList.Add(New Structure("eventId,keyCode,keyMod", "F9", "F9", KeyMod));

	KeyMod = New Array;
	CmdList.Add(New Structure("eventId,keyCode,keyMod", "F11", "F11", KeyMod));

	CmdList.Add(New Structure("eventId, title", "CREATE_STEP", "Create new step!"));
	CmdList.Add(New Structure("eventId, title", "IGNORE_ERROR", "Ignore this error"));

	CmdList.Add(New Structure("eventId, errorLink", "ERROR_DATA", "Details"));
	CmdList.Add(New Structure("eventId, errorLink", "ERROR_COPY", "Copy error"));

	Return JsonDump(CmdList);

КонецФункции

&НаКлиенте
Функция GetErrorLinks()

	Links = New Array;
	Links.Add(New Structure("id, title", "ERROR_DATA", "Details"));
	Links.Add(New Structure("id, title", "ERROR_COPY", "Copy error"));
	Return JsonDump(Links);

КонецФункции

&НаКлиенте
Процедура VanessaEditorDocumentComplete(Item)

	Var Provider, Editor;

	MsgStructure = New Structure;
	MsgStructure.Insert("syntaxMsg", "Syntax error: step not found");
	MsgStructure.Insert("soundHint", "Sound text");
	MessagesJSON = JsonDump(MsgStructure);

	Provider = DefaultView().VanessaGherkinProvider;
	Provider.setErrorLinks(GetErrorLinks());
	Provider.setMetatags(GetMetatags());
	Provider.setKeywords(GetKeywords());
	Provider.setElements(GetElements());
	Provider.setVariables(GetVariables());
	Provider.setDirectives(GetDirectives());
	Provider.setMessages(MessagesJSON);
	LoadStepsAll(Undefined);

	Editor = DefaultView().createVanessaEditor("", "turbo-gherkin");
	Editor.addCommands(GetCommands());
	FillEditorActions(Editor);

	УсловныеОператоры = Новый Соответствие;
	МассивСлов = Новый Массив;
	МассивСлов.Добавить("then");
	УсловныеОператоры.Вставить("if", МассивСлов);
	МассивСлов = Новый Массив;
	МассивСлов.Добавить("Тогда");
	УсловныеОператоры.Вставить("Если", МассивСлов);

	ЗаписьJSON = Новый ЗаписьJSON;
	ЗаписьJSON.УстановитьСтроку();
	ЗаписатьJSON(ЗаписьJSON, УсловныеОператоры);
	УсловныеОператоры = ЗаписьJSON.Закрыть();
	Provider.setKeypairs(УсловныеОператоры);

КонецПроцедуры

&НаКлиенте
Функция DefaultView()

	Return Items.VanessaEditor.Document.defaultView;

КонецФункции

&НаКлиенте
Функция VanessaEditor()

	Return DefaultView().VanessaEditor;

КонецФункции

&НаКлиенте
Функция GherkinProvider()

	Return DefaultView().VanessaGherkinProvider;

КонецФункции

&НаКлиенте
Процедура ShowSubcode(Command)

	Cоntent =
		"Функционал: Проверка формирования отчета Allure
		|
		|Как разработчик
		|Я хочу чтобы корректно формировался отчет Allure
		|Чтобы я мог видеть результат работы сценариев
		|
		|Контекст:
		|	Дано подсценарий первого уровня номер один
		|	Дано подсценарий первого уровня номер два
		|Структура сценария: Прикрепление скриншота, когда используется VanessaExt. Одно окно. Весь экран.
		|	Дано подсценарий первого уровня номер один
		|	Дано подсценарий первого уровня номер два
		|	И нормальная строка
		|";

	Cоntent1 =
		"	К тому же шаг подсценария 1
		|		И шаг подсценария 2
		|		И шаг подсценария 3
		|";

	Cоntent2 =
		"	И подсценрий второго уровня
		|		И шаг подсценария 4
		|		И шаг подсценария 5
		|		И шаг подсценария 6
		|";

	VanessaEditor().setContent(Cоntent);
	VanessaEditor().showRuntimeCode(8, Cоntent1 + Cоntent2);
	VanessaEditor().showRuntimeCode(11, Cоntent1);
	VanessaEditor().showRuntimeCode(12, Cоntent2);

КонецПроцедуры

&НаКлиенте
Процедура RunSubcode(Command)
	AttachIdleHandler("NextRuntimeStep", 1, False);
КонецПроцедуры

&НаКлиенте
Процедура StopSubcode(Command)
	DetachIdleHandler("NextRuntimeStep");
КонецПроцедуры

&НаКлиенте
Процедура NextRuntimeStep()
	Pos = VanessaEditor().nextRuntimeProgress();
	If Pos = Undefined Then
		RuntimePosition = Undefined;
		RuntimeCode = Undefined;
	Else
		RuntimePosition = "(" + Format(Pos.lineNumber, "NG=") + ", " + Pos.codeWidget + ")";
		RuntimeCode = VanessaEditor().getLineContent(Pos.lineNumber, Pos.codeWidget);
	EndIf;
КонецПроцедуры

&НаКлиенте
Процедура ShowMinimapOnChange(Item)

	Элементы.VanessaEditor.Документ.defaultView.VanessaTabs.showMinimap = ShowMinimap;

КонецПроцедуры

&НаКлиенте
Функция GetMarkdownText()

	Try
		TextDocument = New TextDocument;
		TextDocument.Read("C:\Cpp\VAEditor\README.md", TextEncoding.UTF8);
		return TextDocument.GetText();
	Except
		return Undefined;
	EndTry;

КонецФункции

&НаКлиенте
Процедура EditorTypeOnChange(Item)

	View = DefaultView();

	text1 =
		"#language: en
		|
		|@IgnoreOnCIMainBuild
		|
		|Feature: <feature description>
		|
		|As <Role>
		|I want <functionality description>
		|To <business effect>
		|
		|
		|Scenario: Simple startup script
		|
		|	And I execute 1C:Enterprise script
		|		| 'Message(""Hellow world!"")'
		|
		|	Then I raise ""Exception text"" exception
		|";

	text2 =
		"#language: en
		|
		|@IgnoreOnCIMainBuild
		|
		|Feature: <feature description>
		|
		|As <Role>
		|I want <functionality description>
		|To <business effect>
		|
		|
		|Scenario: <scenario description>
		|
		|	Then I stop script execution
		|
		|	Then I raise ""Exception text"" exception
		|";

	Language = "turbo-gherkin";
	If EditorType = 0 Then
		View.disposeVanessaTabs();
		View.disposeVanessaDiffEditor();
		View.createVanessaEditor(text1, Language);
	ElsIf EditorType = 3 Then
		View.disposeVanessaEditor();
		View.disposeVanessaDiffEditor();
		tabs = View.createVanessaTabs();
		f = "Simple.feature";
		tabs.edit(text1, f, "1" + f, f, 0, false, true);
		tabs.edit(text2, f, "2" + f, f, 0, false, true);
		tabs.diff(text1, f, "1" + f, text2, f, "2" + f, f, 0, false, true);
		MarkdownText = GetMarkdownText();
		If Not IsBlankString(MarkdownText) Then
			f = "readme.md";
			tabs.view(f, f, MarkdownText, true);
		EndIf;
	Else
		SideBySide = 2;
		View.disposeVanessaTabs();
		View.disposeVanessaEditor();
		DiffEditor = View.createVanessaDiffEditor(text1, text2, Language);
		DiffEditor.setSideBySide(EditorType = SideBySide);
	EndIf;

КонецПроцедуры

#EndRegion
&НаКлиенте
Процедура UseDebuggerOnChange(Элемент)

	DefaultView().useVanessaDebugger(useDebugger);

КонецПроцедуры

&НаКлиенте
Процедура TabSizeOnChange(Item)
	VanessaEditor().setTabSize(TabSize);
КонецПроцедуры

&НаКлиенте
Процедура InsertSpacesOnChange(Item)
	VanessaEditor().setInsertSpaces(InsertSpaces);
КонецПроцедуры

&НаКлиенте
Процедура NormalizeIndentation(Command)
	VanessaEditor().normalizeIndentation();
КонецПроцедуры

&НаКлиенте
Процедура Whitespaces(Команда)

	Элементы.VanessaEditor.Документ.defaultView.VanessaTabs.renderWhitespace = "boundary";

КонецПроцедуры

&НаКлиенте
Процедура Autotest(Command)

	Position = StrFind(FormName, ".", SearchDirection.FromEnd);
	OpenForm(Left(FormName, Position) + "Autotest");

КонецПроцедуры

#EndRegion

#Region ДемонстрацияВозможностей

// Каждая команда ниже показывает одну возможность редактора так, чтобы результат
// был виден сразу: сообщением, новой вкладкой или изменением текста.

&НаКлиенте
Процедура ПоказатьПодсказку(Текст)

	Сообщение = Новый СообщениеПользователю;
	Сообщение.Текст = Текст;
	Сообщение.Сообщить();

КонецПроцедуры

&НаКлиенте
Функция СобратьТекст(Строки)

	Возврат СтрСоединить(Строки, Символы.ПС);

КонецФункции

// Форматирование фичи: то же, что Shift+Alt+F. Выравнивает таблицы параметров,
// приводит отступы секций и шагов, убирает хвостовые пробелы.
&НаКлиенте
Процедура ФорматироватьДокумент(Команда)

	VanessaEditor().formatDocument();

КонецПроцедуры

// Символ комментария строки: '#' — стандарт Gherkin, '//' — как в старых базах.
// Токенизатор понимает оба, при форматировании маркер приводится к выбранному.
&НаКлиенте
Процедура ПереключитьСимволКомментария(Команда)

	Если GherkinProvider().lineComment = "#" Тогда
		GherkinProvider().setLineComment("//");
	Иначе
		GherkinProvider().setLineComment("#");
	КонецЕсли;

	ПоказатьПодсказку("Символ комментария строки: " + GherkinProvider().lineComment);

КонецПроцедуры

// Шаг под курсором уходит в 1С событием SHOW_STEP_IN_TREE: редактор не знает
// дерева библиотеки шагов, навигацию выполняет принимающая сторона.
&НаКлиенте
Процедура ПоказатьШагВДереве(Команда)

	VanessaEditor().showStepInTree();

КонецПроцедуры

&НаКлиенте
Процедура ОткрытьШагКакФичу(Команда)

	VanessaEditor().openStepAsFeature();

КонецПроцедуры

// Три языка в отдельных вкладках. Язык вкладки выбирается по расширению файла,
// поэтому достаточно передать правильное имя файла: demo.feature, demo.bsl,
// demo.xbsl. Четвёртая вкладка — diff двух версий BSL.
&НаКлиенте
Процедура ПоказатьЯзыки(Команда)

	Представление = DefaultView();
	Представление.disposeVanessaEditor();
	Представление.disposeVanessaDiffEditor();
	Представление.disposeVanessaTabs();

	Вкладки = Представление.createVanessaTabs();

	Вкладки.edit(ТекстФичи(), "demo.feature", "demo.feature", "Gherkin — форматирование", 0, Ложь, Истина);
	Вкладки.edit(ТекстBsl(), "demo.bsl", "demo.bsl", "BSL — встроенный язык", 0, Ложь, Истина);
	Вкладки.edit(ТекстXbsl(), "demo.xbsl", "demo.xbsl", "xBSL — 1С:Элемент", 0, Ложь, Истина);
	Вкладки.diff(ТекстBslДо(), "demo.bsl", "demo-old.bsl",
		ТекстBslПосле(), "demo.bsl", "demo-new.bsl",
		"BSL — было / стало", 0, Ложь, Истина);

КонецПроцедуры

// Фича для вкладки: таблица специально неровная — после форматирования столбцы
// выровняются по самой широкой ячейке.
&НаКлиенте
Функция ТекстФичи()

	Строки = Новый Массив;
	Строки.Добавить("#language: ru");
	Строки.Добавить("");
	Строки.Добавить("Функционал: Демонстрация редактора");
	Строки.Добавить("");
	Строки.Добавить("Сценарий: Таблица параметров");
	Строки.Добавить("	Дано я открываю форму ""Номенклатура""");
	Строки.Добавить("	И таблица с параметрами");
	Строки.Добавить("		| Имя | Значение |");
	Строки.Добавить("		| Количество | 10 |");
	Строки.Добавить("		| Цена | 100 |");
	Строки.Добавить("	Когда я нажимаю Shift+Alt+F");
	Строки.Добавить("	Тогда столбцы выравниваются по самой широкой ячейке");
	Строки.Добавить("");
	Строки.Добавить("// комментарий строки: символ переключается кнопкой «Символ комментария»");

	Возврат СобратьТекст(Строки);

КонецФункции

&НаКлиенте
Функция ТекстBsl()

	Строки = Новый Массив;
	Строки.Добавить("// BSL: ключевые слова, строки, литерал даты, многострочный комментарий");
	Строки.Добавить("&НаСервере");
	Строки.Добавить("Процедура Демонстрация(Значение) Экспорт");
	Строки.Добавить("");
	Строки.Добавить("	Запрос = Новый Запрос;");
	Строки.Добавить("	Запрос.Текст = ""ВЫБРАТЬ Ссылка ИЗ Справочник.Номенклатура"";");
	Строки.Добавить("	Результат = Запрос.Выполнить();");
	Строки.Добавить("");
	Строки.Добавить("	Дата = '20240101';");
	Строки.Добавить("	Если Значение = Неопределено Тогда");
	Строки.Добавить("		Сообщить(""Значение не задано"");");
	Строки.Добавить("	КонецЕсли;");
	Строки.Добавить("");
	Строки.Добавить("КонецПроцедуры");
	Строки.Добавить("");
	Строки.Добавить("/* Многострочный комментарий: подсветка внутри не переключается. */");

	Возврат СобратьТекст(Строки);

КонецФункции

&НаКлиенте
Функция ТекстBslДо()

	Строки = Новый Массив;
	Строки.Добавить("// BSL до правки: одна ветка условия");
	Строки.Добавить("&НаСервере");
	Строки.Добавить("Процедура Демонстрация(Значение) Экспорт");
	Строки.Добавить("");
	Строки.Добавить("	Если Значение = Неопределено Тогда");
	Строки.Добавить("		Сообщить(""Значение не задано"");");
	Строки.Добавить("	КонецЕсли;");
	Строки.Добавить("");
	Строки.Добавить("КонецПроцедуры");

	Возврат СобратьТекст(Строки);

КонецФункции

&НаКлиенте
Функция ТекстBslПосле()

	Строки = Новый Массив;
	Строки.Добавить("// BSL после правки: добавлена ветка Иначе");
	Строки.Добавить("&НаСервере");
	Строки.Добавить("Процедура Демонстрация(Значение) Экспорт");
	Строки.Добавить("");
	Строки.Добавить("	Если Значение = Неопределено Тогда");
	Строки.Добавить("		Сообщить(""Значение не задано"");");
	Строки.Добавить("	Иначе");
	Строки.Добавить("		Сообщить(Значение);");
	Строки.Добавить("	КонецЕсли;");
	Строки.Добавить("");
	Строки.Добавить("КонецПроцедуры");

	Возврат СобратьТекст(Строки);

КонецФункции

// xBSL («1С:Элемент»): ключевые слова только строчными, аннотация @Глобально,
// директива импорта #требуется, пространство имён Стд::Строка, интерполяция
// в строке и регулярное выражение в апострофах.
&НаКлиенте
Функция ТекстXbsl()

	Строки = Новый Массив;
	Строки.Добавить("// xBSL («1С:Элемент»)");
	Строки.Добавить("#требуется модуль.sbsl");
	Строки.Добавить("");
	Строки.Добавить("@Глобально");
	Строки.Добавить("метод Демонстрация(Значение: Стд::Строка)");
	Строки.Добавить("	пер Длина = 100");
	Строки.Добавить("	пер Ширина = 30");
	Строки.Добавить("	знч Площадь = ""Площадь равна ${Длина * Ширина} м2""");
	Строки.Добавить("	знч Образец = '\d+'");
	Строки.Добавить("	Консоль.Записать(Площадь)");
	Строки.Добавить(";");

	Возврат СобратьТекст(Строки);

КонецФункции

#EndRegion
