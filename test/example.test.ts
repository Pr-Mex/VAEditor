let assert = require('assert');
let expect = require('chai').expect;
import * as monaco from 'monaco-editor';

describe('Array', function () {
  describe('Monaco editor: Model', function () {
    it('Содержимое файла', function () {
      assert.strictEqual([1, 2, 3].indexOf(4), -1)
      let model = monaco.editor.createModel('test');
      let value = model.getValue();
      assert.deepEqual(value, 'test');
    })
    it('Ошибочный тест', function () {
      assert.strictEqual([1, 2, 3].indexOf(4), -1)
      let model = monaco.editor.createModel('test');
      let value = model.getValue();
      assert.deepEqual(value, 'test1');
    })
  })
})

describe('Options tests', () => { // the tests container
  it('checking default options', () => { // the single test
    expect(false).to.be.false; // Do I need to explain anything? It's like writing in English!
    expect(30).to.equal(30); // As I said 3 lines above
    expect([]).to.be.empty; // emitters property is an array and for this test must be empty, this syntax works with strings too
    expect({ value: "#fff" }).to.be.an("object").to.have.property("value").to.equal("#fff"); // this is a little more complex, but still really clear
    console.log(monaco.editor.createModel(''));
  });
});
