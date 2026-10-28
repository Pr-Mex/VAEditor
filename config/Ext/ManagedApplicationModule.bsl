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
	ConnectWaitHandler("OpenAutotest", 1, True);
	
EndProcedure

&AtClient
Procedure OpenAutotest()
	
	DisconnectWaitHandler("OpenAutotest");
	
	Path = AutotestProcessingPath();
	If Not ValueIsFilled(Path) Then
		Message("autotest: в параметре запуска не указан путь к внешней обработке");
		Return;
	EndIf;
	
	OpenAutotestProcessing(Path);
	
EndProcedure

&AtClient
Procedure OpenAutotestProcessing(Path)
	
	Protection = New UnsafeOperationProtectionDescription;
	Protection.UnsafeOperationWarnings = False;
	
	Processing = ExternalDataProcessors.Create(Path, False, Protection);
	Processing.GetForm("Autotest").Open();
	
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
