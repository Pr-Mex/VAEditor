#Region СобытияФормы

&НаСервере
Процедура ПриСозданииНаСервере(Отказ, СтандартнаяОбработка)
	
	LoadMonaco();
	
КонецПроцедуры

&НаКлиенте
Процедура ОтправитьДействие(Команда)
	
	SendAction("revealLine", "1");
	
КонецПроцедуры

#EndRegion

#Region MonacoInteractions

#Region Public

&НаКлиенте
Процедура SendAction(Action, Arg)
	
	Элементы.Monaco.Документ.defaultView.OnReceiveAction(Action, Arg);
	
КонецПроцедуры

&НаКлиенте
Процедура OnReceiveAction(Action, Arg)
	
	Сообщить(Action + " : " + Arg);
	
КонецПроцедуры

#EndRegion

#Region Private

&НаСервере
Процедура LoadMonaco()
	
	Обработка = РеквизитФормыВЗначение("Объект");
	Monaco = ПолучитьСтрокуИзДвоичныхДанных(Обработка.ПолучитьМакет("Monaco"));
	
КонецПроцедуры

&НаКлиенте
Процедура MonacoПриНажатии(Элемент, ДанныеСобытия, СтандартнаяОбработка)
	
	Element = ДанныеСобытия.Element;
	Если Element.id = "interaction" Тогда
		OnReceiveAction(Element.title, Element.value);
	КонецЕсли;
	
КонецПроцедуры

#EndRegion

#EndRegion