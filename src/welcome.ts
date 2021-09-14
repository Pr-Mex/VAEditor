export function getWelcome() {
    let html = `
<div class="welcome">
<h1>Vanessa Automation</h1>
<h2>Сценарное тестирование</h2>
<h3>Запуск</h3>
<ul>
    <li><a href="#" data-href="welcome:new-file"><span class="codicon codicon-new-file"></span>Создать файл…</a></li>
    <li><a href="#" data-href="welcome:open-file"><span class="codicon codicon-go-to-file"></span>Открыть файл…</a></li>
    <li><a href="#" data-href="welcome:open-folder"><span class="codicon codicon-folder-opened"></span>Открыть папку…</a></li>
    <li><a href="#" data-href="welcome:execute-command"><span class="codicon codicon-symbol-color"></span>Выполнить команду…</a></li>
</ul>
</div>
`;
    return html;
};