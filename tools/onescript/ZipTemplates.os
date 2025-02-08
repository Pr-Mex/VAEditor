Процедура Информация(Текст);
	Сообщить("ИНФОРМАЦИЯ - " + Текст);
КонецПроцедуры

Процедура ПроверитьСуществованиеКаталога(Путь)
	ФайлКаталога = Новый Файл(Путь);
	Если НЕ ФайлКаталога.Существует() Тогда
		ПроверитьСуществованиеКаталога(ФайлКаталога.Путь);
		Информация("Создан каталог: " + Путь);
		СоздатьКаталог(Путь);
	КонецЕсли;
КонецПроцедуры

Функция ФайлыРазличаются(Каталог, ПутьФайлаМакета, Маска = "*.*")

	ФайлМакета = Новый Файл(ПутьФайлаМакета);
	Если НЕ ФайлМакета.Существует() Тогда
		Возврат Истина;
	КонецЕсли;

	ТаблицаЗначений = Новый ТаблицаЗначений;
	ТаблицаЗначений.Колонки.Добавить("ХешСумма");
	ТаблицаЗначений.Колонки.Добавить("Оригинал");
	ТаблицаЗначений.Колонки.Добавить("МакетZip");

	МассивФайлов = НайтиФайлы(Каталог, Маска, Ложь);

	Если МассивФайлов.Количество() = 0 Тогда
		ТекстСообщения = "Каталог <" + Каталог + "> пуст, сначала выполните команду npm run build.";
		ВызватьИсключение ТекстСообщения;
	КонецЕсли;

	Для каждого ФайлСкрипта Из МассивФайлов Цикл
		ХешированиеДанных = Новый ХешированиеДанных(ХешФункция.SHA256);
		ХешированиеДанных.ДобавитьФайл(ФайлСкрипта.ПолноеИмя);
		Стр = ТаблицаЗначений.Добавить();
		Стр.ХешСумма = ХешированиеДанных.ХешСуммаСтрокой;
		Стр.Оригинал = 1;
	КонецЦикла;

	ВременныйКаталог = ПолучитьИмяВременногоФайла();
	УдалитьФайлы(ВременныйКаталог);
	СоздатьКаталог(ВременныйКаталог);

	ЧтениеZipФайла = Новый ЧтениеZipФайла(ПутьФайлаМакета);
	МассивЭлементовБиблиотеки = Новый Массив;
	Для Каждого ЭлементZipФайла Из ЧтениеZipФайла.Элементы Цикл
		ЧтениеZipФайла.Извлечь(ЭлементZipФайла, ВременныйКаталог, РежимВосстановленияПутейФайловZIP.Восстанавливать);
		ИмяФайлаСкрипта = ВременныйКаталог + "/" + ЭлементZipФайла.ПолноеИмя;
		ХешированиеДанных = Новый ХешированиеДанных(ХешФункция.SHA256);
		ДвоичныеДанные = Новый ДвоичныеДанные(ИмяФайлаСкрипта);
		ХешированиеДанных.Добавить(ДвоичныеДанные);
		Стр = ТаблицаЗначений.Добавить();
		Стр.ХешСумма = ХешированиеДанных.ХешСуммаСтрокой;
		Стр.МакетZip = 1;
	КонецЦикла;
	УдалитьФайлы(ВременныйКаталог);
	ЧтениеZipФайла.Закрыть();

	ТаблицаЗначений.Свернуть("ХешСумма", "Оригинал,МакетZip");
	Для каждого Стр Из ТаблицаЗначений Цикл
		Если Стр.Оригинал <> Стр.МакетZip Тогда
			Возврат Истина;
		КонецЕсли;
	КонецЦикла;

	Возврат Ложь;

КонецФункции

Процедура УпаковатьМакет(Каталог, ПутьФайлаМакета, Маска = "*.*")

	ФайлКаталога = Новый Файл(Каталог);
	Если НЕ ФайлКаталога.Существует() Тогда
		ТекстСообщения = "Каталог <" + Каталог + "> не существует, сначала выполните команду npm run build.";
		ВызватьИсключение ТекстСообщения;
	КонецЕсли;

	ФайлМакета = Новый Файл(ПутьФайлаМакета);
	ПроверитьСуществованиеКаталога(ФайлМакета.Путь);
	УдалитьФайлы(ПутьФайлаМакета);

	ЗаписьZIP = Новый ЗаписьZipФайла(ПутьФайлаМакета);

	МаскиУпаковки = СтрРазделить(Маска,";");

	Для Каждого ТекМаска Из МаскиУпаковки Цикл
		МассивФайлов = НайтиФайлы(Каталог, ТекМаска, Ложь);
		Для Каждого ФайлСкрипта Из МассивФайлов Цикл
			ЗаписьZIP.Добавить(ФайлСкрипта.ПолноеИмя, РежимСохраненияПутейZIP.НеСохранятьПути);
			Информация("Добавлен файл: " + ФайлСкрипта.Имя);
		КонецЦикла;
	КонецЦикла;
	ЗаписьZIP.Записать();
	Информация("Создан макет: " + ПутьФайлаМакета);

КонецПроцедуры

КаталогФайлов = "./dist/";

ПутьФайлаМакета = "./example/VAEditorSample/Templates/VAEditor/Ext/Template.bin";
Информация("Сборка макета редактора.");
Если ФайлыРазличаются(КаталогФайлов, ПутьФайлаМакета) Тогда
	УпаковатьМакет(КаталогФайлов, ПутьФайлаМакета, "app*.*;index.html");
Иначе
	Информация("Макет редактора не изменился.");
КонецЕсли;

ПутьФайлаМакета = "./example/VAEditorSample/Templates/AutoTest/Ext/Template.bin";
Информация("Сборка макета автотестов.");
Если ФайлыРазличаются(КаталогФайлов, ПутьФайлаМакета) Тогда
	УпаковатьМакет(КаталогФайлов, ПутьФайлаМакета, "test.*");
Иначе
	Информация("Макет автотестов не изменился.");
КонецЕсли;

КаталогФайлов = "./example/Keywords/";
ПутьФайлаМакета = "./example/VAEditorSample/Templates/Keywords/Ext/Template.bin";
Информация("Сборка макета ключевых слов.");
Если ФайлыРазличаются(КаталогФайлов, ПутьФайлаМакета) Тогда
	УпаковатьМакет(КаталогФайлов, ПутьФайлаМакета);
Иначе
	Информация("Набор ключевых слов не изменился.");
КонецЕсли;

КаталогФайлов = "./example/StepList/";
ПутьФайлаМакета = "./example/VAEditorSample/Templates/StepList/Ext/Template.bin";
Информация("Сборка макета библиотеки шагов.");
Если ФайлыРазличаются(КаталогФайлов, ПутьФайлаМакета) Тогда
	УпаковатьМакет(КаталогФайлов, ПутьФайлаМакета);
Иначе
	Информация("Состав библиотеки шагов не изменился.");
КонецЕсли;
