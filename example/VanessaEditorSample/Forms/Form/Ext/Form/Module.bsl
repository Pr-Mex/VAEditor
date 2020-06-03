&AtClient
Var VanessaEditor, VanessaGherkinProvider;

#Region FormEvents

&AtServer
Procedure OnCreateAtServer(Cancel, StandardProcessing)

	VanessaEditorLoad();
	EditorTheme = "vs";
	LineNumber = 1;
	Column = 1;

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
Procedure EditUndo(Command)
	VanessaEditor.undo();
EndProcedure

&AtClient
Procedure EditRedo(Command)
	VanessaEditor.redo();
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
		VanessaEditor.toggleBreakpoint();
		UserMessage = New UserMessage;
		UserMessage.Text = Event + " : " + Arg;
		UserMessage.Message();
	Else
		UserMessage = New UserMessage;
		UserMessage.Text = Event + " : " + Arg;
		UserMessage.Message();
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
Procedure VanessaEditorDocumentComplete(Item)

	view = Items.VanessaEditor.Document.defaultView;
	VanessaGherkinProvider = view.VanessaGherkinProvider;
	VanessaGherkinProvider.setKeywords(GetKeywords());
	VanessaGherkinProvider.setElements(GetElements());
	VanessaGherkinProvider.setVariables(GetVariables());
	VanessaGherkinProvider.setStepList(VanessaStepList("ru"));
	VanessaEditor = view.createVanessaEditor("", "turbo-gherkin");
	VanessaEditor.addCommands(GetCommands());

EndProcedure

#EndRegion

#EndRegion