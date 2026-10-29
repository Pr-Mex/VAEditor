&AtServer
Procedure OnCreateAtServer(Cancel, StandardProcessing)

	// Параметр запуска доступен только в клиентском контексте: на сервере
	// обращение к нему — ошибка "Переменная не определена (ПараметрЗапуска)".
	// Поэтому здесь всегда готовится страница автотестов, а режим пробы
	// временного хранилища включается в OnOpen (см. ниже).
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

&AtClient
Procedure OnOpen(Cancel)

	If StrStartsWith(ПараметрЗапуска, "probestorage") Then
		PrepareProbeStorage();
	EndIf;

EndProcedure

&AtServer
Procedure PrepareProbeStorage()

	// Натурный эксперимент: страница сама пробует достучаться до скрипта
	// во временном хранилище. Макеты редактора для этого не нужны.
	ProbeDirectory = GetTempFileName();
	DeleteFiles(ProbeDirectory);
	CreateDirectory(ProbeDirectory);
	PrepareProbePage(ProbeDirectory);
	VanessaEditorURL = ProbeDirectory + "/probe.html";

EndProcedure

&AtServer
Procedure ExtractTemplate(DataObject, Directory, TemplateName)

	BinaryData = DataObject.GetTemplate(TemplateName);
	ZipFileReader = New ZipFileReader(BinaryData.OpenStreamForRead());
	For each ZipFileEntry In ZipFileReader.Items Do
		ZipFileReader.Extract(ZipFileEntry, Directory, ZIPRestoreFilePathsMode.Restore);
	EndDo;

EndProcedure

&AtServer
Procedure PrepareProbePage(TempDirectory)

	// Эксперимент: доступны ли данные временного хранилища из WebView.
	// Один и тот же скрипт кладём файлом (контроль) и во временное хранилище,
	// а страница пробует достать его Worker'ом, fetch, XHR и <script src>.
	ScriptFile = TempDirectory + "/storage-probe.js";
	TextWriter = New TextWriter(ScriptFile, TextEncoding.UTF8);
	TextWriter.Write("self.postMessage('storage-ok');");
	TextWriter.Close();

	StorageAddress = PutToTempStorage(New BinaryData(ScriptFile));
	FileUrl = "file:///" + StrReplace(ScriptFile, "\", "/");

	Lines = New Array;
	Lines.Add("<!DOCTYPE html><html><head><meta charset=""utf-8""></head><body>");
	Lines.Add("<pre id=""out""></pre><script>");
	Lines.Add("var lines = [];");
	Lines.Add("function log(s) { lines.push(s); document.getElementById('out').textContent = lines.join('\n'); window.VAProbe = lines.join('\n'); }");
	Lines.Add("var STORAGE = '" + StrReplace(StorageAddress, "'", "\'") + "';");
	Lines.Add("var FILEURL = '" + FileUrl + "';");
	Lines.Add("log('адрес временного хранилища: ' + STORAGE);");
	Lines.Add("function probeWorker(label, url) {");
	Lines.Add("  try {");
	Lines.Add("    var w = new Worker(url);");
	Lines.Add("    w.onmessage = function (e) { log(label + ': ответ ' + e.data); };");
	Lines.Add("    w.onerror = function (e) { log(label + ': ошибка ' + ((e && e.message) || 'без текста')); };");
	Lines.Add("    w.postMessage('ping');");
	Lines.Add("  } catch (e) { log(label + ': исключение ' + e); }");
	Lines.Add("}");
	Lines.Add("function probeFetch(label, url) {");
	Lines.Add("  try {");
	Lines.Add("    fetch(url).then(function (r) { log(label + ': статус ' + r.status); })");
	Lines.Add("      .catch(function (e) { log(label + ': отказ ' + e); });");
	Lines.Add("  } catch (e) { log(label + ': исключение ' + e); }");
	Lines.Add("}");
	Lines.Add("function probeScript(label, url) {");
	Lines.Add("  var s = document.createElement('script');");
	Lines.Add("  s.src = url;");
	Lines.Add("  s.onload = function () { log(label + ': загружен'); };");
	Lines.Add("  s.onerror = function () { log(label + ': не загружен'); };");
	Lines.Add("  document.body.appendChild(s);");
	Lines.Add("}");
	Lines.Add("probeWorker('worker, хранилище', STORAGE);");
	Lines.Add("probeWorker('worker, файл', FILEURL);");
	Lines.Add("probeFetch('fetch, хранилище', STORAGE);");
	Lines.Add("probeFetch('fetch, файл', FILEURL);");
	Lines.Add("probeScript('script, хранилище', STORAGE);");
	Lines.Add("probeScript('script, файл', FILEURL);");
	Lines.Add("setTimeout(function () {");
	Lines.Add("  log('--- проба завершена ---');");
	Lines.Add("  var b = document.createElement('button');");
	Lines.Add("  b.id = 'AutotestResult';");
	Lines.Add("  document.body.appendChild(b);");
	Lines.Add("  b.click();");
	Lines.Add("}, 3000);");
	Lines.Add("</script></body></html>");

	TextWriter = New TextWriter(TempDirectory + "/probe.html", TextEncoding.UTF8);
	TextWriter.Write(StrConcat(Lines, Chars.LF));
	TextWriter.Close();

EndProcedure

&AtClient
Procedure VanessaEditorURLDocumentComplete(Item)

	AppveyorURL = Undefined;
	SysInfo = New SystemInfo;
	If StrStartsWith(ПараметрЗапуска, "autotest") Then
		If SysInfo.PlatformType = PlatformType.Windows_x86_64
			Or SysInfo.PlatformType = PlatformType.Windows_x86 Then
			WScriptShell = New COMОбъект("WScript.Shell");
			AppveyorURL = WScriptShell.ExpandEnvironmentStrings("%APPVEYOR_API_URL%");
		EndIf;
	EndIf;

	If StrStartsWith(ПараметрЗапуска, "probestorage") Then
		// Страница пробы сама сигналит о конце: тестовый раннер здесь не нужен.
		Return;
	EndIf;

	Items.VanessaEditor.Document.defaultView.VanessaAutotest(AppveyorURL);

EndProcedure

&AtClient
Procedure VanessaEditorOnClick(Item, EventData, StandardProcessing)

	If StrStartsWith(ПараметрЗапуска, "probestorage") And EventData.Element.id = "AutotestResult" Then
		TextWriter = New TextWriter(CurrentPath + "storage-probe.txt", TextEncoding.UTF8);
		TextWriter.Write(Items.VanessaEditor.Document.defaultView.VAProbe);
		TextWriter.Close();
		// Скрипт проверки ждёт success.txt, иначе тянет полный таймаут.
		TextWriter = New TextWriter(CurrentPath + "success.txt");
		TextWriter.WriteLine(CurrentUniversalDateInMilliseconds());
		TextWriter.Close();
		Exit(False);
	EndIf;

	If StrStartsWith(ПараметрЗапуска, "autotest") And EventData.Element.id = "AutotestResult" Then
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