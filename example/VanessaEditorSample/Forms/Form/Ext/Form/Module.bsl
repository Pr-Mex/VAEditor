#Region FormEvents

&AtServer
Procedure OnCreateAtServer(Cancel, StandardProcessing)

	VanessaEditorLoad();
	EditorTheme = "vs";

EndProcedure

&AtClient
Procedure LoadFile(Command)

	Breakpoints.Clear();
	Problems.Clear();
	VanessaEditorSendAction("decorateBreakpoints", JsonDump(New Array));
	VanessaEditorSendAction("decorateProblems", JsonDump(New Array));

	Dialog = New FileDialog(FileDialogMode.Open);
	If Dialog.Choose() Then
		TextReader = New TextReader(Dialog.FullFileName, TextEncoding.UTF8);
		Text = TextReader.Read();

		VanessaEditorSendAction("setContent", Text);
	EndIf;

EndProcedure

&AtClient
Procedure GetValue(Command)

	UserMessage = New UserMessage;
	UserMessage.Text = VanessaEditorSendAction("getContent");
	UserMessage.Message();

EndProcedure

&AtClient
Procedure ReadOnlyModeOnChange(Item)

	If ReadOnlyMode Then
		VanessaEditorSendAction("disableEdit");
	Else
		VanessaEditorSendAction("enableEdit");
	EndIf;

EndProcedure

&AtClient
Procedure EditorThemeOnChange(Item)

	VanessaEditorSendAction("setTheme", EditorTheme);
	VanessaEditorSendAction("setTheme", EditorTheme);

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

	VanessaEditorSendAction("revealLine", Item.CurrentData.Value);

EndProcedure

&AtClient
Procedure UpdateBreakpoints(Json)

	BreakpointsPacket = JsonLoad(Json);

	Breakpoints.Clear();
	For Each Chunk In BreakpointsPacket Do
		Breakpoints.Add(Chunk.lineNumber,, Chunk.enable);
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

	VanessaEditorSendAction("decorateBreakpoints", JsonDump(BreakpointsPacket));

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

	VanessaEditorSendAction("decorateProblems", JsonDump(ProblemsPacket));

EndProcedure

#EndRegion

#Region RuntimeProcess

&AtClient
Procedure SendCurrentStep(Command)

	VanessaEditorSendAction("decorateCurrentStep", CurrentStep);

EndProcedure

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

&AtClient
Procedure CleanRuntimeProgress(Command)

	VanessaEditorSendAction("cleanDecorateRuntimeProgress");

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

	RunApp("timeout " + Delay,, True);

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
	WordList = StrSplit(TextJSON, "
	|", False);
	JSONWriter = New JSONWriter;
	JSONWriter.SetString();
	WriteJSON(JSONWriter, WordList);
	return JSONWriter.Close();

EndFunction

&AtClient
Procedure VanessaEditorDocumentComplete(Item)

	view = Items.VanessaEditor.Document.defaultView;
	view.VanessaGherkinManager.setKeywords(GetKeywords());
	view.VanessaGherkinManager.setStepList(VanessaStepList());
	view.createVanessaEditor("", "turbo-gherkin");

EndProcedure

&AtServer
Function VanessaStepList()

	Stream = FormAttributeToValue("Object").GetTemplate("VanessaStepList").OpenStreamForRead();
	TextReader = New TextReader(Stream, TextEncoding.UTF8);
	Result = TextReader.Read();
	Stream.Close();

	Return Result;

EndFunction

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

#EndRegion

#EndRegion