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
  provideCompletionItems: function (model, position) {
    return {
      suggestions: window["VanessaGherkinProvider"].getSuggestions(model, position),
    };
  }
});

monaco.languages.registerHoverProvider(language.id, {
  provideHover: function (model, position) {
    let line = model.getLineContent(position.lineNumber)
    return {
      range: {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: model.getLineMinColumn(position.lineNumber),
        endColumn: model.getLineMaxColumn(position.lineNumber),
      },
      contents: window["VanessaGherkinProvider"].getHoverContents(line),
    }
  }
});
