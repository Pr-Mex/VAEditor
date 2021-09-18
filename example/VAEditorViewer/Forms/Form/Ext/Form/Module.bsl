
&AtServer
Procedure OnCreateAtServer(Cancel, StandardProcessing)
	
	DataObject = FormAttributeToValue("Object");
	FileName = New File(DataObject.UsedFileName);
	VanessaEditorURL = FileName.Path  + "../dist/index.html?localeCode=ru"
	
EndProcedure

&AtClient
Procedure VanessaEditorDocumentComplete(Item)
	
	Items.VanessaEditor.Document.defaultView.VanessaDemo();
	
EndProcedure

&AtClient
Procedure Demo(Command)

	Items.VanessaEditor.Document.defaultView.VanessaTabs.showContextMenu();

EndProcedure

&НаКлиенте
Процедура НастройкаОпций(Команда)
	
	ОписаниеОповещения = Новый ОписаниеОповещения("ПолученыНастройкиРедактора", ЭтаФорма);
	
	МассивИмен = СтрРазделить(ИмяФормы, ".");
	МассивИмен[МассивИмен.ВГраница()] = "Setup";
	НовоеИмя = СтрСоединить(МассивИмен, ".");
	ОткрытьФорму(НовоеИмя, , ЭтаФорма, , , , ОписаниеОповещения, РежимОткрытияОкнаФормы.БлокироватьОкноВладельца);
	
КонецПроцедуры

&НаКлиенте
Процедура ПолученыНастройкиРедактора(РезультатЗакрытия, ДополнительныеПараметры) Экспорт 

	Если ТипЗнч(РезультатЗакрытия) = Тип("Строка") Тогда
		Сообщить(РезультатЗакрытия);
	КонецЕсли;
	
КонецПроцедуры