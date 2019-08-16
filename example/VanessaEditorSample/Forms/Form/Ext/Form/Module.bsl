#Region FormEvents

&AtServer
Procedure OnCreateAtServer(Cancel, StandardProcessing)

	VanessaEditorLoad();

EndProcedure

&AtClient
Procedure LoadFile(Command)

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

#EndRegion

#EndRegion