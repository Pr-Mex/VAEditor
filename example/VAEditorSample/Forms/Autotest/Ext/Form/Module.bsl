&AtServer
Procedure OnCreateAtServer(Cancel, StandardProcessing)

	TempFileName = GetTempFileName();
	DeleteFiles(TempFileName);
	CreateDirectory(TempFileName);

	DataObject = FormAttributeToValue("Object");
	BinaryData = DataObject.GetTemplate("VAEditor");
	ZipFileReader = New ZipFileReader(BinaryData.OpenStreamForRead());
	For each ZipFileEntry In ZipFileReader.Items Do
		ZipFileReader.Extract(ZipFileEntry, TempFileName, ZIPRestoreFilePathsMode.Restore);
		BinaryData = New BinaryData(TempFileName + GetPathSeparator() + ZipFileEntry.FullName);
		VanessaEditorURL = GetInfoBaseURL() + "/" + PutToTempStorage(BinaryData, UUID);
	EndDo;
	DeleteFiles(TempFileName);

	DataDile = New File(DataObject.UsedFileName);
	CurrentPath = DataDile.Path;

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