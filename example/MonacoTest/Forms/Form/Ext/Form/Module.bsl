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
	
	SendAction("revealLine", Item.CurrentData.Value);
	
EndProcedure

#EndRegion

#Region Breakpoints

&AtClient
Procedure UpdateBreakpoints(Json)
	
	BreakpointsPacket = JsonLoad(Json);
	
	Breakpoints.Clear();
	For Each BreakpointsPacketChunk In BreakpointsPacket Do
		Breakpoints.Add(BreakpointsPacketChunk.lineNumber,, BreakpointsPacketChunk.enable);
	EndDo;
	
	Breakpoints.SortByValue();
	
EndProcedure

&AtClient
Procedure DecorateBreakpoints()
	
	BreakpointsPacket = New Array;
	
	For Each Breakpoint In Breakpoints Do
		BreakpointsPacketChunk = New Structure;
		BreakpointsPacketChunk.Insert("lineNumber", Breakpoint.Value);
		BreakpointsPacketChunk.Insert("enable", Breakpoint.Check);
		BreakpointsPacket.Add(BreakpointsPacketChunk);
	EndDo;
	
	//RunApp("timeout 2",, True);
	
	SendAction("decorateBreakpoints", JsonDump(BreakpointsPacket));
	
EndProcedure

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