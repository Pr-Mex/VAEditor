interface ILangImpl {
  conf: monaco.languages.LanguageConfiguration;
  language: monaco.languages.IMonarchLanguage;
}

const language: monaco.languages.ILanguageExtensionPoint = { id: "turbo-gherkin" };

monaco.languages.register(language);
monaco.languages.onLanguage(language.id, () => {
  import("./turbo-gherkin").then((module: ILangImpl) => {
    monaco.languages.setLanguageConfiguration(language.id, module.conf);
    monaco.languages.setMonarchTokensProvider(language.id, module.language);
  });
});

monaco.languages.registerCompletionItemProvider(language.id, {
  provideCompletionItems: (model, position) =>
    window["VanessaGherkinProvider"].getSuggestions(model, position)
});

monaco.languages.registerHoverProvider(language.id, {
  provideHover: (model, position) =>
    window["VanessaGherkinProvider"].getHoverContents(model, position)
});

monaco.languages.registerCodeActionProvider(language.id, {
  provideCodeActions: (model, range, context, token) =>
    window["VanessaGherkinProvider"].getCodeAction(model, range, context, token)
});

monaco.languages.registerCodeLensProvider(language.id, {
  provideCodeLenses: function (model, token) {
    let result = [];
    window["VanessaEditor"].codeLens.forEach((e: any) => {
      model.getLinesDecorations(1, model.getLineCount()).forEach(d => {
        if (d.options.className == "debug-error-step") {
          result.push({
            range: d.range,
            command: {
              id: e.id,
              title: e.title,
              arguments: [d.range.startLineNumber],
            }
          });
        }
      });
    });
    return result;
  },
  resolveCodeLens: function (model, codeLens, token) {
    return codeLens;
  }
});
