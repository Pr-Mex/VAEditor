&AtClient
Var VanessaEditor, VanessaGherkinProvider;

&AtClient
Var KeyCodeMap;

#Region FormEvents

&AtServer
Procedure OnCreateAtServer(Cancel, StandardProcessing)

	VanessaEditorLoad();
	MessageText = "Hello, world!";
	EditorTheme = "1c";
	LineNumber = 1;
	Column = 1;

EndProcedure

&AtClient
Procedure OnOpen(Cancel)
	KeyCodeMap = GetKeyCodeMap();
EndProcedure

&AtClient
Procedure LoadFile(Command)

	Breakpoints.Clear();
	Problems.Clear();
	VanessaEditor.decorateBreakpoints(JsonDump(New Array));
	VanessaEditor.decorateProblems(JsonDump(New Array));

	Dialog = New FileDialog(FileDialogMode.Open);
	If Dialog.Choose() Then
		TextReader = New TextReader(Dialog.FullFileName, TextEncoding.UTF8);
		Text = TextReader.Read();
		VanessaEditor.setContent(Text);
	EndIf;

EndProcedure

&AtClient
Procedure GetValue(Command)

	UserMessage = New UserMessage;
	UserMessage.Text = VanessaEditor.getContent();
	UserMessage.Message();

EndProcedure

&AtClient
Procedure ReadOnlyModeOnChange(Item)

	VanessaEditor.setReadOnly(ReadOnlyMode);

EndProcedure

&AtClient
Procedure EditorThemeOnChange(Item)

	VanessaEditor.setTheme(EditorTheme);

EndProcedure

&AtClient
Procedure PositionOnChange(Item)

	VanessaEditor.setPosition(LineNumber, Column);

EndProcedure

&AtClient
Procedure GetPosition(Command)

	Arg = VanessaEditor.getPosition();
	UserMessage = New UserMessage;
	UserMessage.Text = "Position: lineNumber = "
		+ Format(Arg.lineNumber, "NG=")	+ ", column = "
		+ Format(Arg.column, "NG=");
	UserMessage.Message();

EndProcedure

&AtClient
Procedure GetLineContent(Command)

	UserMessage = New UserMessage;
	UserMessage.Text = VanessaEditor.getLineContent(lineNumber);
	UserMessage.Message();

EndProcedure

&AtClient
Procedure InsertText(Command)
	VanessaEditor.insertText(MessageText);
EndProcedure

&AtClient
Procedure ReplaceText(Command)
	
	Map = new Map;
	Map.Insert("startLineNumber", LineNumber);
	Map.Insert("startColumn", 1);
	Map.Insert("endLineNumber", LineNumber);
	Map.Insert("endColumn", Column);
	VanessaEditor.insertText(MessageText, JsonDump(Map));

EndProcedure

#EndRegion

#Region FormActiond

&AtClient
Procedure EditorAction(Command)
	
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
	VanessaEditor.editor.trigger("", Map[Command.Name]);
	
EndProcedure

&AtClient
Procedure LoadStepsEn(Command)

	VanessaGherkinProvider.setStepList(VanessaStepList("en"), True);

EndProcedure

&AtClient
Procedure LoadStepsRu(Command)

	VanessaGherkinProvider.setStepList(VanessaStepList("ru"), True);

EndProcedure

&AtClient
Procedure LoadStepsAll(Command)

	VanessaGherkinProvider.setStepList(VanessaStepList("en"), True);
	VanessaGherkinProvider.setStepList(VanessaStepList("ru"), False);

EndProcedure

&AtClient
Procedure ShowMessage(Command)
	VanessaEditor.showMessage(MessageText);
EndProcedure

&AtClient
Function GetKeyCodeMap()
	
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
	return Map;
	
EndFunction

&AtClient
Procedure TraceKeyboardOnChange(Item)
	VanessaEditor.useKeyboardTracer = TraceKeyboard;
EndProcedure

&AtClient
Procedure ClearEventLog(Command)
	EventLog.Clear();
EndProcedure

#EndRegion

#Region Breakpoints

&AtClient
Procedure BreakpointsOnChange(Item)

	DecorateBreakpoints();

EndProcedure

&AtClient
Procedure BreakpointsBeforeEditEnd(Item, NewRow, CancelEdit, Cancel)

	Breakpoints.SortByValue();

	Value = 0;
	For Each Row In Breakpoints Do
		If Value = Row.Value Then
			Cancel = True;
			Return;
		EndIf;
		Value = Row.Value;
	EndDo;

EndProcedure

&AtClient
Procedure BreakpointsOnActivateRow(Item)

	If Item.CurrentData = Undefined Then
		Return;
	EndIf;

	VanessaEditor.revealLine(Item.CurrentData.Value);

EndProcedure

&AtClient
Procedure UpdateBreakpoints(Json)

	BreakpointsPacket = JsonLoad(Json);

	Breakpoints.Clear();
	For Each Chunk In BreakpointsPacket Do
		Breakpoints.Add(Chunk.lineNumber, , Chunk.enable);
	EndDo;

	Breakpoints.SortByValue();

	If EmulateBreakpointUpdateDelay Then
		Sleep();
	EndIf;

EndProcedure

&AtClient
Procedure DecorateBreakpoints()

	BreakpointsPacket = New Array;

	For Each Row In Breakpoints Do
		Chunk = New Structure;
		Chunk.Insert("lineNumber", Row.Value);
		Chunk.Insert("enable", Row.Check);
		BreakpointsPacket.Add(Chunk);
	EndDo;

	VanessaEditor.decorateBreakpoints(JsonDump(BreakpointsPacket));

EndProcedure

#EndRegion

#Region Problems

&AtClient
Procedure ProblemsOnChange(Item)

	DecorateProblems();

EndProcedure

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

	VanessaEditor.decorateProblems(JsonDump(ProblemsPacket));

EndProcedure

#EndRegion

#Region RuntimeProcess

&AtClient
Procedure SendCurrentStep(Command)

	VanessaEditor.decorateCurrentStep(CurrentStep);

EndProcedure

&AtClient
Procedure SendCompleteSteps(Command)

	CompleteStepsPacket = New Array;

	For Each Row In CompleteSteps Do
		Chunk = New Structure;
		Chunk.Insert("lineNumber", Row.LineNumber);
		CompleteStepsPacket.Add(Chunk);
	EndDo;

	VanessaEditor.decorateCompleteSteps(JsonDump(CompleteStepsPacket));

EndProcedure

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

	VanessaEditor.decorateErrorSteps(JsonDump(ErrorStepsPacket));

EndProcedure

&AtClient
Procedure CleanRuntimeProgress(Command)

	VanessaEditor.cleanRuntimeProcess();

EndProcedure

#EndRegion

#Region Json

&AtClient
Function JsonLoad(Json)

	JSONReader = New JSONReader;
	JSONReader.SetString(Json);
	Value = ReadJSON(JSONReader);
	JSONReader.Close();
	Return Value;

EndFunction

&AtClient
Function JsonDump(Value)

	JSONWriter = New JSONWriter;
	JSONWriter.SetString();
	WriteJSON(JSONWriter, Value);
	Return JSONWriter.Close();

EndFunction

#EndRegion

#Region Utils

Procedure Sleep(Delay = 1)

	RunApp("timeout " + Delay, , True);

EndProcedure

#EndRegion

#Region VanessaEditor

#Region Public

&AtClient
Procedure AppendEventLog(Event, Data)
	
	EventRecord = EventLog.Insert(0);
	EventRecord.Date = CurrentDate();
	EventRecord.Type = Event;
	EventRecord.Data = Data;
	Items.EventLog.CurrentRow = EventLog.IndexOf(EventRecord);
	
EndProcedure

&AtClient
Function GetKeyInfo(Data)
	
	res = "";
	If Data.metaKey  then res = res + "Win+"   ; EndIf;
	If Data.ctrlKey  then res = res + "Ctrl+"  ; EndIf;
	If Data.altKey   then res = res + "Alt+"   ; EndIf;
	If Data.shiftKey then res = res + "Shift+" ; EndIf;
	return res + KeyCodeMap[Data.keyCode] +  " (" +  Data.keyCode + ")";
	
EndFunction

&AtClient
Procedure VanessaEditorOnReceiveEventHandler(Event, Arg)

	If Event = "CONTENT_DID_CHANGE" Then
		ContentDidChange = True;
		Modified = True;
	ElsIf Event = "UPDATE_BREAKPOINTS" Then
		UpdateBreakpoints(Arg);
		DecorateBreakpoints();
	ElsIf Event = "POSITION_DID_CHANGE" Then
		Position = "(" + Format(Arg.lineNumber, "NG=") + ", " + Format(Arg.column, "NG=") + ")";
	ElsIf Event = "CHANGE_UNDO_REDO" Then
		Items.FormEditRedo.Enabled = Arg.redo;
		Items.FormEditUndo.Enabled = Arg.undo;
	ElsIf Event = "F9" Then
		AppendEventLog(Event, Arg);
		VanessaEditor.toggleBreakpoint();
	ElsIf Event = "ON_KEY_DOWN" Then
		AppendEventLog(Event, GetKeyInfo(Arg));
	ElsIf Event = "ON_KEY_UP" Then
		AppendEventLog(Event, GetKeyInfo(Arg));
	Else
		AppendEventLog(Event, Arg);
	EndIf;

EndProcedure

#EndRegion

#Region Public

&AtServer
Procedure VanessaEditorLoad()

	TempFileName = GetTempFileName();
	DeleteFiles(TempFileName);
	CreateDirectory(TempFileName);

	BinaryData = FormAttributeToValue("Object").GetTemplate("VanessaEditor");
	ZipFileReader = New ZipFileReader(BinaryData.OpenStreamForRead());
	For each ZipFileEntry In ZipFileReader.Items Do
		ZipFileReader.Extract(ZipFileEntry, TempFileName, ZIPRestoreFilePathsMode.Restore);
		BinaryData = New BinaryData(TempFileName + "/" + ZipFileEntry.FullName);
		VanessaEditorURL = GetInfoBaseURL() + "/" + PutToTempStorage(BinaryData, UUID);
	EndDo;
	DeleteFiles(TempFileName);

EndProcedure

#EndRegion

#Region Private

&AtClient
Procedure VanessaEditorOnClick(Item, EventData, StandardProcessing)

	Element = EventData.Element;
	If Element.id = "VanessaEditorEventForwarder" Then
		While (True) Do
			msg = VanessaEditor.popMessage();
			If (msg = Undefined) Then Break; EndIf;
			VanessaEditorOnReceiveEventHandler(msg.type, msg.data);
		EndDo;
	EndIf;

EndProcedure

&AtClient
Procedure VanessaDiffEditorDocumentComplete(Item)

	text1 =
		"const a = 1;
		|function test(){
		|	return a + 1;
		|}";

	text2 =
		"const a = 2;
		|function test(){
		|	alert('Hello world!');
		|	return a + 2;
		|}";

	Items.VanessaDiffEditor.Document.defaultView.createVanessaDiffEditor(text1, text2, "javascript");

EndProcedure

&AtClient
Function GetKeywords()

	TextJSON = "
		|и
		|когда
		|тогда
		|затем
		|дано
		|функция
		|функционал
		|функциональность
		|свойство
		|предыстория
		|контекст
		|сценарий
		|структура
		|сценария
		|примеры
		|допустим
		|пусть
		|если
		|иначеесли
		|иначе
		|то
		|также
		|но
		|а
		|feature
		|functionality
		|business need
		|ability
		|background
		|scenario outline
		|scenario
		|examples
		|given
		|when
		|then
		|and
		|but
		|if
		|elseif
		|else
		|";

	split = "
		|";

	WordList = StrSplit(TextJSON, split, False);

	Return JsonDump(WordList);

EndFunction

&AtClient
Function GetElements()

	Map = New Map;
	Map.Insert("ИмяКоманды", "ЗаписатьИЗакрыть");
	Map.Insert("ИмяКнопки", "ФормаЗаписать");
	Map.Insert("ИмяТаблицы", "Номенклатура");
	Map.Insert("ИмяРеквизита", "Количество");
	Return JsonDump(Map);

EndFunction

&AtClient
Function GetVariables()

	Map = New Map;
	Map.Insert("ИмяКоманды", "ЗаписатьИЗакрыть");
	Map.Insert("ИмяКнопки", "ФормаЗаписать");
	Map.Insert("ИмяТаблицы", "Номенклатура");
	Map.Insert("ИмяРеквизита", "Количество");
	Return JsonDump(Map);

EndFunction

&AtServer
Function VanessaStepList(language)

	Var Result;
	TempFileName = GetTempFileName();
	DeleteFiles(TempFileName);
	CreateDirectory(TempFileName);

	BinaryData = FormAttributeToValue("Object").GetTemplate("VanessaStepList");
	ZipFileReader = New ZipFileReader(BinaryData.OpenStreamForRead());
	For each ZipFileEntry In ZipFileReader.Items Do
		If ZipFileEntry.BaseName = language Then
			ZipFileReader.Extract(ZipFileEntry, TempFileName, ZIPRestoreFilePathsMode.Restore);
			BinaryData = New BinaryData(TempFileName + "/" + ZipFileEntry.FullName);
			TextReader = New TextReader(BinaryData.OpenStreamForRead(), TextEncoding.UTF8);
			Result = TextReader.Read();
		EndIf;
	EndDo;
	DeleteFiles(TempFileName);

	Return Result;

EndFunction

&AtClient
Function GetCommands()

	CmdList = New Array;

	KeyMod = New Array;
	CmdList.Add(New Structure("eventId,keyCode,keyMod", "F5", "F5", KeyMod));

	KeyMod = New Array;
	KeyMod.Add("Alt");
	CmdList.Add(New Structure("eventId,keyCode,keyMod", "Alt+F5", "F5", KeyMod));

	KeyMod = New Array;
	KeyMod.Add("WinCtrl");
	CmdList.Add(New Structure("eventId,keyCode,keyMod", "Win+F5", "F5", KeyMod));

	KeyMod = New Array;
	KeyMod.Add("CtrlCmd");
	CmdList.Add(New Structure("eventId,keyCode,keyMod", "Ctrl+F5", "F5", KeyMod));

	KeyMod = New Array;
	KeyMod.Add("Shift");
	CmdList.Add(New Structure("eventId,keyCode,keyMod", "Shift+F5", "F5", KeyMod));

	KeyMod = New Array;
	KeyMod.Add("Shift");
	KeyMod.Add("CtrlCmd");
	CmdList.Add(New Structure("eventId,keyCode,keyMod", "Ctrl+Shift+F5", "F5", KeyMod));

	KeyMod = New Array;
	KeyMod.Add("Alt");
	KeyMod.Add("CtrlCmd");
	CmdList.Add(New Structure("eventId,keyCode,keyMod", "Ctrl+Alt+F5", "F5", KeyMod));

	KeyMod = New Array;
	KeyMod.Add("Alt");
	KeyMod.Add("Shift");
	KeyMod.Add("CtrlCmd");
	CmdList.Add(New Structure("eventId,keyCode,keyMod", "Ctrl+Alt+Shift+F5", "F5", KeyMod));

	KeyMod = New Array;
	CmdList.Add(New Structure("eventId,keyCode,keyMod", "F9", "F9", KeyMod));

	KeyMod = New Array;
	CmdList.Add(New Structure("eventId,keyCode,keyMod", "F11", "F11", KeyMod));

	Return JsonDump(CmdList);

EndFunction

&AtClient
Procedure FillEditorActions();
	
	TextJSON = VanessaEditor.getActions();
	JSONReader = New JSONReader;
	JSONReader.SetString(TextJSON);
	ActionArray = ReadJSON(JSONReader);
	For Each Action in ActionArray do
		FillPropertyValues(Actions.Add(), Action);
	EndDo;
	Actions.Sort("Id");
	
EndProcedure	


&AtClient
Procedure VanessaEditorDocumentComplete(Item)

	view = Items.VanessaEditor.Document.defaultView;
	VanessaGherkinProvider = view.VanessaGherkinProvider;
	VanessaGherkinProvider.setKeywords(GetKeywords());
	VanessaGherkinProvider.setElements(GetElements());
	VanessaGherkinProvider.setVariables(GetVariables());
	VanessaGherkinProvider.setStepList(VanessaStepList("ru"));
	VanessaEditor = view.createVanessaEditor("", "turbo-gherkin");
	VanessaEditor.addCommands(GetCommands());
	FillEditorActions();

EndProcedure

&AtClient
Procedure ActionsSelection(Item, SelectedRow, Field, StandardProcessing)
	
	Data = Items.Actions.CurrentData;
	If Data = Undefined Then Return; EndIf;
	VanessaEditor.editor.trigger("", Data.Id);
	
EndProcedure

#EndRegion

#EndRegion