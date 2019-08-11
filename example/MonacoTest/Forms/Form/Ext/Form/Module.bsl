#Region FormEvents

&AtServer
Procedure OnCreateAtServer(Cancel, StandardProcessing)
	
	LoadMonaco();
	
EndProcedure

&AtClient
Procedure LoadFile(Command)
	
	Dialog = New FileDialog(FileDialogMode.Open);
	If Dialog.Choose() Then 
		TextReader = New TextReader(Dialog.FullFileName, TextEncoding.UTF8);
		Text = TextReader.Read();
		
		SendAction("setValue", Text);
	EndIf;
	
EndProcedure

&AtClient
Procedure GetValue(Command)
	
	UserMessage = New UserMessage;
	UserMessage.Text = SendAction("getValue");
	UserMessage.Message();
	
EndProcedure

&AtClient
Procedure ReadOnlyModeOnChange(Item)
	
	If ReadOnlyMode Then
		SendAction("disableEdit");
	Else 
		SendAction("enableEdit");
	EndIf;
	
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
	
	UpdateBreakpoints();
	
EndProcedure

&AtClient
Procedure BreakpointsOnActivateRow(Item)
	
	If Item.CurrentData = Undefined Then
		Return;
	EndIf;
	
	SendAction("revealLine", Item.CurrentData.Value);
	
EndProcedure

#EndRegion

#Region FormEvents

&AtServer
Procedure ToggleBreakpoint(LineNumber)
	
	TypeDescription = New TypeDescription("Number");
	Number = TypeDescription.AdjustValue(LineNumber);
	
	If Number = 0 Then 
		Return;
	EndIf;
	
	Item = Breakpoints.FindByValue(Number);
	If Item = Undefined Then
		Breakpoints.Add(LineNumber,, True);
	Else 
		Breakpoints.Delete(Item);
	EndIf;
	Breakpoints.SortByValue();
	
EndProcedure

&AtClient
Procedure UpdateBreakpoints()
	
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

#EndRegion

#Region MonacoInteractions

#Region Public

&AtClient
Function SendAction(Action, Arg = Undefined)
	
	Return Items.Monaco.Document.defaultView.OnReceiveAction(Action, Arg);
	
EndFunction

&AtClient
Procedure OnReceiveAction(Event, Arg)
	
	If Event = "CONTENT_DID_CHANGE" Then
		ContentDidChange = True;
	ElsIf Event = "TOGGLE_BREAKPOINT" Then
		ToggleBreakpoint(Arg);
		UpdateBreakpoints();
	Else
		UserMessage = New UserMessage;
		UserMessage.Text = Event + " : " + Arg;
		UserMessage.Message();
	EndIf;
	
EndProcedure

#EndRegion

#Region Private

&AtServer
Procedure LoadMonaco()
	
	Monaco = GetInfoBaseURL() + "/" + PutToTempStorage(
		FormAttributeToValue("Object").GetTemplate("Monaco"), UUID);
	
EndProcedure

&AtClient
Procedure MonacoOnClick(Item, EventData, StandardProcessing)
	
	Element = EventData.Element;
	If Element.id = "interaction" Then
		OnReceiveAction(Element.title, Element.value);
	EndIf;
	
EndProcedure

#EndRegion

#EndRegion