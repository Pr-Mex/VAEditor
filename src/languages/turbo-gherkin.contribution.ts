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

monaco.languages.registerCodeActionProvider(language.id + "-", {
  provideCodeActions: (
      model /**ITextModel*/,
      range /**Range*/,
      context /**CodeActionContext*/,
      token /**CancellationToken*/
  ) => {
      console.log(context);
      const actions = context.markers.map(error => {
          return {
              title: `Example quick fix`,
              diagnostics: [error],
              kind: "quickfix",
              edit: {
                  edits: [
                      {
                          resource: model.uri,
                          edits: [
                              {
                                  range: error,
                                  text: "This text replaces the text with the error"
                              }
                          ]
                      }
                  ]
              },
              isPreferred: true
          };
      });
      return actions;
      return [{
        title: `Example quick fix`,
        actions: actions,
      }]
  }
});