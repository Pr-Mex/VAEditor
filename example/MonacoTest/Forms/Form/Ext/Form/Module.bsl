#Region FormEvents

&AtServer
Procedure OnCreateAtServer(Cancel, StandardProcessing)
	
	LoadMonaco();
	
EndProcedure

&AtClient
Procedure LoadFile(Command)
	
	Dialog = New FileDialog(FileDialogMode.Open);
	If Dialog.Choose() Then 
		TextReader = New TextReader(Dialog.FullFileName);
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
Procedure ScrollToLine(Command)
	
	SendAction("revealLine", "1");
	
EndProcedure

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