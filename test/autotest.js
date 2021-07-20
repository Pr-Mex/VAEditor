import "../node_modules/mocha/mocha.css";
import * as dom from 'monaco-editor/esm/vs/base/browser/dom';
document.body.appendChild(dom.$("div", { id: "mocha" }));

mocha.setup('bdd');

const context = require.context("../test", true, /.+\.ts$/ );

// Require each within build
context.keys().forEach(context);

window.onload = function () {
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
};
