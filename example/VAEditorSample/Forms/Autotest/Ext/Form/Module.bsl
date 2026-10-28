&AtServer
Procedure OnCreateAtServer(Cancel, StandardProcessing)

	TempDirectory = GetTempFileName();
	DeleteFiles(TempDirectory);
	CreateDirectory(TempDirectory);

	DataObject = FormAttributeToValue("Object");
	ExtractTemplate(DataObject, TempDirectory, "VAEditor");
	ExtractTemplate(DataObject, TempDirectory, "AutoTest");
	VanessaEditorURL = TempDirectory + "/test.html?interface=" + PlatformInterfaceCode();

	DataDile = New File(DataObject.UsedFileName);
	CurrentPath = DataDile.Path;

EndProcedure

// Вариант интерфейса платформы: по нему редактор выбирает оформление (Такси или 8.5).
// Сравнение по XML-представлению перечисления: значение Version8_5 появилось только
// в 8.5, а обработка собирается платформой постарше, где такого имени ещё нет.
&AtServer
Function PlatformInterfaceCode()

	Result = "taxi";
	Try
		If XMLString(ClientApplication.CurrentInterfaceVariant()) = "Version8_5" Then
			Result = "85";
		EndIf;
	Except
		// Платформа не сообщает вариант интерфейса — остаётся оформление Такси.
	EndTry;
	Return Result;

EndFunction

&AtServer
Procedure ExtractTemplate(DataObject, Directory, TemplateName)

	BinaryData = DataObject.GetTemplate(TemplateName);
	ZipFileReader = New ZipFileReader(BinaryData.OpenStreamForRead());
	For each ZipFileEntry In ZipFileReader.Items Do
		ZipFileReader.Extract(ZipFileEntry, Directory, ZIPRestoreFilePathsMode.Restore);
	EndDo;

EndProcedure

&AtClient
Procedure VanessaEditorURLDocumentComplete(Item)

	AppveyorURL = Undefined;
	SysInfo = New SystemInfo;
	If LaunchParameter = "autotest" Then
		If SysInfo.PlatformType = PlatformType.Windows_x86_64
			Or SysInfo.PlatformType = PlatformType.Windows_x86 Then
			WScriptShell = New COMОбъект("WScript.Shell");
			AppveyorURL = WScriptShell.ExpandEnvironmentStrings("%APPVEYOR_API_URL%");
		EndIf;
	EndIf;

	Items.VanessaEditor.Document.defaultView.VanessaAutotest(AppveyorURL);

EndProcedure

&AtClient
Procedure VanessaEditorOnClick(Item, EventData, StandardProcessing)

	If LaunchParameter = "autotest" And EventData.Element.id = "AutotestResult" Then
		Result = Items.VanessaEditor.Document.defaultView.mochaResults;
		If Result.failures = 0 Then
			TextWriter = New TextWriter(CurrentPath + "success.txt");
			TextWriter.WriteLine(CurrentUniversalDateInMilliseconds());
			TextWriter.Close();
		EndIf;
		Exit(False);
	EndIf;

EndProcedure