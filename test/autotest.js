import "../node_modules/mocha/mocha.css";
import * as dom from 'monaco-editor/esm/vs/base/browser/dom';
document.body.appendChild(dom.$("div", { id: "mocha" }));

mocha.setup('bdd');
const context = require.context(".", true, /.+\.ts$/ );
context.keys().forEach(context);

const autotest = () => {
  var runner = mocha.run();
  var failedTests = [];

  runner.on('end', function () {
    window.mochaResults = runner.stats;
    window.mochaResults.reports = failedTests;
  });

  runner.on('fail', logFailure);

  function logFailure(test, err) {
    var flattenTitles = function (test) {
      var titles = [];
      while (test.parent.title) {
        titles.push(test.parent.title);
        test = test.parent;
      }
      return titles.reverse();
    };

    failedTests.push({
      name: test.title,
      result: false,
      message: err.message,
      stack: err.stack,
      titles: flattenTitles(test)
    });
  };

  delete window['VanessaAutotest'];
};

if (process.argv.mode === 'autotest') {
  window.onload = autotest;
} else {
  window['VanessaAutotest'] = autotest;
}
