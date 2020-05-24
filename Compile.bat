echo Please, use font "Lucida Console".
chcp 65001
npm run build
copy .\dist\index.html .\example\VanessaEditorSample\Templates\VanessaEditor\Ext\Template.bin
oscript .\tools\onescript\Compile.os .\example