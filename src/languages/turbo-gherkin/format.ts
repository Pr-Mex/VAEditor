import { IWorkerContext, IWorkerModel } from './common';
import { KeywordMatcher } from './matcher';

// Форматирование фичи: выравнивание pipe-таблиц, нормализация отступов и
// символа комментария (#2044, #1630, #1452).
//
// Всё здесь — чистые функции над массивом строк: ни Monaco, ни воркера.
// Форматтер не добавляет и не удаляет строки, поэтому идемпотентен по
// построению: повторный прогон на своём же результате ничего не меняет.

export interface VAFormatOptions {
  tabSize: number;
  insertSpaces: boolean;
  commentCharacter: string;
  alignTables: boolean;
  normalizeComments: boolean;
}

export const DEFAULT_FORMAT_OPTIONS: VAFormatOptions = {
  tabSize: 4,
  insertSpaces: false,
  commentCharacter: '#',
  alignTables: true,
  normalizeComments: true,
};

const enum LineKind {
  Empty,
  Section,
  Metatag,
  Comment,
  Directive,
  Multiline,
  TableRow,
  Step,
  Text,
}

const MULTILINE_FENCE = /^\s*"""/;
const COMMENT_MARKER = /^\s*(\/\/|#)/;
const DIRECTIVE_MARKER = /^\s*#[^\s#]/;

function classify(matcher: KeywordMatcher, line: string): LineKind {
  if (!line.trim()) return LineKind.Empty;
  // Директивы препроцессора (#Если/#КонецЕсли) начинаются с # так же, как
  // комментарии: порядок проверок здесь важен.
  if (matcher.directives && matcher.directives.all && matcher.directives.all.test(line)) return LineKind.Directive;
  if (COMMENT_MARKER.test(line)) return LineKind.Comment;
  if (DIRECTIVE_MARKER.test(line)) return LineKind.Directive;
  if (/^\s*@/.test(line)) return LineKind.Metatag;
  if (MULTILINE_FENCE.test(line)) return LineKind.Multiline;
  if (/^\s*\|/.test(line)) return LineKind.TableRow;
  if (matcher.isSection(line)) return LineKind.Section;
  if (matcher.step.test(line)) return LineKind.Step;
  return LineKind.Text;
}

// Ширина отступа в колонках: табуляция — до следующей позиции tabSize,
// пробел — один символ.
function indentWidth(line: string, tabSize: number): number {
  let width = 0;
  for (let i = 0; i < line.length; i++) {
    const char = line.charAt(i);
    if (char === '\t') width += tabSize - (width % tabSize);
    else if (char === ' ') width++;
    else break;
  }
  return width;
}

function indentDepth(line: string, tabSize: number): number {
  if (!tabSize) return 0;
  return Math.round(indentWidth(line, tabSize) / tabSize);
}

function makeIndent(depth: number, options: VAFormatOptions): string {
  if (depth <= 0) return '';
  const unit = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
  return unit.repeat(depth);
}

// Содержимое ячейки таблицы: обрезаем пробелы по краям, но не внутри.
// Разделитель `|` внутри кавычек разделителем не считается.
function splitCells(line: string): string[] {
  const cells: string[] = [];
  const text = line.trim();
  let current = '';
  let quote = '';
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    if (quote) {
      current += char;
      if (char === '\\' && i + 1 < text.length) {
        current += text.charAt(++i);
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  // Первая ячейка — пустая (до ведущего `|`), последняя — после замыкающего.
  if (cells.length && cells[0] === '') cells.shift();
  if (cells.length && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

function cellLength(cell: string): number {
  // Кириллица и эмодзи должны считаться по символам, а не по единицам UTF-16.
  return Array.from(cell).length;
}

function padCell(cell: string, width: number): string {
  const length = cellLength(cell);
  return length >= width ? cell : cell + ' '.repeat(width - length);
}

function alignTable(lines: string[], depth: number, options: VAFormatOptions): string[] {
  const rows = lines.map(splitCells);
  if (!rows.length) return lines;
  // Строка без единой ячейки (например, `||`) — не таблица, а разделитель:
  // выравнивать её нельзя, иначе разделитель превратится в пустую таблицу.
  if (rows.some(cells => cells.every(cell => !cell))) return lines;
  const columns = rows.reduce((max, cells) => Math.max(max, cells.length), 0);
  const widths: number[] = [];
  for (let i = 0; i < columns; i++) {
    widths.push(rows.reduce((max, cells) => Math.max(max, cellLength(cells[i] || '')), 0));
  }
  const indent = makeIndent(depth, options);
  return rows.map(cells => {
    const parts: string[] = [];
    for (let i = 0; i < columns; i++) parts.push(' ' + padCell(cells[i] || '', widths[i]) + ' ');
    return indent + '|' + parts.join('|') + '|';
  });
}

function normalizeComment(line: string, options: VAFormatOptions): string {
  if (!options.normalizeComments || !options.commentCharacter) return line;
  const match = line.match(/^(\s*)(\/\/|#)(.*)$/);
  if (!match) return line;
  const marker = options.commentCharacter;
  // Уже нужный маркер — не трогаем: иначе `##` в директивах поедет.
  if (match[2] === marker) return line;
  return match[1] + marker + match[3];
}

function prepareLine(
  line: string,
  kind: LineKind,
  depth: number,
  options: VAFormatOptions,
): string {
  const text = line.trim();
  if (kind === LineKind.Empty) return '';
  const indent = makeIndent(kind === LineKind.Section || kind === LineKind.Metatag ? 0 : depth, options);
  return indent + normalizeComment(text, options);
}

export function formatLines(
  matcher: KeywordMatcher,
  lines: string[],
  options: VAFormatOptions = DEFAULT_FORMAT_OPTIONS,
): string[] {
  const result: string[] = [];
  let inSection = false;
  let inMultiline = false;
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const kind = classify(matcher, line);

    // Содержимое многострочного параметра — данные, а не разметка:
    // отступы и пробелы внутри `"""` не нормализуем.
    if (inMultiline) {
      result.push(line);
      if (kind === LineKind.Multiline) inMultiline = false;
      index++;
      continue;
    }
    if (kind === LineKind.Multiline) {
      inMultiline = true;
      result.push(prepareLine(line, kind, indentDepth(line, options.tabSize), options));
      index++;
      continue;
    }

    if (kind === LineKind.TableRow && options.alignTables) {
      const group: string[] = [];
      while (index < lines.length && classify(matcher, lines[index]) === LineKind.TableRow) {
        group.push(lines[index++]);
      }
      const depth = indentDepth(group[0], options.tabSize);
      alignTable(group, Math.max(depth, inSection ? 1 : 0), options).forEach(row => result.push(row));
      continue;
    }

    if (kind === LineKind.Section) inSection = true;
    // Внутри секции строка не может стоять вплотную к левому краю: это
    // сбивает и свёртку, и группировку шагов.
    let depth = indentDepth(line, options.tabSize);
    if (inSection && kind !== LineKind.Section && kind !== LineKind.Metatag && depth < 1) depth = 1;
    result.push(prepareLine(line, kind, depth, options));
    index++;
  }
  return result;
}

export function formatDocument(
  matcher: KeywordMatcher,
  content: string[],
  options: VAFormatOptions = DEFAULT_FORMAT_OPTIONS,
): string[] {
  if (!matcher) return content.slice();
  return formatLines(matcher, content, options);
}

// Правки по строкам: неизменённые строки не попадают в результат, поэтому
// форматирование не сбрасывает выделение и не плодит историю undo.
export function getFormattingEdits(
  ctx: IWorkerContext,
  model: IWorkerModel,
  msg: { tabSize?: number, insertSpaces?: boolean },
): monaco.languages.TextEdit[] {
  const options: VAFormatOptions = {
    tabSize: msg.tabSize || DEFAULT_FORMAT_OPTIONS.tabSize,
    insertSpaces: msg.insertSpaces === undefined ? DEFAULT_FORMAT_OPTIONS.insertSpaces : msg.insertSpaces,
    commentCharacter: ctx.commentCharacter || DEFAULT_FORMAT_OPTIONS.commentCharacter,
    alignTables: DEFAULT_FORMAT_OPTIONS.alignTables,
    normalizeComments: DEFAULT_FORMAT_OPTIONS.normalizeComments,
  };
  const lineCount = model.getLineCount();
  const lines: string[] = [];
  for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
    lines.push(model.getLineContent(lineNumber));
  }
  const formatted = formatDocument(ctx.matcher, lines, options);
  const edits: monaco.languages.TextEdit[] = [];
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] === lines[i]) continue;
    edits.push({
      range: {
        startLineNumber: i + 1,
        startColumn: 1,
        endLineNumber: i + 1,
        endColumn: lines[i].length + 1,
      },
      text: formatted[i],
    });
  }
  return edits;
}
