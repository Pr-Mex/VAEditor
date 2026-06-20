// monaco 0.55: contrib/clipboard paste-действие (editor.action.clipboardPasteAction)
// в своём run() вызывает accessor.get(IProductService). Но standalone-сборка monaco
// этот сервис НЕ регистрирует (см. standaloneServices.js) → InstantiationService
// бросает «[invokeFunction] unknown service 'productService'», run падает РАНЬШЕ
// чтения буфера обмена, и кнопка «Вставить» не вставляет ничего. До 0.55 paste
// productService не трогал — отсюда регрессия после апгрейда monaco.
//
// Регистрируем минимальную реализацию: paste использует только поле .quality
// ('stable' → ветка телеметрии пропускается). Делаем это ДО инициализации
// StandaloneServices (импорт в main.ts идёт сразу после полифилов), иначе
// дескриптор не попадёт в реестр синглтонов.
import { registerSingleton } from 'monaco-editor/esm/vs/platform/instantiation/common/extensions';
import { IProductService } from 'monaco-editor/esm/vs/platform/product/common/productService';

class StandaloneProductService {
  declare readonly _serviceBrand: undefined;
  readonly quality = 'stable';
}

// 3-й аргумент — supportsDelayedInstantiation: создаём сервис лениво, только когда
// его действительно запросят (т.е. на первом paste).
//@ts-ignore — IProductService здесь импортируется из внутреннего пути monaco без .d.ts
registerSingleton(IProductService, StandaloneProductService, 1 /* InstantiationType.Delayed */);
