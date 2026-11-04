&НаКлиенте
Перем KeyCodeMap;

#Region FormEvents

&НаСервере
Процедура OnCreateAtServer(Cancel, StandardProcessing)

	// Макеты отдаём на клиент адресами во временном хранилище: распаковка идёт
	// на клиенте (см. ЗагрузитьРедактор). В клиент-серверном варианте каталог,
	// распакованный на сервере, клиентскому браузеру недоступен, а работа
	// с файлами на сервере может быть запрещена настройками.
	DataObject = FormAttributeToValue("Object");
	EditorTemplateURL = PutToTempStorage(DataObject.GetTemplate("VAEditor"));
	StepListTemplateURL = PutToTempStorage(DataObject.GetTemplate("StepList"));
	KeywordsTemplateURL = PutToTempStorage(DataObject.GetTemplate("Keywords"));

	ErrorCode = Новый UUID;
	ErrorText = "Информация об ошибке выполнения";
	MessageText = "Привет, мир!";
	RuntimeStatus = "complete";
	EditorTheme = "vs";
	// Демо открывается во вкладках: это основной режим редактора, отдельное
	// окно включается переключателем «Тип редактора».
	EditorType = 3;
	ShowMinimap = Истина;
	LineNumber = 1;
	TabSize = 4;
	Column = 1;

КонецПроцедуры

&НаКлиенте
Процедура OnOpen(Cancel)
	KeyCodeMap = GetKeyCodeMap();
	ЗагрузитьРедактор();
КонецПроцедуры

&НаКлиенте
Процедура ЗагрузитьФайл(Command)

	Breakpoints.Clear();
	Problems.Clear();
	VanessaEditor().decorateBreakpoints(JsonDump(Новый Array));
	VanessaEditor().decorateProblems(JsonDump(Новый Array));

	Dialog = Новый FileDialog(FileDialogMode.Open);
	Если Dialog.Choose() Тогда
		TextReader = Новый TextReader(Dialog.FullFileName, TextEncoding.UTF8);
		Text = TextReader.Read();
		VanessaEditor().setContent(Text);
	КонецЕсли;

КонецПроцедуры

&НаКлиенте
Процедура ПолучитьТекст(Command)

	UserMessage = Новый UserMessage;
	UserMessage.Text = VanessaEditor().getContent();
	UserMessage.Message();

КонецПроцедуры

&НаКлиенте
Процедура ТолькоЧтениеПриИзменении(Item)

	НастройкиРедактора().setReadOnly(ReadOnlyMode);

КонецПроцедуры

&НаКлиенте
Процедура ТемаРедактораПриИзменении(Item)

	// Тема хранится в StyleManager и общая для страницы, поэтому в режиме
	// вкладок её принимает VanessaTabs: отдельного VanessaEditor там нет.
	Представление = DefaultView();
	Если Представление.VanessaEditor = Неопределено Тогда
		Представление.VanessaTabs.theme = EditorTheme;
	Иначе
		Представление.VanessaEditor.setTheme(EditorTheme);
	КонецЕсли;

КонецПроцедуры

&НаКлиенте
Процедура ПозицияПриИзменении(Item)

	VanessaEditor().setPosition(LineNumber, Column);
	VanessaEditor().revealLine(LineNumber);

КонецПроцедуры

&НаКлиенте
Процедура ПолучитьПозицию(Command)

	Arg = VanessaEditor().getPosition();
	UserMessage = Новый UserMessage;
	UserMessage.Text = "Позиция: "
		+ "lineNumber = " + Format(Arg.lineNumber, "NG=") + ","
		+ "codeWidget = " + Format(Arg.codeWidget, "NG=") + ","
		+ "column = " + Format(Arg.column, "NG=");
	UserMessage.Message();

КонецПроцедуры

&НаКлиенте
Процедура ПолучитьСтроку(Command)

	UserMessage = Новый UserMessage;
	UserMessage.Text = VanessaEditor().getLineContent(lineNumber);
	UserMessage.Message();

КонецПроцедуры

&НаКлиенте
Процедура ПолучитьВыделенныйТекст(Command)

	UserMessage = Новый UserMessage;
	UserMessage.Text = VanessaEditor().getSelectedContent();
	UserMessage.Message();

КонецПроцедуры

&НаКлиенте
Процедура ПолучитьТекущийШаг(Command)

	UserMessage = Новый UserMessage;
	UserMessage.Text = "Текущий шаг: " + VanessaEditor().getRuntimeProgress("current");
	UserMessage.Message();

КонецПроцедуры

&НаКлиенте
Процедура ПолучитьПрогресс(Command)

	UserMessage = Новый UserMessage;
	UserMessage.Text = "Шаги " + RuntimeStatus + ": " + VanessaEditor().getRuntimeProgress(RuntimeStatus);
	UserMessage.Message();

КонецПроцедуры

&НаКлиенте
Процедура ВставитьТекст(Command)
	VanessaEditor().insertText(MessageText);
КонецПроцедуры

&НаКлиенте
Процедура ЗаменитьТекст(Command)

	Map = Новый Map;
	Map.Insert("startLineNumber", LineNumber);
	Map.Insert("startColumn", 1);
	Map.Insert("endLineNumber", LineNumber);
	Map.Insert("endColumn", Column);
	VanessaEditor().insertText(MessageText, JsonDump(Map));

КонецПроцедуры

&НаКлиенте
Процедура ПоказатьОшибку(Command)

	VanessaEditor().setRuntimeProgress("error", CurrentStep);
	VanessaEditor().showRuntimeError(CurrentStep, 0, ErrorCode, ErrorText);

КонецПроцедуры

&НаКлиенте
Процедура ДействияВыбор(Item, SelectedRow, Field, StandardProcessing)

	Data = Items.Actions.CurrentData;
	Если Data = Неопределено Тогда Возврат; КонецЕсли;
	VanessaEditor().editor.trigger("", Data.Id);

КонецПроцедуры

#EndRegion

#Region FormActiond

&НаКлиенте
Процедура ДействиеРедактора(Command)

	Map = Новый Map;
	Map.Insert("ClipboardCut", "editor.action.clipboardCutAction");
	Map.Insert("ClipboardCopy", "editor.action.clipboardCopyAction");
	Map.Insert("ClipboardPaste", "editor.action.clipboardPasteAction");
	Map.Insert("EditFind", "actions.find");
	Map.Insert("EditFindNext", "editor.action.nextMatchFindAction");
	Map.Insert("EditFindPrevious", "editor.action.previousMatchFindAction");
	Map.Insert("EditUndo", "undo");
	Map.Insert("EditRedo", "redo");
	Map.Insert("EditReplace", "editor.action.startFindReplaceAction");
	Map.Insert("ViewFoldAll", "editor.foldAll");
	Map.Insert("ViewUnfold1", "editor.foldLevel1");
	Map.Insert("ViewUnfold2", "editor.foldLevel2");
	Map.Insert("ViewUnfold3", "editor.foldLevel3");
	Map.Insert("ViewUnfold4", "editor.foldLevel4");
	Map.Insert("ViewUnfold5", "editor.foldLevel5");
	Map.Insert("ViewUnfold6", "editor.foldLevel6");
	Map.Insert("ViewUnfold7", "editor.foldLevel7");
	Map.Insert("ViewUnfoldAll", "editor.unfoldAll");
	Map.Insert("ViewZoomIn", "editor.action.fontZoomIn");
	Map.Insert("ViewZoomOut", "editor.action.fontZoomOut");
	Map.Insert("ViewZoomReset", "editor.action.fontZoomReset");
	VanessaEditor().editor.trigger("", Map[Command.Name]);

КонецПроцедуры

&НаКлиенте
Процедура ЗагрузитьШагиВсе(Command)

	GherkinProvider().setStepList(VanessaStepList("en"), Истина);
	GherkinProvider().setStepList(VanessaStepList("ru"), Ложь);

КонецПроцедуры

&НаКлиенте
Процедура ЗагрузитьШагиАнгл(Command)

	GherkinProvider().setStepList(VanessaStepList("en"), Истина);

КонецПроцедуры

&НаКлиенте
Процедура ЗагрузитьШагиРус(Command)

	GherkinProvider().setStepList(VanessaStepList("ru"), Истина);

КонецПроцедуры

&НаКлиенте
Процедура ЗагрузитьКлючевыеСловаВсе(Command)
	GherkinProvider().setKeywords(GetKeywords());
КонецПроцедуры

&НаКлиенте
Процедура ЗагрузитьКлючевыеСловаАнгл(Command)
	GherkinProvider().setKeywords(GetKeywords("en"));
КонецПроцедуры

&НаКлиенте
Процедура ЗагрузитьКлючевыеСловаРус(Command)
	GherkinProvider().setKeywords(GetKeywords("ru"));
КонецПроцедуры

&НаКлиенте
Процедура ПоказатьСообщение(Command)
	VanessaEditor().showMessage(MessageText);
КонецПроцедуры

&НаКлиенте
Функция GetKeyCodeMap()

	Map = Новый Map;
	Map.Insert(0, "Unknown");
	Map.Insert(1, "Backspace");
	Map.Insert(2, "Tab");
	Map.Insert(3, "Enter");
	Map.Insert(4, "Shift");
	Map.Insert(5, "Ctrl");
	Map.Insert(6, "Alt");
	Map.Insert(7, "PauseBreak");
	Map.Insert(8, "CapsLock");
	Map.Insert(9, "Escape");
	Map.Insert(10, "Space");
	Map.Insert(11, "PageUp");
	Map.Insert(12, "PageDown");
	Map.Insert(13, "End");
	Map.Insert(14, "Home");
	Map.Insert(15, "LeftArrow");
	Map.Insert(16, "UpArrow");
	Map.Insert(17, "RightArrow");
	Map.Insert(18, "DownArrow");
	Map.Insert(19, "Insert");
	Map.Insert(20, "Delete");
	Map.Insert(21, "KEY_0");
	Map.Insert(22, "KEY_1");
	Map.Insert(23, "KEY_2");
	Map.Insert(24, "KEY_3");
	Map.Insert(25, "KEY_4");
	Map.Insert(26, "KEY_5");
	Map.Insert(27, "KEY_6");
	Map.Insert(28, "KEY_7");
	Map.Insert(29, "KEY_8");
	Map.Insert(30, "KEY_9");
	Map.Insert(31, "KEY_A");
	Map.Insert(32, "KEY_B");
	Map.Insert(33, "KEY_C");
	Map.Insert(34, "KEY_D");
	Map.Insert(35, "KEY_E");
	Map.Insert(36, "KEY_F");
	Map.Insert(37, "KEY_G");
	Map.Insert(38, "KEY_H");
	Map.Insert(39, "KEY_I");
	Map.Insert(40, "KEY_J");
	Map.Insert(41, "KEY_K");
	Map.Insert(42, "KEY_L");
	Map.Insert(43, "KEY_M");
	Map.Insert(44, "KEY_N");
	Map.Insert(45, "KEY_O");
	Map.Insert(46, "KEY_P");
	Map.Insert(47, "KEY_Q");
	Map.Insert(48, "KEY_R");
	Map.Insert(49, "KEY_S");
	Map.Insert(50, "KEY_T");
	Map.Insert(51, "KEY_U");
	Map.Insert(52, "KEY_V");
	Map.Insert(53, "KEY_W");
	Map.Insert(54, "KEY_X");
	Map.Insert(55, "KEY_Y");
	Map.Insert(56, "KEY_Z");
	Map.Insert(57, "Meta");
	Map.Insert(58, "ContextMenu");
	Map.Insert(59, "F1");
	Map.Insert(60, "F2");
	Map.Insert(61, "F3");
	Map.Insert(62, "F4");
	Map.Insert(63, "F5");
	Map.Insert(64, "F6");
	Map.Insert(65, "F7");
	Map.Insert(66, "F8");
	Map.Insert(67, "F9");
	Map.Insert(68, "F10");
	Map.Insert(69, "F11");
	Map.Insert(70, "F12");
	Map.Insert(71, "F13");
	Map.Insert(72, "F14");
	Map.Insert(73, "F15");
	Map.Insert(74, "F16");
	Map.Insert(75, "F17");
	Map.Insert(76, "F18");
	Map.Insert(77, "F19");
	Map.Insert(78, "NumLock");
	Map.Insert(79, "ScrollLock");
	Map.Insert(80, "US_SEMICOLON");
	Map.Insert(81, "US_EQUAL");
	Map.Insert(82, "US_COMMA");
	Map.Insert(83, "US_MINUS");
	Map.Insert(84, "US_DOT");
	Map.Insert(85, "US_SLASH");
	Map.Insert(86, "US_BACKTICK");
	Map.Insert(87, "US_OPEN_SQUARE_BRACKET");
	Map.Insert(88, "US_BACKSLASH");
	Map.Insert(89, "US_CLOSE_SQUARE_BRACKET");
	Map.Insert(90, "US_QUOTE");
	Map.Insert(91, "OEM_8");
	Map.Insert(92, "OEM_102");
	Map.Insert(93, "NUMPAD_0");
	Map.Insert(94, "NUMPAD_1");
	Map.Insert(95, "NUMPAD_2");
	Map.Insert(96, "NUMPAD_3");
	Map.Insert(97, "NUMPAD_4");
	Map.Insert(98, "NUMPAD_5");
	Map.Insert(99, "NUMPAD_6");
	Map.Insert(100, "NUMPAD_7");
	Map.Insert(101, "NUMPAD_8");
	Map.Insert(102, "NUMPAD_9");
	Map.Insert(103, "NUMPAD_MULTIPLY");
	Map.Insert(104, "NUMPAD_ADD");
	Map.Insert(105, "NUMPAD_SEPARATOR");
	Map.Insert(106, "NUMPAD_SUBTRACT");
	Map.Insert(107, "NUMPAD_DECIMAL");
	Map.Insert(108, "NUMPAD_DIVIDE");
	Map.Insert(109, "KEY_IN_COMPOSITION");
	Map.Insert(110, "ABNT_C1");
	Map.Insert(111, "ABNT_C2");
	Map.Insert(112, "MAX_VALUE");
	Возврат Map;

КонецФункции

&НаКлиенте
Процедура ТрассировкаКлавиатурыПриИзменении(Item)
	VanessaEditor().traceKeyboard = TraceKeyboard;
КонецПроцедуры

&НаКлиенте
Процедура ОчиститьЖурналСобытий(Command)
	EventLog.Clear();
КонецПроцедуры

#EndRegion

#Region Breakpoints

&НаКлиенте
Процедура ТочкиОстановаПриИзменении(Item)

	ОформитьТочкиОстанова(VanessaEditor());

КонецПроцедуры

&НаКлиенте
Процедура ТочкиОстановаПередОкончаниемРедактирования(Item, NewRow, CancelEdit, Cancel)

	Breakpoints.Sort("codeWidget,lineNumber");

	//Значение = 0;
	//Для Каждого Строка Из Breakpoints Цикл
	//	Если Значение = Строка.Value Тогда
	//		Cancel = Истина;
	//		Возврат;
	//	КонецЕсли;
	//	Значение = Строка.Value;
	//КонецЦикла;

КонецПроцедуры

&НаКлиенте
Процедура ТочкиОстановаПриАктивизацииСтроки(Item)

	Если Item.CurrentData = Неопределено Тогда
		Возврат;
	КонецЕсли;

	Если Item.CurrentData.codeWidget = 0 Тогда
		VanessaEditor().revealLine(Item.CurrentData.lineNumber);
	КонецЕсли;

КонецПроцедуры

&НаКлиенте
Процедура ОбновитьТочкиОстанова(Json)

	BreakpointsPacket = JsonLoad(Json);

	Breakpoints.Clear();
	Для Каждого Chunk Из BreakpointsPacket Цикл
		FillPropertyValues(Breakpoints.Add(), Chunk);
	EndDo;

	Breakpoints.Sort("codeWidget,lineNumber");

	Если EmulateBreakpointUpdateDelay Тогда
		Пауза();
	КонецЕсли;

КонецПроцедуры

&НаКлиенте
Процедура ОформитьТочкиОстанова(Editor)

	BreakpointsPacket = Новый Array;

	Для Каждого Row Из Breakpoints Цикл
		Chunk = Новый Structure("lineNumber,codeWidget,enable");
		FillPropertyValues(Chunk, Row);
		BreakpointsPacket.Add(Chunk);
	EndDo;

	Editor.decorateBreakpoints(JsonDump(BreakpointsPacket));

КонецПроцедуры

#EndRegion

#Region Problems

&НаКлиенте
Процедура ПроблемыПриИзменении(Item)

	ОформитьПроблемы();

КонецПроцедуры

&НаКлиенте
Процедура ОформитьПроблемы()

	ProblemsPacket = Новый Array;

	Для Каждого Row Из Problems Цикл
		Chunk = Новый Structure;
		Chunk.Insert("lineNumber", Row.LineNumber);
		Chunk.Insert("severity", Row.Severity);
		Chunk.Insert("message", Row.Message);
		Chunk.Insert("code", Row.Code);
		Chunk.Insert("source", Row.Source);
		ProblemsPacket.Add(Chunk);
	EndDo;

	VanessaEditor().decorateProblems(JsonDump(ProblemsPacket));

КонецПроцедуры

#EndRegion

#Region RuntimeProgress

&НаКлиенте
Процедура ТекущийШагПриИзменении(Item)
	VanessaEditor().setCurrentProgress(CurrentStep);
	VanessaEditor().revealLine(CurrentStep);
КонецПроцедуры

&НаКлиенте
Процедура УстановитьПрогресс(Command)
	Map = Новый Map;
	Для Каждого Row Из CompleteSteps Цикл
		Steps = Map.Get(Row.codeWidget);
		Если Steps = Неопределено Тогда
			Steps = Новый Array;
			Map.Insert(Row.codeWidget, Steps);
		КонецЕсли;
		Steps.Add(Row.LineNumber);
	EndDo;
	Для Каждого KeyValue Из Map Цикл
		VanessaEditor().setRuntimeProgress(RuntimeStatus, JsonDump(KeyValue.Value), KeyValue.Key, InlineView);
	EndDo;
КонецПроцедуры

&НаКлиенте
Процедура ОчиститьПрогресс(Command)
	VanessaEditor().clearRuntimeProgress();
КонецПроцедуры

#EndRegion

#Region Json

&НаКлиенте
Функция JsonLoad(Json, ReadToMap = Ложь)

	JSONReader = Новый JSONReader;
	JSONReader.SetString(Json);
	Value = ReadJSON(JSONReader, ReadToMap);
	JSONReader.Close();
	Возврат Value;

КонецФункции

&НаКлиенте
Функция JsonDump(Value)

	JSONWriter = Новый JSONWriter;
	JSONWriter.SetString();
	WriteJSON(JSONWriter, Value);
	Возврат JSONWriter.Close();

КонецФункции

#EndRegion

#Region Utils

Процедура Пауза(Delay = 1)

	RunApp("timeout " + Delay, , Истина);

КонецПроцедуры

#EndRegion

#Region VanessaEditor

#Region Public

&НаКлиенте
Процедура ДобавитьВЖурналСобытий(Event, Data)

	EventRecord = EventLog.Insert(0);
	EventRecord.Date = CurrentDate();
	EventRecord.Type = Event;
	EventRecord.Data = Data;
	Items.EventLog.CurrentRow = EventLog.IndexOf(EventRecord);

КонецПроцедуры

&НаКлиенте
Функция GetKeyInfo(Data)

	res = "";
	Если Data.metaKey Тогда res = res + "Win+"; КонецЕсли;
	Если Data.ctrlKey Тогда res = res + "Ctrl+"; КонецЕсли;
	Если Data.altKey Тогда res = res + "Alt+"; КонецЕсли;
	Если Data.shiftKey Тогда res = res + "Shift+"; КонецЕсли;
	Возврат res + KeyCodeMap[Data.keyCode] + " (" + Data.keyCode + ")";

КонецФункции

&НаКлиенте
Процедура СоздатьШаг(Editor, lineNumber)

	Text = VanessaEditor().getLineContent(lineNumber);

	Map = Новый Map;
	Map.Insert("filterText", Text);
	Map.Insert("insertText", Text);
	Map.Insert("sortText", Text);
	Map.Insert("documentation", "Новый шаг, созданный пользователем");
	Map.Insert("kind", 0);
	Map.Insert("section", "Пользовательский шаг");

	Array = Новый Array;
	Array.Add(Map);

	GherkinProvider().setStepList(JsonDump(Array), Ложь);

КонецПроцедуры

&НаКлиенте
Процедура РедакторVanessaПриПолученииСобытия(Editor, Event, Arg)

	Если Event = "UPDATE_BREAKPOINTS" Тогда
		ОбновитьТочкиОстанова(Arg);
		ОформитьТочкиОстанова(Editor);
	ИначеЕсли Event = "F9" Тогда
		ДобавитьВЖурналСобытий(Event, Arg);
		Editor.toggleBreakpoint();
	ИначеЕсли Event = "CREATE_STEP" Тогда
		ДобавитьВЖурналСобытий(Event, Arg);
		СоздатьШаг(Editor, Arg);
	ИначеЕсли Event = "SHOW_STEP_IN_TREE" Тогда
		// Редактор прислал контекст шага под курсором: в демо показываем его
		// текстом, в VA по нему раскрывается дерево библиотеки шагов.
		ДобавитьВЖурналСобытий(Event, Arg);
		ПоказатьПодсказку("Шаг под курсором: " + Arg);
	ИначеЕсли Event = "OPEN_STEP_AS_FEATURE" Тогда
		ДобавитьВЖурналСобытий(Event, Arg);
		ПоказатьПодсказку("Открыть фичу шага: " + Arg);
	Иначе
		ДобавитьВЖурналСобытий(Event, Arg);
	КонецЕсли;

КонецПроцедуры

#EndRegion

#Region Public

&НаКлиенте
Процедура ЗагрузитьРедактор()

	Если Не ValueIsFilled(EditorTemplateURL) Тогда
		Возврат;
	КонецЕсли;

	EditorDirectory = ExtractTemplates(ДанныеМакета(EditorTemplateURL, "VAEditor"));
	VanessaEditorURL = EditorDirectory + "/index.html?localeCode=" + Left(CurrentSystemLanguage(), 2) + "#";

КонецПроцедуры

&НаКлиенте
Функция ДанныеМакета(АдресМакета, ИмяМакета)

	// Макет уходит на клиент адресом во временном хранилище. Если в собранной
	// обработке макет пустой, во временном хранилище оказывается Неопределено
	// или пустые двоичные данные, и платформа падает на OpenStreamForRead
	// без пояснений. Проверяем заранее, чтобы сообщение называло макет.
	Данные = GetFromTempStorage(АдресМакета);
	Если ТипЗнч(Данные) <> Тип("ДвоичныеДанные") Тогда
		ВызватьИсключение "Макет """ + ИмяМакета + """: ожидались двоичные данные, получено "
			+ ТипЗнч(Данные) + ". Пересоберите обработку: npm run compile.";
	КонецЕсли;
	Если Данные.Размер() = 0 Тогда
		ВызватьИсключение "Макет """ + ИмяМакета + """: двоичные данные пусты. Пересоберите макет: npm run compile.";
	КонецЕсли;

	Возврат Данные;

КонецФункции

&НаКлиенте
Функция ExtractTemplates(BinaryData)

	Directory = GetTempFileName();
	DeleteFiles(Directory);
	CreateDirectory(Directory);

	ZipFileReader = Новый ZipFileReader(BinaryData.OpenStreamForRead());
	Для Каждого ZipFileEntry Из ZipFileReader.Items Цикл
		ZipFileReader.Extract(ZipFileEntry, Directory, ZIPRestoreFilePathsMode.Restore);
	EndDo;

	Возврат Directory;

КонецФункции

&НаКлиенте
Функция TemplateText(BinaryData, EntryBaseName = "")

	// EntryBaseName = "" — берётся первый файл архива.
	Directory = ExtractTemplates(BinaryData);
	Result = "";
	ZipFileReader = Новый ZipFileReader(BinaryData.OpenStreamForRead());
	Для Каждого ZipFileEntry Из ZipFileReader.Items Цикл
		Если EntryBaseName = "" Или ZipFileEntry.BaseName = EntryBaseName Тогда
			TextReader = Новый TextReader(Directory + "/" + ZipFileEntry.FullName, TextEncoding.UTF8);
			Result = TextReader.Read();
			TextReader.Close();
			Прервать;
		КонецЕсли;
	EndDo;
	DeleteFiles(Directory);

	Возврат Result;

КонецФункции

#EndRegion

#Region Private

&НаКлиенте
Процедура РедакторVanessaПриНажатии(Item, EventData, StandardProcessing)

	Element = EventData.Element;
	Если Lower(Element.tagName) = "body" Тогда
		StandardProcessing = false;
		Если EventData.Event.type <> "click" Тогда
			Возврат;
		КонецЕсли;
		EventDataFor1C = EventData.Event.detail;

		Если EventDataFor1C = Неопределено Или TypeOf(EventDataFor1C) = Type("Number") Тогда
			Возврат;
		КонецЕсли;
		EventType = EventDataFor1C.name; //Строка
		Data = EventDataFor1C.data; // Неопределено, Строка, Произвольный
		Если Не ValueIsFilled(EventType) Тогда
			Возврат;
		КонецЕсли;
		РедакторVanessaПриПолученииСобытия(EventDataFor1C.editor, EventType, Data);
	ИначеЕсли CharCode(Element.innerText, 1) = 60020 Тогда
		Message(Element.title);
	ИначеЕсли CharCode(Element.innerText, 1) = 60277 Тогда
		Message(Element.title);
	КонецЕсли;

КонецПроцедуры

&НаКлиенте
Процедура ЗаполнитьДействияРедактора(Editor)

	TextJSON = Editor.getActions();
	JSONReader = Новый JSONReader;
	JSONReader.SetString(TextJSON);
	ActionArray = ReadJSON(JSONReader);
	Для Каждого Action Из ActionArray Цикл
		FillPropertyValues(Actions.Add(), Action);
	EndDo;
	Actions.Sort("Id");

КонецПроцедуры

&НаКлиенте
Функция GetKeywords(Language = "")

	JsonText = TemplateText(ДанныеМакета(KeywordsTemplateURL, "Keywords"));

	JsonData = JsonLoad(JsonText, Истина);
	Keyrords = Новый Map;
	Если IsBlankString(Language) Тогда
		Keyrords.Insert("en", JsonData.Get("en"));
		Keyrords.Insert("ru", JsonData.Get("ru"));
	Иначе
		Keyrords.Insert(Language, JsonData.Get(Language));
	КонецЕсли;

	Возврат JsonDump(Keyrords);

КонецФункции

&НаКлиенте
Функция GetElements()

	Map = Новый Map;
	Map.Insert("ИмяКоманды", "ЗаписатьИЗакрыть");
	Map.Insert("ИмяКнопки", "ФормаЗаписать");
	Map.Insert("ИмяТаблицы", "Номенклатура");
	Map.Insert("ИмяРеквизита", "Количество");
	Возврат JsonDump(Map);

КонецФункции

&НаКлиенте
Функция GetVariables()

	Map = Новый Map;
	Map.Insert("ИмяКоманды", "ЗаписатьИЗакрыть");
	Map.Insert("ИмяКнопки", "ФормаЗаписать");
	Map.Insert("ИмяТаблицы", "Номенклатура");
	Map.Insert("ИмяРеквизита", "Количество");
	Возврат JsonDump(Map);

КонецФункции

&НаКлиенте
Функция GetMetatags()

	words = "
		|try
		|except
		|endtry
		|попытка
		|исключение
		|конецпопытки
		|";

	split = "
	|";

	Metatags = StrSplit(words, split, Ложь);

	Возврат JsonDump(Metatags);

КонецФункции

&НаКлиенте
Функция GetDirectives()

	Map = Новый Map;
	Map.Insert("if", StrSplit("Если,If", ","));
	Map.Insert("elsif", StrSplit("ИначеЕсли,Иначе,ElseIf,Else", ","));
	Map.Insert("endif", StrSplit("КонецЕсли,EndIf", ","));
	Возврат JsonDump(Map);

КонецФункции

&НаКлиенте
Функция VanessaStepList(Language)

	Возврат TemplateText(ДанныеМакета(StepListTemplateURL, "StepList"), Language);

КонецФункции

&НаКлиенте
Функция GetCommands()

	CmdList = Новый Array;

	KeyMod = Новый Array;
	CmdList.Add(Новый Structure("eventId,keyCode,keyMod", "F5", "F5", KeyMod));

	KeyMod = Новый Array;
	KeyMod.Add("Alt");
	CmdList.Add(Новый Structure("eventId,keyCode,keyMod", "Alt+F5", "F5", KeyMod));

	KeyMod = Новый Array;
	KeyMod.Add("Shift");
	KeyMod.Add("CtrlCmd");
	CmdList.Add(Новый Structure("eventId,keyCode,keyMod", "Ctrl+Shift+F5", "F5", KeyMod));

	KeyMod = Новый Array;
	CmdList.Add(Новый Structure("eventId,keyCode,keyMod", "F9", "F9", KeyMod));

	KeyMod = Новый Array;
	CmdList.Add(Новый Structure("eventId,keyCode,keyMod", "F11", "F11", KeyMod));

	CmdList.Add(Новый Structure("eventId, title", "CREATE_STEP", "Создать новый шаг!"));
	CmdList.Add(Новый Structure("eventId, title", "IGNORE_ERROR", "Игнорировать эту ошибку"));

	CmdList.Add(Новый Structure("eventId, errorLink", "ERROR_DATA", "Подробности"));
	CmdList.Add(Новый Structure("eventId, errorLink", "ERROR_COPY", "Копировать ошибку"));

	Возврат JsonDump(CmdList);

КонецФункции

&НаКлиенте
Функция GetErrorLinks()

	Links = Новый Array;
	Links.Add(Новый Structure("id, title", "ERROR_DATA", "Подробности"));
	Links.Add(Новый Structure("id, title", "ERROR_COPY", "Копировать ошибку"));
	Возврат JsonDump(Links);

КонецФункции

&НаКлиенте
Процедура РедакторVanessaЗавершениеДокумента(Item)

	Перем Provider, Editor;

	MsgStructure = Новый Structure;
	MsgStructure.Insert("syntaxMsg", "Синтаксическая ошибка: шаг не найден");
	MsgStructure.Insert("soundHint", "Текст звукового сигнала");
	MessagesJSON = JsonDump(MsgStructure);

	Provider = DefaultView().VanessaGherkinProvider;
	Provider.setErrorLinks(GetErrorLinks());
	Provider.setMetatags(GetMetatags());
	Provider.setKeywords(GetKeywords());
	Provider.setElements(GetElements());
	Provider.setVariables(GetVariables());
	Provider.setDirectives(GetDirectives());
	Provider.setMessages(MessagesJSON);
	ЗагрузитьШагиВсе(Неопределено);

	// Вид создаётся тем же кодом, что и переключатель «Тип редактора», — так
	// при открытии обработки сразу видны вкладки (EditorType = 3).
	ТипРедактораПриИзменении(Неопределено);

	// Активной оставляем вкладку с кодом: последняя может быть просмотрщиком
	// markdown, а команды демо ставятся редактору кода.
	Представление = DefaultView();
	Если Представление.VanessaTabs <> Неопределено Тогда
		Вкладки = Представление.VanessaTabs;
		Для Индекс = 0 По Вкладки.count() - 1 Цикл
			Если Вкладки.tab(Индекс).isCodeEditor Тогда
				Вкладки.select(Индекс);
				Прервать;
			КонецЕсли;
		КонецЦикла;
	КонецЕсли;

	Editor = VanessaEditor();
	Editor.addCommands(GetCommands());
	ЗаполнитьДействияРедактора(Editor);

	УсловныеОператоры = Новый Соответствие;
	МассивСлов = Новый Массив;
	МассивСлов.Добавить("then");
	УсловныеОператоры.Вставить("if", МассивСлов);
	МассивСлов = Новый Массив;
	МассивСлов.Добавить("Тогда");
	УсловныеОператоры.Вставить("Если", МассивСлов);

	ЗаписьJSON = Новый ЗаписьJSON;
	ЗаписьJSON.УстановитьСтроку();
	ЗаписатьJSON(ЗаписьJSON, УсловныеОператоры);
	УсловныеОператоры = ЗаписьJSON.Закрыть();
	Provider.setKeypairs(УсловныеОператоры);

КонецПроцедуры

&НаКлиенте
Функция DefaultView()

	Возврат Items.VanessaEditor.Document.defaultView;

КонецФункции

&НаКлиенте
Функция VanessaEditor()

	// В режиме вкладок отдельного редактора нет — возвращаем редактор активной
	// вкладки: у него тот же публичный API, поэтому команды демо работают в
	// обоих режимах без ветвлений.
	Представление = DefaultView();
	Если Представление.VanessaEditor = Неопределено Тогда
		Возврат Представление.VanessaTabs.editor;
	КонецЕсли;

	Возврат Представление.VanessaEditor;

КонецФункции

&НаКлиенте
Функция НастройкиРедактора()

	// В режиме вкладок отдельного VanessaEditor нет: общие настройки
	// (таб, пробелы, отступы, режим чтения) принимает VanessaTabs.
	Представление = DefaultView();
	Если Представление.VanessaEditor = Неопределено Тогда
		Возврат Представление.VanessaTabs;
	КонецЕсли;

	Возврат Представление.VanessaEditor;

КонецФункции

&НаКлиенте
Функция GherkinProvider()

	Возврат DefaultView().VanessaGherkinProvider;

КонецФункции

&НаКлиенте
Процедура ПоказатьПодсценарий(Command)

	Cоntent =
		"Функционал: Проверка формирования отчета Allure
		|
		|Как разработчик
		|Я хочу чтобы корректно формировался отчет Allure
		|Чтобы я мог видеть результат работы сценариев
		|
		|Контекст:
		|	Дано подсценарий первого уровня номер один
		|	Дано подсценарий первого уровня номер два
		|Структура сценария: Прикрепление скриншота, когда используется VanessaExt. Одно окно. Весь экран.
		|	Дано подсценарий первого уровня номер один
		|	Дано подсценарий первого уровня номер два
		|	И нормальная строка
		|";

	Cоntent1 =
		"	К тому же шаг подсценария 1
		|		И шаг подсценария 2
		|		И шаг подсценария 3
		|";

	Cоntent2 =
		"	И подсценрий второго уровня
		|		И шаг подсценария 4
		|		И шаг подсценария 5
		|		И шаг подсценария 6
		|";

	VanessaEditor().setContent(Cоntent);
	VanessaEditor().showRuntimeCode(8, Cоntent1 + Cоntent2);
	VanessaEditor().showRuntimeCode(11, Cоntent1);
	VanessaEditor().showRuntimeCode(12, Cоntent2);

КонецПроцедуры

&НаКлиенте
Процедура ЗапуститьПодсценарий(Command)
	AttachIdleHandler("СледующийШагВыполнения", 1, Ложь);
КонецПроцедуры

&НаКлиенте
Процедура ОстановитьПодсценарий(Command)
	DetachIdleHandler("СледующийШагВыполнения");
КонецПроцедуры

&НаКлиенте
Процедура СледующийШагВыполнения()
	Pos = VanessaEditor().nextRuntimeProgress();
	Если Pos = Неопределено Тогда
		RuntimePosition = Неопределено;
		RuntimeCode = Неопределено;
	Иначе
		RuntimePosition = "(" + Format(Pos.lineNumber, "NG=") + ", " + Pos.codeWidget + ")";
		RuntimeCode = VanessaEditor().getLineContent(Pos.lineNumber, Pos.codeWidget);
	КонецЕсли;
КонецПроцедуры

&НаКлиенте
Процедура МиниКартаПриИзменении(Item)

	Элементы.VanessaEditor.Документ.defaultView.VanessaTabs.showMinimap = ShowMinimap;

КонецПроцедуры

&НаКлиенте
Функция GetMarkdownText()

	Попытка
		TextDocument = Новый TextDocument;
		TextDocument.Read("C:\Cpp\VAEditor\README.md", TextEncoding.UTF8);
		return TextDocument.GetText();
	Исключение
		return Неопределено;
	EndTry;

КонецФункции

&НаКлиенте
Процедура ТипРедактораПриИзменении(Item)

	View = DefaultView();

	text1 =
		"#language: en
		|
		|@IgnoreOnCIMainBuild
		|
		|Feature: <feature description>
		|
		|As <Role>
		|I want <functionality description>
		|To <business effect>
		|
		|
		|Scenario: Simple startup script
		|
		|	And I execute 1C:Enterprise script
		|		| 'Message(""Hellow world!"")'
		|
		|	Then I raise ""Exception text"" exception
		|";

	text2 =
		"#language: en
		|
		|@IgnoreOnCIMainBuild
		|
		|Feature: <feature description>
		|
		|As <Role>
		|I want <functionality description>
		|To <business effect>
		|
		|
		|Scenario: <scenario description>
		|
		|	Then I stop script execution
		|
		|	Then I raise ""Exception text"" exception
		|";

	Language = "turbo-gherkin";
	Если EditorType = 0 Тогда
		View.disposeVanessaTabs();
		View.disposeVanessaDiffEditor();
		View.createVanessaEditor(text1, Language);
	ИначеЕсли EditorType = 3 Тогда
		View.disposeVanessaEditor();
		View.disposeVanessaDiffEditor();
		tabs = View.createVanessaTabs();
		f = "Simple.feature";
		tabs.edit(text1, f, "1" + f, f, 0, false, true);
		tabs.edit(text2, f, "2" + f, f, 0, false, true);
		tabs.diff(text1, f, "1" + f, text2, f, "2" + f, f, 0, false, true);
		MarkdownText = GetMarkdownText();
		Если Не IsBlankString(MarkdownText) Тогда
			f = "readme.md";
			tabs.view(f, f, MarkdownText, true);
		КонецЕсли;
	Иначе
		SideBySide = 2;
		View.disposeVanessaTabs();
		View.disposeVanessaEditor();
		DiffEditor = View.createVanessaDiffEditor(text1, text2, Language);
		DiffEditor.setSideBySide(EditorType = SideBySide);
	КонецЕсли;

КонецПроцедуры

#EndRegion
&НаКлиенте
Процедура ИспользоватьОтладчикПриИзменении(Элемент)

	DefaultView().useVanessaDebugger(useDebugger);

КонецПроцедуры

&НаКлиенте
Процедура РазмерТабуляцииПриИзменении(Item)
	НастройкиРедактора().setTabSize(TabSize);
КонецПроцедуры

&НаКлиенте
Процедура ВставлятьПробелыПриИзменении(Item)
	НастройкиРедактора().setInsertSpaces(InsertSpaces);
КонецПроцедуры

&НаКлиенте
Процедура ВыровнятьОтступы(Command)
	НастройкиРедактора().normalizeIndentation();
КонецПроцедуры

&НаКлиенте
Процедура Пробелы(Команда)

	Элементы.VanessaEditor.Документ.defaultView.VanessaTabs.renderWhitespace = "boundary";

КонецПроцедуры

&НаКлиенте
Процедура Автотест(Command)

	Position = StrFind(FormName, ".", SearchDirection.FromEnd);
	OpenForm(Left(FormName, Position) + "Autotest");

КонецПроцедуры

#EndRegion

#Region ДемонстрацияВозможностей

// Каждая команда ниже показывает одну возможность редактора так, чтобы результат
// был виден сразу: сообщением, новой вкладкой или изменением текста.

&НаКлиенте
Процедура ПоказатьПодсказку(Текст)

	Сообщение = Новый СообщениеПользователю;
	Сообщение.Текст = Текст;
	Сообщение.Сообщить();

КонецПроцедуры

&НаКлиенте
Функция СобратьТекст(Строки)

	Возврат СтрСоединить(Строки, Символы.ПС);

КонецФункции

// Форматирование фичи: то же, что Shift+Alt+F. Выравнивает таблицы параметров,
// приводит отступы секций и шагов, убирает хвостовые пробелы.
&НаКлиенте
Процедура ФорматироватьДокумент(Команда)

	VanessaEditor().formatDocument();

КонецПроцедуры

// Символ комментария строки: '#' — стандарт Gherkin, '//' — как в старых базах.
// Токенизатор понимает оба, при форматировании маркер приводится к выбранному.
&НаКлиенте
Процедура ПереключитьСимволКомментария(Команда)

	Если GherkinProvider().lineComment = "#" Тогда
		GherkinProvider().setLineComment("//");
	Иначе
		GherkinProvider().setLineComment("#");
	КонецЕсли;

	ПоказатьПодсказку("Символ комментария строки: " + GherkinProvider().lineComment);

КонецПроцедуры

// Шаг под курсором уходит в 1С событием SHOW_STEP_IN_TREE: редактор не знает
// дерева библиотеки шагов, навигацию выполняет принимающая сторона.
&НаКлиенте
Процедура ПоказатьШагВДереве(Команда)

	VanessaEditor().showStepInTree();

КонецПроцедуры

&НаКлиенте
Процедура ОткрытьШагКакФичу(Команда)

	VanessaEditor().openStepAsFeature();

КонецПроцедуры

// Три языка в отдельных вкладках. Язык вкладки выбирается по расширению файла,
// поэтому достаточно передать правильное имя файла: demo.feature, demo.bsl,
// demo.xbsl. Четвёртая вкладка — diff двух версий BSL.
&НаКлиенте
Процедура ПоказатьЯзыки(Команда)

	Представление = DefaultView();
	Представление.disposeVanessaEditor();
	Представление.disposeVanessaDiffEditor();
	Представление.disposeVanessaTabs();

	Вкладки = Представление.createVanessaTabs();

	Вкладки.edit(ТекстФичи(), "demo.feature", "demo.feature", "Gherkin — форматирование", 0, Ложь, Истина);
	Вкладки.edit(ТекстBsl(), "demo.bsl", "demo.bsl", "BSL — встроенный язык", 0, Ложь, Истина);
	Вкладки.edit(ТекстXbsl(), "demo.xbsl", "demo.xbsl", "xBSL — 1С:Элемент", 0, Ложь, Истина);
	Вкладки.diff(ТекстBslДо(), "demo.bsl", "demo-old.bsl",
		ТекстBslПосле(), "demo.bsl", "demo-new.bsl",
		"BSL — было / стало", 0, Ложь, Истина);

КонецПроцедуры

// Фича для вкладки: таблица специально неровная — после форматирования столбцы
// выровняются по самой широкой ячейке.
&НаКлиенте
Функция ТекстФичи()

	Строки = Новый Массив;
	Строки.Добавить("#language: ru");
	Строки.Добавить("");
	Строки.Добавить("Функционал: Демонстрация редактора");
	Строки.Добавить("");
	Строки.Добавить("Сценарий: Таблица параметров");
	Строки.Добавить("	Дано я открываю форму ""Номенклатура""");
	Строки.Добавить("	И таблица с параметрами");
	Строки.Добавить("		| Имя | Значение |");
	Строки.Добавить("		| Количество | 10 |");
	Строки.Добавить("		| Цена | 100 |");
	Строки.Добавить("	Когда я нажимаю Shift+Alt+F");
	Строки.Добавить("	Тогда столбцы выравниваются по самой широкой ячейке");
	Строки.Добавить("");
	Строки.Добавить("// комментарий строки: символ переключается кнопкой «Символ комментария»");

	Возврат СобратьТекст(Строки);

КонецФункции

&НаКлиенте
Функция ТекстBsl()

	Строки = Новый Массив;
	Строки.Добавить("// BSL: ключевые слова, строки, литерал даты, многострочный комментарий");
	Строки.Добавить("&НаСервере");
	Строки.Добавить("Процедура Демонстрация(Значение) Экспорт");
	Строки.Добавить("");
	Строки.Добавить("	Запрос = Новый Запрос;");
	Строки.Добавить("	Запрос.Текст = ""ВЫБРАТЬ Ссылка ИЗ Справочник.Номенклатура"";");
	Строки.Добавить("	Результат = Запрос.Выполнить();");
	Строки.Добавить("");
	Строки.Добавить("	Дата = '20240101';");
	Строки.Добавить("	Если Значение = Неопределено Тогда");
	Строки.Добавить("		Сообщить(""Значение не задано"");");
	Строки.Добавить("	КонецЕсли;");
	Строки.Добавить("");
	Строки.Добавить("КонецПроцедуры");
	Строки.Добавить("");
	Строки.Добавить("/* Многострочный комментарий: подсветка внутри не переключается. */");

	Возврат СобратьТекст(Строки);

КонецФункции

&НаКлиенте
Функция ТекстBslДо()

	Строки = Новый Массив;
	Строки.Добавить("// BSL до правки: одна ветка условия");
	Строки.Добавить("&НаСервере");
	Строки.Добавить("Процедура Демонстрация(Значение) Экспорт");
	Строки.Добавить("");
	Строки.Добавить("	Если Значение = Неопределено Тогда");
	Строки.Добавить("		Сообщить(""Значение не задано"");");
	Строки.Добавить("	КонецЕсли;");
	Строки.Добавить("");
	Строки.Добавить("КонецПроцедуры");

	Возврат СобратьТекст(Строки);

КонецФункции

&НаКлиенте
Функция ТекстBslПосле()

	Строки = Новый Массив;
	Строки.Добавить("// BSL после правки: добавлена ветка Иначе");
	Строки.Добавить("&НаСервере");
	Строки.Добавить("Процедура Демонстрация(Значение) Экспорт");
	Строки.Добавить("");
	Строки.Добавить("	Если Значение = Неопределено Тогда");
	Строки.Добавить("		Сообщить(""Значение не задано"");");
	Строки.Добавить("	Иначе");
	Строки.Добавить("		Сообщить(Значение);");
	Строки.Добавить("	КонецЕсли;");
	Строки.Добавить("");
	Строки.Добавить("КонецПроцедуры");

	Возврат СобратьТекст(Строки);

КонецФункции

// xBSL («1С:Элемент»): ключевые слова только строчными, аннотация @Глобально,
// директива импорта #требуется, пространство имён Стд::Строка, интерполяция
// в строке и регулярное выражение в апострофах.
&НаКлиенте
Функция ТекстXbsl()

	Строки = Новый Массив;
	Строки.Добавить("// xBSL («1С:Элемент»)");
	Строки.Добавить("#требуется модуль.sbsl");
	Строки.Добавить("");
	Строки.Добавить("@Глобально");
	Строки.Добавить("метод Демонстрация(Значение: Стд::Строка)");
	Строки.Добавить("	пер Длина = 100");
	Строки.Добавить("	пер Ширина = 30");
	Строки.Добавить("	знч Площадь = ""Площадь равна ${Длина * Ширина} м2""");
	Строки.Добавить("	знч Образец = '\d+'");
	Строки.Добавить("	Консоль.Записать(Площадь)");
	Строки.Добавить(";");

	Возврат СобратьТекст(Строки);

КонецФункции

#EndRegion
