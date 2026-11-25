import { IWorkerContext, IWorkerModel, VAToken } from "./common";
import { KeywordMatcher } from "./matcher";
import { VAWordType, VAStepLine } from "./stepline";
import type { VAStepWord } from "./stepline";
import type { VAStepData } from "./steplist";

let imports = {};

interface IToken {
  text: string;
}

interface IImportedItem {
  name: string;
  value?: IToken;
  table?: {
    head: { tokens: IToken[] };
    body: Array<{ tokens: IToken[] }>;
  };
  lines?: {
    lines: IToken[];
  };
}

interface IImportedFile {
  name: string;
  path: string;
  items: Array<IImportedItem>;
}

export function setImports(values: string) {
  let result = {};
  let array = JSON.parse(values) as Array<IImportedFile>;
  array.forEach(file => {
    let data = result[file.name] = { "": {} };
    file.items.forEach(item => {
      const key = (item.name || "").toLowerCase();
      if (item.value) {
        data[""][key] = { key: item.name, name: item.value.text, file: file.path };
      } else if (item.lines) {
        const text = item.lines.lines.map(w => w.text).join('\n');
        data[""][key] = { key: item.name, name: text, file: file.path };
      } else if (item.table) {
        if (key) data[key] = {};
        const columns = item.table.head.tokens.map(e => e.text);
        item.table.body.forEach(row => {
          const t = row.tokens;
          const i = (t[0].text || "").toLowerCase();
          let x = data[key][i] = { key: t[0].text, name: t[1].text, file: file.path, data: {} };
          for (let col = 0; col < columns.length; col++)
            x.data[columns[col]] = t[col].text;
        });
      }
    })
  });
  imports = result;
}

function trimQuotes(w: string) {
  return w.replace(/^["'](.*)["']$/, '$1');
}

function getLinks(
  matcher: KeywordMatcher,
  model: IWorkerModel,
  position: { lineNumber: number, lineCount: number }
) {
  let links_reg = new RegExp(matcher.section.variables);
  let import_reg = new RegExp(matcher.import.source + "(.+)");
  for (let lineNumber = 1; lineNumber <= position.lineCount - 1; lineNumber++) {
    let line: string = model.getLineContent(lineNumber);
    if (line.match(links_reg)) {
      let matches = undefined;
      let tableName = "";
      let columns = null;
      let links = { "": {} };
      let multiline = false;
      let multitext = "";
      let multidata = {};
      for (let i = lineNumber + 1; i <= position.lineCount; i++) {
        let line: string = model.getLineContent(i);
        if (/^\s*""".*$/.test(line)) { if (multiline = !multiline) multitext = ""; continue; }
        if (multiline) { multitext += (multitext == "" ? "" : "\n") + line; multidata["name"] = multitext; continue; }
        if (line.match(/^\s*\|/)) {
          // disjoint-альтернация (как в getHiperlinks): без квантифицированных
          // перекрывающихся групп ('(\\'|[^'])*), которые роняют старый YARR
          // WebKit 1С в рекурсию на длинной строке → нативный stack overflow.
          let match = line.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s\|][^\|]*[^\s\|]|[^\s\|]/g);
          if (match === null) continue;
          if (columns === null) {
            columns = match.map(trimQuotes);
          } else {
            const mt = match.map(trimQuotes);
            while (mt.length < columns.length) mt.push("");
            let row = { key: mt[0], name: mt[1], data: {} };
            for (let col = 0; col < columns.length; col++) row.data[columns[col]] = mt[col];
            if (links[tableName] == undefined) links[tableName] = {};
            links[tableName][mt[0].toLowerCase()] = row;
          }
        } else if ((matches = line.match(/^\s*([A-Za-zЀ-ӿ][A-Za-z0-9Ѐ-ӿ]*)\s*=\s*(.*)\s*$/)) != null) {
          tableName = "";
          columns = null;
          multidata = {};
          let key = matches[1].toLowerCase();
          let value = matches[2].trim();
          if (links[tableName] == undefined) links[tableName] = {};
          multidata = links[tableName][key] = { key: key, name: value };
        } else if ((matches = line.match(import_reg)) !== null) {
          tableName = "";
          columns = null;
          multidata = {};
          let filename = trimQuotes(matches[3].trim()).toLowerCase();
          let vars = imports[filename];
          if (vars) {
            Object.keys(vars[""]).forEach(key => { links[""][key] = vars[""][key] });
            Object.keys(vars).forEach(key => { if (key) links[key] = vars[key] });
          }
        } else if (line.match(/^\s*(#|@|\/\/)/)) {
          continue;
        } else if ((matches = line.match(/^\s*\*/)) !== null) {
          tableName = line.substr(matches[0].length).trim().toLowerCase();
        } else if (matcher.isSection(line)) {
          position.lineNumber = i;
          return links;
        } else {
          if (columns) tableName = "";
          columns = null;
          multidata = {};
        }
      }
    }
  }
  position.lineNumber = position.lineCount;
  return {};
}

export function getLinkData(
  ctx: IWorkerContext,
  model: IWorkerModel,
  msg: { key: string }
) {
  const lineCount = model.getLineCount();
  let position = { lineNumber: 1, lineCount: lineCount };
  let words = msg.key.split(".").map((w: string) => w.toLowerCase());
  let links = getLinks(ctx.matcher, model, position);
  let data = (table: string, row: string, col: string = undefined): any => {
    if (links[table] && links[table][row]) {
      let obj = links[table][row];
      if (col) obj["column"] = col;
      obj["table"] = table;
      obj["param"] = msg.key;
      return obj;
    } else if (col == undefined) return data("", table, row);
  }
  switch (words.length) {
    case 1: return data("", words[0]);
    case 2: return data(words[0], words[1]);
    case 3: return data(words[0], words[1], words[2]);
  }
}

// Возвращает текст шага внутри строки условия "Если <шаг> тогда"
// и позицию этого текста в исходной строке.
function getConditionStep(
  ctx: IWorkerContext,
  line: string,
): { text: string; start: number } {
  const keypairs = ctx.matcher.keypairs;
  if (!keypairs) return undefined;
  for (const regexp of keypairs) {
    const match = line.match(regexp);
    if (match === null) continue;
    const text = match[2];
    if (!text) continue;
    // Группа 1 содержит текст шага (group 2) и завершающий пробел,
    // поэтому берём последнее вхождение group 2 — оно и есть текст шага.
    const start = (match.index || 0) + match[1].lastIndexOf(text);
    if (start < 0) continue;
    return { text, start };
  }
  return undefined;
}

// Возвращает позиции (0-based индексы открывающих кавычек) параметров-макетов
// в строке шага. 1С присылает в реестре шагов номера таких параметров; ссылку
// получает только сам параметр, а не совпавшее по тексту значение в другом месте.
function getMxlParameterStarts(
  ctx: IWorkerContext,
  model: IWorkerModel,
  lineNumber: number,
  line: string,
): Record<number, boolean> {
  const result: Record<number, boolean> = {};
  if (line.indexOf('"') < 0 && line.indexOf("'") < 0) return result;
  const token = model.getLineToken(lineNumber);
  if (!token || token.token !== VAToken.Operator) return result;

  let step: VAStepData = undefined;
  let parameters: VAStepWord[] = undefined;

  if (ctx.matcher.step && ctx.matcher.step.test(line)) {
    const stepLine = new VAStepLine(ctx.matcher, line);
    if (!stepLine.invalid) {
      step = ctx.steplist[stepLine.snippet];
      if (step) parameters = stepLine.parameters;
    }
  }

  if (!step) {
    // Строка условия: шаг может быть зарегистрирован как целиком
    // ("Если ... тогда"), так и обычным шагом без "тогда".
    const condition = getConditionStep(ctx, line);
    if (!condition) return result;
    step = ctx.steplist[ctx.matcher.getSnippet(condition.text)];
    if (!step) step = ctx.steplist[ctx.matcher.getSnippet(line)];
    if (!step) return result;
    parameters = VAStepLine.parseWords(ctx.matcher, condition.text, condition.start)
      .filter(word => word.type === VAWordType.Numerical || word.type === VAWordType.Parameter);
  }

  if (!parameters) return result;
  const params = step.params;
  if (!params || !Array.isArray(params)) return result;
  params.forEach(index => {
    if (index === null || index === undefined) return;
    if (String(index).trim() === "") return;
    const paramIndex = Number(index);
    if (!isFinite(paramIndex)) return;
    if (paramIndex < 0 || paramIndex >= parameters.length) return;
    const word = parameters[paramIndex];
    // Ссылкой может стать только значение в кавычках.
    if (word.type !== VAWordType.Parameter) return;
    const text = word.text.substring(1, word.text.length - 1);
    if (text.length === 0) return;
    const first = text.charAt(0);
    const last = text.charAt(text.length - 1);
    if ((first === "<" && last === ">") || (first === "[" && last === "]")) return;
    result[word.start] = true;
  });
  return result;
}

export function getHiperlinks(
  ctx: IWorkerContext,
  model: IWorkerModel,
  msg: {},
): monaco.languages.ILinksList {
  const lineCount = model.getLineCount();
  let result = [];
  let pos = { lineNumber: 1, lineCount: lineCount };
  let links = getLinks(ctx.matcher, model, pos);
  // disjoint-альтернация вместо backreference+lookahead (\1 + (?!\1)): прежняя
  // пара снимала паттерн с YARR-JIT в рекурсивный интерпретатор старого WebKit 1С,
  // где глубина рекурсии ∝ длине строки → нативный stack overflow (AV 0xc0000005)
  // на длинной строке (напр. актуализированный макет). disjoint-вариант JIT-able
  // (итеративный, без рекурсии); matches[0]/.index/lastIndex идентичны прежнему.
  let pattern = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/;
  for (var lineNumber = 1; lineNumber <= pos.lineCount; lineNumber++) {
    let matches = undefined;
    let regexp = new RegExp(pattern.source, "g");
    let line: string = model.getLineContent(lineNumber);
    const mxlStarts = getMxlParameterStarts(ctx, model, lineNumber, line);
    while ((matches = regexp.exec(line)) !== null) {
      let range = {
        startLineNumber: lineNumber,
        startColumn: matches.index + 2,
        endLineNumber: lineNumber,
        endColumn: regexp.lastIndex
      };
      let param = matches[0].substring(1, matches[0].length - 1);
      let e1cib = /^e1cib\/\S+$/;
      if (mxlStarts[matches.index]) {
        // В фиче кавычка внутри значения удваивается обратным слешем.
        const mxlName = param.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
        result.push({ range: range, url: "vamxl:" + mxlName });
      } else if (e1cib.test(param)) {
        result.push({ range: range, url: trimQuotes(matches[0]) });
      } else if (lineNumber > pos.lineNumber) {
        let pattern = /^([A-Za-zЀ-ӿ][A-Za-z0-9Ѐ-ӿ]*)(\.[A-Za-zЀ-ӿ][A-Za-z0-9Ѐ-ӿ]*)*$/;
        let add = (table: string, row: string, col: string = undefined): any => {
          if (links[table] && links[table][row]) {
            let obj = links[table][row];
            let text = obj.name;
            if (col) Object.keys(obj.data).forEach((key: string) => {
              if (key.toLowerCase() == col) text = obj.data[key];
            });
            result.push({ range: range, tooltip: text, url: "link:" + param });
          } else if (col == undefined) add("", table, row);
        }
        if (pattern.test(param)) {
          let words = param.split(".").map((w: string) => w.toLowerCase());
          switch (words.length) {
            case 1: add("", words[0]); break;
            case 2: add(words[0], words[1]); break;
            case 3: add(words[0], words[1], words[2]); break;
          }
        }
      }
    }
  }
  return { links: result };
}