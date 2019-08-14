import * as monaco from "monaco-editor";
import "./languages/turbo-gherkin.contribution";
import "./1c-webkit-scrollbar-patch";
import "./breakpoint.css";

// worker loader

// tslint:disable-next-line: no-string-literal
window["MonacoEnvironment"] = {
  getWorkerUrl: function (moduleId: any, label: any): void {
    // tslint:disable-next-line: max-line-length
    return require("blob-url-loader?type=application/javascript!compile-loader?target=worker&emit=false!monaco-editor/esm/vs/editor/editor.worker");
  }
};

// feature editor

var editor: monaco.editor.IStandaloneCodeEditor = monaco.editor.create(document.getElementById("container"), {
  language: "turbo-gherkin",
  scrollBeyondLastLine: false,
  glyphMargin: true,
  automaticLayout: true
});

var model: monaco.editor.ITextModel = editor.getModel();

class VanessaEditorProxy {
  public SendAction(event: string, arg: any=undefined): void {
    // tslint:disable-next-line: no-console
    console.debug("SendAction: " + event + " : " + arg);

    let interaction: HTMLButtonElement = document.getElementById("VanessaEditorEventForwader") as HTMLButtonElement;
    interaction.title = event;
    interaction.value = arg;
    interaction.click();
  }

  public OnReceiveAction(action: string, arg: string): any {
    // tslint:disable-next-line: no-console
    console.debug("OnReceiveAction: " + action + " : " + arg);

    switch (action) {
      case "setContent":
        editor.setValue(arg);
        return undefined;
      case "getContent":
        return editor.getValue();
      case "revealLine":
        editor.revealLine(Number.parseInt(arg, 10));
        return undefined;
      case "enableEdit":
        editor.updateOptions({
          readOnly: false
        });
        return undefined;
      case "disableEdit":
        editor.updateOptions({
          readOnly: true
        });
        return undefined;
      case "decorateBreakpoints":
        decorateBreakpoints(JSON.parse(arg));
        return undefined;
      default:
    }
  }
}

var VanessaEditor: VanessaEditorProxy = new VanessaEditorProxy;


editor.addCommand(monaco.KeyCode.F5, function (): void {
  VanessaEditor.SendAction("START_DEBUGGING");
});

// tslint:disable-next-line: no-bitwise
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F5, function (): void {
  VanessaEditor.SendAction("START_DEBUGGING_AT_STEP", editor.getPosition().lineNumber);
});

// tslint:disable-next-line: no-bitwise
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.F5, function (): void {
  VanessaEditor.SendAction("START_DEBUGGING_AT_STEP_AND_CONTINUE", editor.getPosition().lineNumber);
});

// tslint:disable-next-line: no-bitwise
editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.F5, function (): void {
  VanessaEditor.SendAction("START_DEBUGGING_AT_ENTRY");
});

editor.addCommand(monaco.KeyCode.F9, function (): void {
  toggleBreakpoint(editor.getPosition().lineNumber);
});

editor.addCommand(monaco.KeyCode.F11, function (): void {
  VanessaEditor.SendAction("STEP_OVER", editor.getPosition().lineNumber);
});

editor.onDidChangeModelContent(function (): void {
  VanessaEditor.SendAction("CONTENT_DID_CHANGE");
});

editor.onMouseDown(function (e: monaco.editor.IEditorMouseEvent): void {
  breakpointOnMouseDown(e);
});

editor.onMouseMove(function (e: monaco.editor.IEditorMouseEvent): void {
  breakpointsOnMouseMove(e);
});

model.onDidChangeDecorations(function (e: monaco.editor.IModelDecorationsChangedEvent): void {
  breakpointOnDidChangeDecorations();
});

// breakpoints

var breakpointList: { id: string, range: monaco.IRange, enable: boolean, verified: boolean }[] = [];
var breakpointDecorationIds: string[] = [];
var breakpointHintDecorationIds: string[] = [];
var breakpointUnverifiedDecorationIds: string[] = [];
var checkBreakpointChangeDecorations: boolean = true;

function decorateBreakpoints (breakpoints: { enable: boolean; }[]): void {
  const decorations: monaco.editor.IModelDeltaDecoration[] = [];
  breakpoints.forEach((breakpoint: { lineNumber: number; enable: boolean; }) => {
    decorations.push({
      range: new monaco.Range(breakpoint.lineNumber, 1, breakpoint.lineNumber, 1),
      options: {
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        glyphMarginClassName: breakpoint.enable ? "debug-breakpoint-glyph" : "debug-breakpoint-disabled-glyph"
      }
    });
  });

  checkBreakpointChangeDecorations = false;
  breakpointDecorationIds = editor.deltaDecorations(breakpointDecorationIds, decorations);
  breakpointUnverifiedDecorationIds = editor.deltaDecorations(breakpointUnverifiedDecorationIds, []);
  checkBreakpointChangeDecorations = true;

  breakpointList = breakpointDecorationIds.map((id, index) => ({
    id: id,
    range: decorations[index].range,
    enable: breakpoints[index].enable,
    verified: true
  }));
}

function breakpointsOnMouseMove (e: monaco.editor.IEditorMouseEvent): void {
  const decorations: monaco.editor.IModelDeltaDecoration[] = [];
  if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
    const lineNumber: number = e.target.position.lineNumber;
    if (breakpointIndexByLineNumber(lineNumber) === -1) {
      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          glyphMarginClassName: "debug-breakpoint-hint-glyph"
        }
      });
    }
  }
  breakpointHintDecorationIds = editor.deltaDecorations(breakpointHintDecorationIds, decorations);
}

function breakpointOnDidChangeDecorations (): void {
  if (!checkBreakpointChangeDecorations) {
    return;
  }
  let somethingChanged: boolean = false;
  breakpointList.forEach(breakpoint => {
    if (somethingChanged) {
      return;
    }
    if (!breakpoint.verified) {
      return;
    }
    const newBreakpointRange: monaco.Range = model.getDecorationRange(breakpoint.id);
    if (newBreakpointRange && (!(breakpoint.range as monaco.Range).equalsRange(newBreakpointRange))) {
      somethingChanged = true;
    }
  });
  if (somethingChanged) {
    updateBreakpoints();
  }
}

function breakpointOnMouseDown (e: monaco.editor.IEditorMouseEvent): void {
  if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
    toggleBreakpoint(e.target.position.lineNumber);
  }
}

function toggleBreakpoint (lineNumber: number): void {
  const breakpointIndex: number = breakpointIndexByLineNumber(lineNumber);
  if (breakpointIndex === -1) {
    checkBreakpointChangeDecorations = false;
    breakpointHintDecorationIds = editor.deltaDecorations(breakpointHintDecorationIds, []);
    breakpointUnverifiedDecorationIds = editor.deltaDecorations(breakpointUnverifiedDecorationIds, [{
      range: new monaco.Range(lineNumber, 1, lineNumber, 1),
      options: {
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        glyphMarginClassName: "debug-breakpoint-unverified-glyph"
      }
    }]);
    checkBreakpointChangeDecorations = true;
    breakpointList.push({
      id: breakpointUnverifiedDecorationIds[0],
      range: new monaco.Range(lineNumber, 1, lineNumber, 1),
      enable: true,
      verified: false
    });
  } else {
    breakpointList.splice(breakpointIndex, 1);
  }
  setTimeout(updateBreakpoints, 100);
}

function updateBreakpoints (): void {
  const breakpointPacket: {lineNumber: number, enable: boolean}[] = [];
  breakpointList.forEach(breakpoint => {
    const range: monaco.Range = model.getDecorationRange(breakpoint.id);
    if (range !== null) {
      const breakpointFound: Boolean = breakpointPacket.find(breakpointChunk =>
        (breakpointChunk.lineNumber === range.startLineNumber)) !== undefined;
      if (!breakpointFound) {
        breakpointPacket.push({
          lineNumber: range.startLineNumber,
          enable: breakpoint.enable
        });
      }
    }
  });
  VanessaEditor.SendAction("UPDATE_BREAKPOINTS", JSON.stringify(breakpointPacket));
}

function breakpointIndexByLineNumber (lineNumber: any): number {
  return breakpointList.findIndex(breakpoint => (breakpoint.range.startLineNumber === lineNumber));
}

// tslint:disable-next-line: no-string-literal
window["VanessaEditorOnReceiveAction"] = VanessaEditor.OnReceiveAction;
