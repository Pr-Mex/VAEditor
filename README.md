# Vanessa Automation Editor

Редактор сценариев, созданный с помощью [Monaco](https://github.com/Microsoft/monaco-editor) и поддерживающий взаимодействие с платформой [1C:Предприятие](https://1c-dn.com/) 8.3.15+.

Собрано для [Vanessa Automation](https://github.com/Pr-Mex/vanessa-automation).


## Сборка

Для установки выполните команду (необходим установленный node.js для сборки)
```
npm install .
```

Для запуска отладки в браузере (на встроенном сервере для разработки) выполните команду
```
npm run debug
```

Для сборки финального файла `./dist/index.html`, встраиваемого в проект выполните команду
```
npm run build
```

Для сборки примера внешней обработки из исходников в epf файл выполните команду
```
npm run compile
```

Для разборки примера внешней обработки из epf в исходники выполните команду
```
npm run decompile
```

## Как использовать в своем проекте

Смотрите пример использования во внешней обработке с примером [Example](./example)

## API

### Действия (Actions)

Для управления редактором кода из 1С:Предпрития вы можете вызывать методы-действия объекта редактора, полученного из HTML-документа расположенного на форме.

| Action                         | Description                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `setTheme`                     | set etitor theme from `arg`, avaliable values: `vs`, `vs-dark`, and `hc-black`                  |
| `setContent`                   | load `arg` to the editor                                                                        |
| `getContent`                   | return editor content                                                                           |
| `revealLine`                   | scrolling to the `arg` line number                                                              |
| `enableEdit`                   | disable read only mode                                                                          |
| `disableEdit`                  | set read only mode                                                                              |
| `decorateBreakpoints`          | update breakpoint by json description in `arg`, see Breakpoints chapter                         |
| `decorateProblems`             | update problems by json description in `arg`, see Problems chapter                              |
| `decorateCurrentStep`          | update runtime process current step, `arg` line number, see Runtime process chapter             |
| `decorateCompleteSteps`        | update runtime process complete steps by json description in `arg`, see Runtime process chapter |
| `decorateErrorSteps`           | update runtime process error steps by json description in `arg`, see Runtime process chapter    |
| `cleanDecorateRuntimeProgress` | clean runtime process, see Runtime process chapter                                              |
| ... другие команды ...         | см. другие команды в [vanessa-editor.ts](./src/vanessa-editor.ts)                               |

Пример:

```bsl
view = Items.VanessaEditor.Document.defaultView;
VanessaEditor = view.createVanessaEditor("", "turbo-gherkin");

VanessaEditor.setContent("setContent", "Text to edit");
```

### События(Events)

Редактор может отправлять события, которые будут получены и могут быть обработаны на стороне 1С:Предприятия.

| Событие                                | Описание                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `UPDATE_BREAKPOINTS`                   | При обновлении состояния брейкпоинтов                                        |
| `CONTENT_DID_CHANGE`                   | При изменении текста, содержащегося в модели редактора                       |
| `POSITION_DID_CHANGE`                  | После изменения позиции курсора в редакторе                                  |
| `ON_KEY_DOWN`                          | После нажатия клавиши на клавиатре при фокусе установленном в редакторе      |
| `ON_KEY_UP`                            | После отпускания клавиши на клавиатре при фокусе установленном в редакторе   |
| ... дополнительные команды ...         | Команды, переданные в `VanessaEditor.addCommands`                            |

Пример:

```bsl
Function VanessaEditorOnReceiveEventHandler(Event, Arg)

  If Event = "CONTENT_DID_CHANGE" Then
    ContentDidChange = True;
  EndIf;

EndFunction
```

## Примеры

### Json

В большинстве случаев обмен редактора и 1С:Предприятия осуществляется с помощью сообщений в json формете.
Для быстрой сериализации и десериализации объектов 1С:Предпрития в json формат Вы можете воспользоваться функциями:

```bsl
&AtClient
Function JsonDump(Value)

	JSONWriter = New JSONWriter;
	JSONWriter.SetString();
	WriteJSON(JSONWriter, Value);
	Return JSONWriter.Close();

EndFunction

&AtClient
Function JsonLoad(Json)

	JSONReader = New JSONReader;
	JSONReader.SetString(Json);
	Value = ReadJSON(JSONReader);
	JSONReader.Close();
	Return Value;

EndFunction
```

## Правила сворачивания строк

1. Ключевые слова верхнего уровня делят файл на секции и сворачиваются сами по себе, независимо от наличия отступов.
1. Комментарии которые идут подряд сворачиваются к первой строке комментариев тоже независимо от отступов. Пустая строка прерывает группу комментариев.
1. Параметры шага, строки начинающиеся с символа "|" сворачиваются к своей строке шага. Если внутри комментарии, они сворачиваются независимо сами в себя.
1. Инструкции, которые начинаются с собаки "@", группируются внутри себя.
1. Всё остальное сворачивается внутри секций по числу пробелов и табуляторов.
