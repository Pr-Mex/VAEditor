&AtServer
Procedure OnCreateAtServer(Cancel, StandardProcessing)

	TempFileName = GetTempFileName();
	DeleteFiles(TempFileName);
	CreateDirectory(TempFileName);

	BinaryData = FormAttributeToValue("Object").GetTemplate("VAEditor");
	ZipFileReader = New ZipFileReader(BinaryData.OpenStreamForRead());
	For each ZipFileEntry In ZipFileReader.Items Do
		ZipFileReader.Extract(ZipFileEntry, TempFileName, ZIPRestoreFilePathsMode.Restore);
		BinaryData = New BinaryData(TempFileName + GetPathSeparator() + ZipFileEntry.FullName);
		VanessaEditorURL = GetInfoBaseURL() + "/" + PutToTempStorage(BinaryData, UUID);
	EndDo;
	DeleteFiles(TempFileName);

EndProcedure

&AtClient
Procedure VanessaEditorURLDocumentComplete(Item)

	SysInfo = New SystemInfo;
	If SysInfo.PlatformType = PlatformType.Windows_x86_64
		Or SysInfo.PlatformType = PlatformType.Windows_x86 Then
		WScriptShell = New COMОбъект("WScript.Shell");
		URL = WScriptShell.ExpandEnvironmentStrings("%APPVEYOR_API_URL%");
	Else
		URL = Undefined;
	EndIf;

	Items.VanessaEditor.Document.defaultView.VanessaAutotest(URL);

EndProcedure
