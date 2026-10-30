&AtServerNoContext
Function AttachProcessor(Val FilePath)

	File = New File(FilePath);
	If Not File.Exist() Then
		Raise "Файл внешней обработки не найден: " + FilePath;
	EndIf;

	// Загрузка внешнего кода обычно вызывает диалог «Разрешить открывать данный
	// файл?»: код загружает само приложение, а не пользователь, поэтому платформа
	// спрашивает подтверждение на уровне сеанса и conf.cfg его не снимает.
	// Описание защиты с выключенным предупреждением решает вопрос: код считается
	// разрешённым в текущем сеансе.
	Protection = New UnsafeOperationProtectionDescription;
	Protection.UnsafeOperationWarnings = False;

	// Второй параметр: безопасный режим. По умолчанию True, но обработке нужны
	// файловые операции (распаковка макетов), поэтому False.
	// BSLLS:UsingExternalCodeTools-off
	Processor = ExternalDataProcessors.Create(FilePath, False, Protection);

	Return Processor.GetForm();

EndFunction

&AtClient
Procedure OnOpen(Cancel)

	// Прослойка нужна только чтобы загрузить обработку: дальше работа идёт в её
	// собственной форме, поэтому себя закрываем.
	Cancel = True;
	OpenForm(AttachProcessor(ПараметрЗапуска));

EndProcedure
