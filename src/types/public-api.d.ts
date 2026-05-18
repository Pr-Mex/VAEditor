/**
 * Public API контракт VAEditor.
 *
 * Описывает все глобальные конструкторы, объекты и методы, доступные снаружи
 * (со стороны 1С через HTML-поле и любых других интеграторов). Контракт
 * специально вынесен в отдельный файл, чтобы:
 *
 * 1. Внешние интеграторы получали корректные типы и автодополнение в IDE.
 * 2. Случайные breaking changes в публичном API ловились на этапе сборки.
 * 3. Документация API была машиночитаемой.
 *
 * Имена интерфейсов с префиксом `IPublic*` намеренно не совпадают с
 * именами внутренних классов (`VanessaEditor`, `VanessaTabs`, …) — это
 * позволяет публиковать контракт без правок самих классов. Сверка реализаций
 * с контрактом — отдельная задача (Phase 0.1 finalize).
 */

declare global {
  /**
   * Перечисление событий, которые VAEditor посылает в 1С через
   * `document.body.dispatchEvent("click", { detail: { name, data, editor } })`.
   *
   * На стороне 1С перехватываются обработчиком `OnReceiveEventHandler`.
   */
  enum VanessaEditorEventName {
    UPDATE_BREAKPOINTS = "UPDATE_BREAKPOINTS",
    ON_TAB_CLOSING = "ON_TAB_CLOSING",
    ON_TAB_SELECT = "ON_TAB_SELECT",
    ON_HREF_CLICK = "ON_HREF_CLICK",
    ON_LINK_CLICK = "ON_LINK_CLICK",
    ON_MARK_CLICK = "ON_MARK_CLICK",
    REQUEST_IMAGE = "REQUEST_IMAGE",
    PRESS_CTRL_S = "PRESS_CTRL_S",
    PRESS_ESCAPE = "PRESS_ESCAPE",
  }

  /** Точка останова, передаваемая в `setBreakpoints` / `decorateBreakpoints` как JSON-массив. */
  interface IPublicBreakpoint {
    /** 1-based номер строки */
    lineNumber: number;
    /** ID subcode-виджета или пустая строка для основного редактора */
    codeWidget: string;
    /** Активна ли точка останова */
    enable: boolean;
  }

  /** Команда, передаваемая в `addCommands` как JSON-массив. */
  interface IPublicVanessaCommand {
    /** Событие, посылаемое в 1С при срабатывании. */
    eventId: string;
    /** Имя клавиши из `monaco.KeyCode`, например `"F5"`, `"KeyS"`. */
    keyCode?: string;
    /** Модификаторы из `monaco.KeyMod`: `"CtrlCmd"`, `"Shift"`, `"Alt"`, `"WinCtrl"`. */
    keyMod?: Array<string>;
    /**
     * @deprecated Произвольный JS-код, исполняемый через `eval`. Использовать не рекомендуется —
     * данные приходят из 1С через `JSON.parse`, что создаёт RCE-вектор при компрометации источника.
     * Используйте обработку события по `eventId` на стороне 1С.
     */
    script?: string;
    /** Заголовок для отображения в контекст-меню (для `CREATE_STEP` и подобных). */
    title?: string;
    /** Ссылка для отображения в hover'е ошибок (для `CODE_LENS_DATA` и подобных). */
    errorLink?: string;
  }

  /** Текущая позиция в редакторе с учётом subcode-виджетов. */
  interface IPublicVanessaPosition {
    /** 1-based номер строки */
    lineNumber: number;
    column: number;
    /** ID subcode-виджета или пустая строка для основного редактора */
    codeWidget: string;
  }

  /** Позиция выполнения сценария (для `getCurrentProgress`, `next`). */
  interface IPublicRuntimePosition {
    lineNumber: number;
    codeWidget: string;
  }

  /** Уровень рендеринга невидимых пробелов в редакторе. */
  type PublicWhitespaceType = "none" | "boundary" | "selection" | "all";

  /** Действие редактора (`getActions`). */
  interface IPublicVanessaAction {
    id: string;
    title: string;
  }

  /**
   * Парная конструкция ключевых слов условных блоков для Gherkin-провайдера.
   *
   * Пример: `{ if: ["then"], "Если": ["Тогда"] }` — для слов
   * `if`/`Если` ожидаются закрывающие `then`/`Тогда`.
   */
  interface IPublicKeyPairs {
    [openKeyword: string]: string[];
  }

  /** Параметры welcome-страницы (передаётся в `tabs.welcome(title, JSON)`). */
  interface IPublicWelcomeParams {
    title: string;
    subtitle?: string;
    sections: Array<{
      name: string;
      items: Array<{
        event: string;
        href: string;
        gliph?: string;
        name: string;
        path?: string;
      }>;
    }>;
  }

  /**
   * Базовый интерфейс редактора. Общий supertype для всех типов вкладок.
   *
   * Сигнатуры `trigger`, `resetModel`, `getModel` намеренно типизированы как
   * `Function` — это соответствует существующему контракту в `src/common.ts:IVanessaEditor`,
   * который меняли бы только при полной верификации всех вызовов.
   */
  interface IPublicVanessaEditorBase {
    /** Корневой DOM-узел редактора */
    domNode(): HTMLElement;
    /** Освободить ресурсы */
    dispose(): void;
    /** Поставить фокус */
    focus(): void;
    /** Послать Monaco-команду (`trigger(source, handlerId, payload?)`). */
    trigger: Function;
    /** Сбросить текущую модель. */
    resetModel: Function;
    /** Получить текущую Monaco-модель. */
    getModel: Function;
    /** Тип редактора (CodeEditor=0, DiffEditor=1, MarkdownViwer=2). */
    type: number;
    /** Путь к открытому файлу */
    filepath?: string;
  }

  /**
   * Главный экземпляр редактора сценариев. Доступен глобально как
   * `window.VanessaEditor` после `createVanessaEditor()`.
   */
  interface IPublicVanessaEditor extends IPublicVanessaEditorBase {
    // === Тема и контент ===

    /** Установить тему редактора (`vs`, `vs-dark`, `hc-black` или кастомную). */
    setTheme(arg: string): void;
    /** Загрузить контент с указанием имени файла (определяет язык по расширению). */
    setValue(value: string, filename: string): void;
    /** Заменить весь контент модели (язык не меняется). */
    setContent(arg: string): void;
    /**
     * Получить текущий контент.
     * @param codeWidget Опционально — ID subcode-виджета. Пустая строка — основной редактор.
     */
    getContent(codeWidget?: string): string;
    /** Получить содержимое одной строки. */
    getLineContent(lineNumber: number, codeWidget?: string): string;
    /** Получить выделенный фрагмент. */
    getSelectedContent(): string;

    // === Позиция и выделение ===

    /** Получить позицию курсора. */
    getPosition(): IPublicVanessaPosition;
    /** Установить позицию курсора. */
    setPosition(lineNumber: number, column: number, codeWidget?: string): void;
    /** Получить текущее выделение (Monaco.Range + codeWidget). */
    getSelection(): any;
    /** Установить выделение. */
    setSelection(
      startLineNumber: number,
      startColumn: number,
      endLineNumber: number,
      endColumn: number
    ): void;
    /** Перейти к строке внутри subcode-виджета. **NB**: `lineNumber` 0-based — это контракт. */
    selectSubcodeLine(codeWidget: string, lineNumber: number): string | undefined;
    /** Прокрутить редактор к строке. */
    revealLine(lineNumber: number, codeWidget?: string): void;
    /** Прокрутить с центрированием. */
    revealLineInCenter(lineNumber: number, codeWidget?: string): void;

    // === Прогресс выполнения ===

    /** Установить статус выполнения для группы строк (`complete`, `error`, `pending`, `disabled`). */
    setRuntimeProgress(status: string, lines: any, widget?: string, inline?: any): void;
    /** Получить строки с указанным статусом. */
    getRuntimeProgress(status: string): any;
    /** Получить текущую позицию выполнения. */
    getCurrentProgress(): IPublicRuntimePosition | undefined;
    /** Установить текущую позицию выполнения. */
    setCurrentProgress(lineNumber: number, codeWidget?: string): IPublicRuntimePosition | undefined;
    /** Перейти к следующему шагу. */
    nextRuntimeProgress(): IPublicRuntimePosition | undefined;
    /** Показать ошибку в строке. */
    showRuntimeError(lineNumber: number, codeWidget: string, data: string, text: string): string | undefined;
    /** Показать subcode-виджет (вложенный сценарий). */
    showRuntimeCode(lineNumber: number, text: string): string;
    /** Свернуть/развернуть subcode. */
    setSubcodeFolding(lineNumber: number, codeWidget: string, collapsed: boolean): void;
    /** Очистить subcode-виджеты. */
    clearRuntimeCodes(): void;
    /** Очистить ошибки. */
    clearRuntimeErrors(): void;
    /** Очистить статусы выполнения. */
    clearRuntimeStatus(): void;
    /** Очистить весь runtime-state (статус + ошибки + subcode). */
    clearRuntimeProgress(): void;

    // === Точки останова ===

    /** Установить точки останова из JSON-массива `IPublicBreakpoint[]`. */
    setBreakpoints(arg: string): void;
    /** Алиас `setBreakpoints` (исторический). */
    decorateBreakpoints(arg: string): void;
    /** Получить точки останова как JSON-строку `IPublicBreakpoint[]`. */
    getBreakpoints(arg?: string): string;
    /** Переключить точку останова в указанной строке. */
    toggleBreakpoint(lineNumber?: number, codeWidget?: string): void;

    // === Команды и события ===

    /** Зарегистрировать команды из JSON-массива `IPublicVanessaCommand[]`. */
    addCommands(arg: string): void;
    /** Получить список поддерживаемых действий Monaco как JSON `IPublicVanessaAction[]`. */
    getActions(): string;
    /** Послать произвольное событие на сторону 1С. */
    fireEvent(event: any, arg?: any): void;

    // === Стиль строк и стек ===

    /** Декорировать строку (bold/italic/underline). */
    setLineStyle(lines: any, widget: string, bold: boolean, italic: boolean, underline: boolean): void;
    /** Очистить стиль строк. */
    clearLinesStyle(): void;
    /** Установить состояние «стек» в строке. */
    setStackStatus(status: boolean, lineNumber: number): void;
    /** Получить состояние «стек» в строке. */
    getStackStatus(lineNumber: number): boolean;
    /** Очистить состояния «стек». */
    clearStackStatus(): void;

    // === Codicons (иконки в маржине) ===

    /** Установить codicon для строки. */
    setLineCodicon(arg: string, codicon: string): void;
    /** Получить codicons строки (массив для всех виджетов на строке). */
    getLineCodicon(lineNumber: number): string[];
    /** Очистить codicons. */
    clearCodicons(): void;

    // === Виджеты и проблемы ===

    /** Получить виджеты строки как JSON. */
    getLineWidgets(lineNumber: number): string;
    /** Получить все виджеты как JSON. */
    getWidgets(): string;
    /** Получить строку, на которой висит subcode-виджет. */
    getWidgetLine(codeWidget: string): number;
    /** Декорировать проблемы (warnings/errors) из JSON. */
    decorateProblems(arg: string): void;
    /** Получить ошибки синтаксиса как JSON. */
    getSyntaxErrors(): string;

    // === Опции редактора ===

    /** Только для чтения. */
    setReadOnly(arg: boolean): void;
    /** Включить дебаггер-инфраструктуру. */
    useDebugger(value: boolean): void;
    /** Показать/скрыть minimap. */
    showMinimap(value: boolean): void;
    /** Задержка появления hover-подсказки в мс. */
    setHoverDelay(value: number): void;
    /** Размер табуляции. */
    setTabSize(arg: number): void;
    /** Использовать пробелы вместо табов. */
    setInsertSpaces(arg: boolean): void;
    /** Автоопределение отступов. */
    setDetectIndentation(arg: boolean): void;
    /** Ширина suggest-widget'а (CSS-значение). */
    setSuggestWidgetWidth(arg: string | number): void;

    // === Прочее ===

    /** Вставить текст в позицию курсора. */
    insertText(text: string, arg?: string): void;
    /** Нормализовать отступы. */
    normalizeIndentation(): void;
    /** Прогнать проверку синтаксиса. */
    checkSyntax(): void;
    /** Показать всплывающее сообщение под курсором. */
    showMessage(arg: string): void;
  }

  /**
   * Редактор сравнения двух файлов. Доступен глобально как
   * `window.VanessaDiffEditor` после `createVanessaDiffEditor()`.
   */
  interface IPublicVanessaDiffEditor extends IPublicVanessaEditorBase {
    /** Загрузить два варианта. */
    setValue(oldValue: string, oldFile: string, newValue: string, newFile: string): void;
    /** Установить тему. */
    setTheme(theme: string): void;
    /** Только для чтения. */
    setReadOnly(arg: boolean): void;
    /** Side-by-side или inline. */
    setSideBySide(value: boolean): void;
    /** Послать событие в 1С. */
    fireEvent(event: any, arg?: any): void;
    /** Можно ли переходить к следующему/предыдущему отличию. */
    canNavigate(): boolean;
    /** Переход к предыдущему отличию. */
    previous(): void;
    /** Переход к следующему отличию. */
    next(): void;
    /** Событие Ctrl+S. */
    onFileSave(): void;
  }

  /** Простой markdown/HTML вьюер. */
  interface IPublicVanessaViwer extends IPublicVanessaEditorBase {
    saveScroll(): void;
    restoreScroll(): void;
  }

  /**
   * Многооконный интерфейс с вкладками. Доступен глобально как
   * `window.VanessaTabs` после `createVanessaTabs()`.
   */
  interface IPublicVanessaTabs {
    /** Открыть/получить редактор по ключу. */
    /**
     * Открыть/получить редактор. Возвращает базовый интерфейс редактора —
     * для доступа к полной поверхности (setBreakpoints/addCommands/…) используйте
     * приведение `as IPublicVanessaEditor` или глобальный `window.VanessaEditor`.
     */
    edit(
      content: string,
      filename: string,
      filepath: string,
      title: string,
      encoding?: number,
      readOnly?: boolean,
      newTab?: boolean
    ): IPublicVanessaEditorBase;
    /** Открыть diff-вкладку. */
    diff(
      original: string,
      originalFile: string,
      originalTitle: string,
      modified: string,
      modifiedFile: string,
      modifiedTitle: string,
      modifiedPath: string,
      encoding?: number,
      readOnly?: boolean,
      newTab?: boolean
    ): IPublicVanessaEditorBase;
    /** Открыть вкладку-вьюер. */
    view(name: string, filename: string, fullName: string, text: string): IPublicVanessaEditorBase;
    /** Показать welcome-страницу. */
    welcome(title: string, params: string): IPublicVanessaEditorBase;
    /** Найти существующую вкладку по ключу. */
    find(original?: string, modified?: string): IPublicVanessaEditorBase | undefined;
    /** Закрыть все вкладки. */
    closeAll(): void;
    /** Закрыть текущую вкладку. */
    close(): void;
    /** Кол-во открытых вкладок. */
    count(): number;
    /** Вкладка по индексу. */
    tab(index: number): any;
    /** Выбрать вкладку по индексу. */
    select(index: number): void;
    /** Текущая активная вкладка. */
    current: any;
    /** Текущий редактор. */
    editor: IPublicVanessaEditorBase;
    /** Текущий diff-редактор (если активна diff-вкладка). */
    diffEditor: IPublicVanessaDiffEditor;
    /** Активная вкладка — diff? */
    isDiffEditor: boolean;
    /** Активная вкладка — обычный редактор? */
    isCodeEditor: boolean;
    /** Активная вкладка — viewer? */
    isMarkdownViwer: boolean;
    /** Можно ли переходить к следующему/предыдущему diff. */
    canNavigateDiff(): boolean;
    /** Переход к предыдущему diff. */
    previousDiff(): void;
    /** Переход к следующему diff. */
    nextDiff(): void;
    /** Тема (`vs`, `vs-dark` и т.д.). */
    theme: string;
    /** Версия VAEditor. */
    readonly version: string;
    /** Опции редактора (Monaco IEditorOptions) как JSON-строка. */
    options: string;
    /** Включить проверку синтаксиса. */
    enableSyntaxCheck: boolean;
    /** Рендеринг пробелов. */
    renderWhitespace: PublicWhitespaceType;
    /** Показывать minimap. */
    showMinimap: boolean;
    /** Послать команду Monaco. */
    trigger(source: string, handlerId: string, payload?: any): void;
    /** Контекстное меню вкладки. */
    showContextMenu(): void;
    /** Координаты позиции в DOM-пикселях (left/top + размеры окна). */
    getCoordinates(lineNumber: number, column: number): {
      left: number;
      top: number;
      lineHeight: any;
      windowWidth: number;
      windowHeight: number;
    } | undefined;
    /** Прямоугольник выделения в DOM-пикселях. */
    getRectangle(
      startLineNumber: number,
      startColumn: number,
      endLineNumber: number,
      endColumn: number
    ): {
      left: number;
      top: number;
      right: number;
      bottom: number;
      height: number;
      width: number;
      windowWidth: number;
      windowHeight: number;
    } | undefined;
    /** Ширина suggest-widget'а. */
    setSuggestWidgetWidth(arg: string | number): void;
    /** Очистить hidden-редакторы (внутренний кеш закрытых вкладок). */
    disposeHidden(): void;
    /** Сохранить scroll-позицию viewer'а. */
    saveViewScroll(): void;
    /** Освободить все ресурсы. */
    dispose(): void;
  }

  /**
   * Провайдер языка Gherkin. Доступен глобально как `window.VanessaGherkinProvider`.
   * Принимает справочники ключевых слов и шагов, поставляемых 1С через `setStepList`, `setKeywords` и пр.
   */
  interface IPublicVanessaGherkinProvider {
    /** Текущая локаль. */
    readonly locale: string;
    /** Установить keywords из JSON. */
    setKeywords(arg: string): void;
    /** Установить директивы препроцессора (`Если`/`КонецЕсли` и пр.) из JSON `ISpprDirect`. */
    setDirectives(arg: string): void;
    /** Установить парные ключевые слова (`IPublicKeyPairs`) из JSON. */
    setKeypairs(arg: string): void;
    /** Установить мета-теги (`try`/`except`) из JSON-массива. */
    setMetatags(arg: string): void;
    /** Включить режим СППР (директивы препроцессора). */
    setSPPR(arg: boolean): void;
    /** Установить локализованные сообщения. */
    setMessages(arg: string): void;
    /** Установить список импортов из JSON. */
    setImports(arg: string): void;
    /** Установить переменные (для inplace-подсказок). */
    setVariables(values: string, clear?: boolean): void;
    /** Установить элементы. */
    setElements(values: string, clear?: boolean): void;
    /** Установить список шагов из JSON. */
    setStepList(list: string, clear?: boolean): void;
    /** Установить ссылки ошибок из JSON `IPublicVanessaAction[]`. */
    setErrorLinks(arg: string): void;
    /** Ширина suggest-widget'а. */
    setSuggestWidgetWidth(arg: string | number): void;
  }

  // === Глобальные конструкторы и объекты на window ===

  interface Window {
    /** Создать многооконный интерфейс с вкладками. */
    createVanessaTabs(): IPublicVanessaTabs;
    /** Создать простой редактор кода. */
    createVanessaEditor(content?: string, language?: string): IPublicVanessaEditor;
    /** Создать редактор сравнения двух файлов. */
    createVanessaDiffEditor(original?: string, modified?: string, language?: string): IPublicVanessaDiffEditor;

    /** Освободить все стандалон-экземпляры (tabs/editor/diff). */
    disposeVanessaAll(): void;
    disposeVanessaTabs(): void;
    disposeVanessaEditor(): void;
    disposeVanessaDiffEditor(): void;

    /** Включить дебаггер-инфраструктуру для всех табов. */
    useVanessaDebugger(value: boolean): void;
  }
}

export {};
