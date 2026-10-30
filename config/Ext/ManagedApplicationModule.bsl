&AtClient
Procedure OnStart()

	// Параметр запуска: путь к файлу внешней обработки. Пустой параметр означает
	// обычный интерактивный запуск, ничего не открываем.
	If IsBlankString(ПараметрЗапуска) Then
		Return;
	EndIf;

	LaunchForm = TestForm(ПараметрЗапуска);
	If LaunchForm <> Undefined Then
		OpenForm(LaunchForm);
	EndIf;

EndProcedure

&AtServer
Function TestForm(Val FilePath)

	// Загрузка внешнего кода обычно вызывает диалог «Разрешить открывать данный
	// файл?». Здесь код загружает само приложение, а не пользователь, поэтому
	// платформа спрашивает подтверждение на уровне сеанса и conf.cfg его не
	// снимает. Описание защиты с выключенным предупреждением решает вопрос:
	// код считается разрешённым в текущем сеансе.
	Protection = New UnsafeOperationProtectionDescription;
	Protection.UnsafeOperationWarnings = False;

	// Второй параметр: безопасный режим. По умолчанию True, но обработке нужны
	// файловые операции (распаковка макетов), поэтому False.
	Processor = ExternalDataProcessors.Create(FilePath, False, Protection);

	// Имя формы не задаём: берётся основная форма обработки (Initialize), она
	// сама решает, что открыть дальше.
	Return Processor.GetForm();

EndFunction
