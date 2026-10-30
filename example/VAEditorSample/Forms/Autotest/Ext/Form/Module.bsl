&AtServer
Procedure OnCreateAtServer(Cancel, StandardProcessing)

	// Параметр запуска доступен только в клиентском контексте: на сервере
	// обращение к нему — ошибка "Переменная не определена (ПараметрЗапуска)".
	// Поэтому здесь всегда готовятся макеты, а страница автотестов
	// распаковывается на клиенте (см. LoadTestPage).
	DataObject = FormAttributeToValue("Object");
	EditorTemplateURL = PutToTempStorage(DataObject.GetTemplate("VAEditor"));
	AutoTestTemplateURL = PutToTempStorage(DataObject.GetTemplate("AutoTest"));

	DataDile = New File(DataObject.UsedFileName);
	CurrentPath = DataDile.Path;

EndProcedure

&AtClient
Procedure OnOpen(Cancel)

	If StrStartsWith(ПараметрЗапуска, "probeenv") Then
		PrepareProbeEnv();
		Return;
	EndIf;

	// Параметр запуска — путь к файлу обработки, поэтому режим определяется не
	// по префиксу "autotest", а по самому факту автозапуска: форма открыта
	// приложением, значит это прогон автотестов.
	WriteMarker("client-started.txt");

	LoadTestPage();

EndProcedure

&AtClient
Procedure WriteMarker(FileName)

	// Метка для CI: по ней видно, дошёл ли клиент до формы и загрузилась ли
	// страница, когда автотест не прислал результат.
	TextWriter = New TextWriter(CurrentPath + FileName, TextEncoding.UTF8);
	TextWriter.WriteLine(CurrentUniversalDateInMilliseconds());
	TextWriter.Close();

EndProcedure

&AtClient
Procedure LoadTestPage()

	// Распаковка на клиенте: каталог, распакованный на сервере, клиентскому
	// браузеру недоступен, а работа с файлами на сервере может быть запрещена.
	Directory = ExtractTemplates(GetFromTempStorage(EditorTemplateURL));
	ExtractTemplates(GetFromTempStorage(AutoTestTemplateURL), Directory);
	VanessaEditorURL = Directory + "/test.html";

EndProcedure

&AtClient
Function ExtractTemplates(BinaryData, Directory = "")

	If IsBlankString(Directory) Then
		Directory = GetTempFileName();
		DeleteFiles(Directory);
		CreateDirectory(Directory);
	EndIf;

	ZipFileReader = New ZipFileReader(BinaryData.OpenStreamForRead());
	For Each ZipFileEntry In ZipFileReader.Items Do
		ZipFileReader.Extract(ZipFileEntry, Directory, ZIPRestoreFilePathsMode.Restore);
	EndDo;

	Return Directory;

EndFunction

&AtServer
Procedure PrepareProbeEnv()

	// Натурный эксперимент: что умеет встроенный WebKit платформы.
	// Нужен для решения по src/worker-source.ts: можно ли заменить
	// устаревшую связку escape/decodeURIComponent на TextDecoder
	// при разборе base64-строк с исходниками воркеров.
	ProbeDirectory = GetTempFileName();
	DeleteFiles(ProbeDirectory);
	CreateDirectory(ProbeDirectory);

	Lines = New Array;
	Lines.Add("<!DOCTYPE html><html><head><meta charset=""utf-8""></head><body>");
	Lines.Add("<pre id=""out""></pre><script>");
	Lines.Add("var lines = [];");
	Lines.Add("function log(s) { lines.push(s); document.getElementById('out').textContent = lines.join('\n'); window.VAProbe = lines.join('\n'); }");
	Lines.Add("log('userAgent: ' + navigator.userAgent);");
	Lines.Add("log('TextDecoder: ' + typeof TextDecoder);");
	Lines.Add("log('Uint8Array: ' + typeof Uint8Array);");
	Lines.Add("log('escape: ' + typeof escape);");
	Lines.Add("log('atob: ' + typeof atob);");
	Lines.Add("log('Blob: ' + typeof Blob);");
	Lines.Add("log('Worker: ' + typeof Worker);");
	Lines.Add("log('URL.createObjectURL: ' + (typeof URL === 'undefined' ? 'нет URL' : typeof URL.createObjectURL));");
	Lines.Add("var sample = 'Привет, мир';");
	Lines.Add("var binary = unescape(encodeURIComponent(sample));");
	Lines.Add("try {");
	Lines.Add("  var oldWay = decodeURIComponent(escape(binary));");
	Lines.Add("  log('escape/decodeURIComponent: ' + (oldWay === sample ? 'совпало' : 'РАСХОЖДЕНИЕ: ' + oldWay));");
	Lines.Add("} catch (e) { log('escape/decodeURIComponent: исключение ' + e); }");
	Lines.Add("if (typeof TextDecoder === 'undefined') {");
	Lines.Add("  log('TextDecoder: недоступен');");
	Lines.Add("} else {");
	Lines.Add("  try {");
	Lines.Add("    var bytes = new Uint8Array(binary.length);");
	Lines.Add("    for (var i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }");
	Lines.Add("    var newWay = new TextDecoder('utf-8').decode(bytes);");
	Lines.Add("    log('TextDecoder(utf-8): ' + (newWay === sample ? 'совпало' : 'РАСХОЖДЕНИЕ: ' + newWay));");
	Lines.Add("  } catch (e) { log('TextDecoder: исключение ' + e); }");
	Lines.Add("}");
	Lines.Add("setTimeout(function () {");
	Lines.Add("  log('--- проба завершена ---');");
	Lines.Add("  var b = document.createElement('button');");
	Lines.Add("  b.id = 'AutotestResult';");
	Lines.Add("  document.body.appendChild(b);");
	Lines.Add("  b.click();");
	Lines.Add("}, 500);");
	Lines.Add("</script></body></html>");

	TextWriter = New TextWriter(ProbeDirectory + "/probe-env.html", TextEncoding.UTF8);
	TextWriter.Write(StrConcat(Lines, Chars.LF));
	TextWriter.Close();

	VanessaEditorURL = ProbeDirectory + "/probe-env.html";

EndProcedure

&AtClient
Procedure VanessaEditorURLDocumentComplete(Item)

	If StrStartsWith(ПараметрЗапуска, "probeenv") Then
		// Страница пробы сама сигналит о конце: тестовый раннер здесь не нужен.
		Return;
	EndIf;

	// Параметр запуска — путь к файлу обработки, поэтому режим определяется не
	// по префиксу "autotest", а по факту автозапуска: любой запуск, кроме
	// отладочной пробы probeenv, считается прогоном автотестов.
	If Not StrStartsWith(ПараметрЗапуска, "probeenv") Then
		WriteMarker("page-loaded.txt");
	EndIf;

	// Внешний API для результатов (раньше — AppVeyor) не используется: страница
	// сама сообщает о конце прогона кликом по AutotestResult.
	Items.VanessaEditor.Document.defaultView.VanessaAutotest();

EndProcedure

&AtClient
Procedure VanessaEditorOnClick(Item, EventData, StandardProcessing)

	If StrStartsWith(ПараметрЗапуска, "probeenv") And EventData.Element.id = "AutotestResult" Then
		TextWriter = New TextWriter(CurrentPath + "env-probe.txt", TextEncoding.UTF8);
		TextWriter.Write(Items.VanessaEditor.Document.defaultView.VAProbe);
		TextWriter.Close();
		// Скрипт проверки ждёт success.txt, иначе тянет полный таймаут.
		TextWriter = New TextWriter(CurrentPath + "success.txt");
		TextWriter.WriteLine(CurrentUniversalDateInMilliseconds());
		TextWriter.Close();
		Exit(False);
	EndIf;

	If Not StrStartsWith(ПараметрЗапуска, "probeenv") And EventData.Element.id = "AutotestResult" Then
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