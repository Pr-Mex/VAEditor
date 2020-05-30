echo Please, use font "Lucida Console".
chcp 65001
powershell Compress-Archive -LiteralPath .\dist\index.html -DestinationPath .\dist\index.zip  -Update
copy .\dist\index.zip .\example\VanessaEditorSample\Templates\VanessaEditor\Ext\Template.bin
oscript .\tools\onescript\Compile.os .\example
