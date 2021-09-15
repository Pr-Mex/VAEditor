
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
	
	МассивИмен = СтрРазделить(ИмяФормы, ".");
	МассивИмен[МассивИмен.ВГраница()] = "Setup";
	НовоеИмя = СтрСоединить(МассивИмен, ".");
	ОткрытьФорму(НовоеИмя, , ЭтаФорма);
	
КонецПроцедуры
