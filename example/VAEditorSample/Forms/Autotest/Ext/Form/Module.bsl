&AtServer
Procedure OnCreateAtServer(Cancel, StandardProcessing)

	TempDirectory = GetTempFileName();
	DeleteFiles(TempDirectory);
	CreateDirectory(TempDirectory);

	DataObject = FormAttributeToValue("Object");
	ExtractTemplate(DataObject, TempDirectory, "VAEditor");
	ExtractTemplate(DataObject, TempDirectory, "AutoTest");
	VanessaEditorURL = TempDirectory + "/test.html";

	DataDile = New File(DataObject.UsedFileName);
	CurrentPath = DataDile.Path;

EndProcedure

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
	If StrStartsWith(LaunchParameter, "autotest") Then
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

	If StrStartsWith(LaunchParameter, "autotest") And EventData.Element.id = "AutotestResult" Then
		Result = Items.VanessaEditor.Document.defaultView.mochaResults;
		// Отчёт пишем всегда: без него не понять, упали тесты или клик не дошёл.
		TextWriter = New TextWriter(CurrentPath + "autotest-result.txt");
		TextWriter.WriteLine("passes=" + Result.passes + " failures=" + Result.failures);
		TextWriter.WriteLine(Items.VanessaEditor.Document.defaultView.mochaFailures);
		TextWriter.Close();
		If Result.failures = 0 Then
			TextWriter = New TextWriter(CurrentPath + "success.txt");
			TextWriter.WriteLine(CurrentUniversalDateInMilliseconds());
			TextWriter.Close();
		EndIf;
		Exit(False);
	EndIf;

EndProcedure