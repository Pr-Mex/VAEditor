// Тестовый прогон автотестов без команды /Execute.
//
// Запуск: 1cv8 ENTERPRISE /F<база> /C "autotest;<путь к внешней обработке>"
//
// Зачем так: при открытии внешней обработки платформа показывает диалог
// "Защита от опасных действий", и неинтерактивный запуск (CI) висит на нём до
// таймаута. Здесь обработку открывает сама конфигурация, передавая описание
// защиты с выключенными предупреждениями. Глобальные настройки платформы
// (conf.cfg) при этом не меняются.
//
// Открытие формы внешней обработки доступно только в толстом клиенте,
// поэтому прогон запускается толстым клиентом, а не тонким.

&AtClient
Procedure BeforeStart(Cancel, StandardProcessing)
	
	If Not StrStartsWith(LaunchParameter, "autotest") Then
		Return;
	EndIf;
	
	// Главное окно ещё не создано, поэтому форму открываем следующим тактом.
	AttachIdleHandler("OpenAutotest", 1, True);
	
EndProcedure

// Обработчик ожидания вызывается по имени — процедура должна быть экспортируемой.
&AtClient
Procedure OpenAutotest() Export
	
	DetachIdleHandler("OpenAutotest");
	
	Path = AutotestProcessingPath();
	If Not ValueIsFilled(Path) Then
		ReportAutotestFailure("autotest: в параметре запуска не указан путь к внешней обработке");
		Return;
	EndIf;
	
	Try
		Form = AutotestForm(Path);
	Except
		// Иначе клиент просто висит без окон, а прогон ждёт таймаут.
		ReportAutotestFailure("autotest: не удалось открыть " + Path + " — " + ErrorDescription());
		Return;
	EndTry;
	
	If Form = Undefined Then
		ReportAutotestFailure("autotest: форма Autotest не получена из " + Path);
		Return;
	EndIf;
	
	Form.Open();
	
EndProcedure

// Форму берём прямо из файла: защита от опасных действий действует только до
// конца текущего метода, поэтому загрузка обработки попадает в отключённый
// интервал и диалог не показывается.
&AtServer
Function AutotestForm(Path)
	
	SetUnsafeActionProtectionDisabled(True);
	Form = ExternalDataProcessors.GetForm(Path, "Autotest");
	If Form <> Undefined Then
		Return Form;
	EndIf;
	
	Protection = New UnsafeOperationProtectionDescription;
	Protection.UnsafeOperationWarnings = False;
	
	Processing = ExternalDataProcessors.Create(Path, False, Protection);
	
	Return Processing.GetForm("Autotest");
	
EndFunction

&AtClient
Procedure ReportAutotestFailure(Reason)
	
	Path = AutotestProcessingPath();
	Report = New TextDocument;
	Report.SetText(Reason);
	Report.Write(Path + ".error.txt", "UTF-8");
	
EndProcedure

// Параметр запуска: "autotest;<путь>". Возвращает путь, если он указан.
&AtClient
Function AutotestProcessingPath()
	
	Position = StrFind(LaunchParameter, ";");
	If Position = 0 Then
		Return "";
	EndIf;
	
	Return Mid(LaunchParameter, Position + 1);
	
EndFunction
