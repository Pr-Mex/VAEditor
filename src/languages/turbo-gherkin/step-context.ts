import { KeywordMatcher } from './matcher';
import { VAStepLine } from './stepline';

// Контекст шага под курсором — то, что редактор отдаёт в 1С для команд
// «показать шаг в дереве» и «открыть шаг как фичу» (#1453).
//
// Сама навигация живёт в VA: у неё есть дерево библиотеки шагов и исходные
// feature-файлы. Задача редактора — определить, что за шаг на строке, и
// сообщить об этом событием.
export interface VAStepContext {
  lineNumber: number;
  // Ключевое слово шага как в тексте: «И», «Когда», «Given».
  keyword: string;
  // Сниппет в том же виде, в каком он ключуется в steplist (нижний регистр,
  // только значимые слова): по нему 1С находит шаг в дереве.
  step: string;
  // Текст шага без ключевого слова — для показа в интерфейсе.
  text: string;
  // Строка целиком, как в редакторе.
  line: string;
  // Путь открытого файла (заполняет вызывающая сторона).
  filepath?: string;
}

export function getStepContext(
  matcher: KeywordMatcher,
  line: string,
  lineNumber: number = 0,
): VAStepContext | undefined {
  if (!matcher || !matcher.step || line === undefined || line === null) return undefined;
  const match = line.match(matcher.step);
  if (!match) return undefined;
  const step = new VAStepLine(matcher, line);
  if (step.invalid) return undefined;
  return {
    lineNumber,
    keyword: match[1] || match[0].trim(),
    step: step.snippet,
    text: line.substring(match[0].length).trim(),
    line: line,
  };
}
