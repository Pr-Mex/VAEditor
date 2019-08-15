import { BreakpointManager } from "./debug";

export class VanessaEditor {

  public OnReceiveAction: Function;
  public editor: monaco.editor.IStandaloneCodeEditor;
  private breakpointManager: BreakpointManager;

  constructor() {
    this.OnReceiveAction = (action: string, arg: string) => this.onReceiveActionHandler(action, arg);

    this.editor = monaco.editor.create(document.getElementById("VanessaEditor"), {
      language: "turbo-gherkin",
      scrollBeyondLastLine: false,
      glyphMargin: true,
      automaticLayout: true
    });

    this.subscribeEditorEvents();
    this.breakpointManager = new BreakpointManager(this);
  }

  public dispose(): void {
    this.editor.dispose();
  }

  public SendAction(event: string, arg: any=undefined): void {
    // tslint:disable-next-line: no-console
    console.debug("SendAction: " + event + " : " + arg);

    let fakeButtonFireClickEvent: HTMLButtonElement = document.getElementById("VanessaEditorEventForwarder") as HTMLButtonElement;
    fakeButtonFireClickEvent.title = event;
    fakeButtonFireClickEvent.value = arg;
    fakeButtonFireClickEvent.click();
  }

  private onReceiveActionHandler(action: string, arg: string): any {
    // tslint:disable-next-line: no-console
    console.debug("OnReceiveAction: " + action + " : " + arg);

    switch (action) {
      case "setContent":
        this.editor.setValue(arg);
        return undefined;
      case "getContent":
        return this.editor.getValue();
      case "revealLine":
        this.editor.revealLine(Number.parseInt(arg, 10));
        return undefined;
      case "enableEdit":
        this.editor.updateOptions({
          readOnly: false
        });
        return undefined;
      case "disableEdit":
        this.editor.updateOptions({
          readOnly: true
        });
        return undefined;
      case "decorateBreakpoints":
        this.breakpointManager.DecorateBreakpoints(JSON.parse(arg));
        return undefined;
      default:
    }
  }

  private subscribeEditorEvents(): void {
    this.editor.addCommand(monaco.KeyCode.F5,
      () => this.SendAction("START_DEBUGGING")
    );

    // tslint:disable-next-line: no-bitwise
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F5,
      () => this.SendAction("START_DEBUGGING_AT_STEP", this.editor.getPosition().lineNumber)
    );

    // tslint:disable-next-line: no-bitwise
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.F5,
      () => this.SendAction("START_DEBUGGING_AT_STEP_AND_CONTINUE", this.editor.getPosition().lineNumber));

    // tslint:disable-next-line: no-bitwise
    this.editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.F5,
      () => this.SendAction("START_DEBUGGING_AT_ENTRY")
    );

    this.editor.addCommand(monaco.KeyCode.F11,
      () => this.SendAction("STEP_OVER", this.editor.getPosition().lineNumber)
    );

    this.editor.onDidChangeModelContent(
      () => this.SendAction("CONTENT_DID_CHANGE")
    );
  }
}
