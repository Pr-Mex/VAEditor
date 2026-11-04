#! /usr/bin/env node
'use strict'

// Замена пакета run-script-os. Он вызывает spawn с shell: true и массивом
// аргументов, из-за чего Node 22+ печатает DEP0190. Здесь команда собирается
// в одну строку и передаётся в spawnSync строкой, поэтому предупреждения нет.
//
// Использование: node tools/run-script-os.js compile
// Запускает из package.json скрипт "<имя>:<платформа>" (compile:win32 и т.п.).
// Файл линтуется standard вместе с остальными js — без точек с запятой.

const path = require('path')
const { spawnSync } = require('child_process')

const name = process.argv[2]
if (!name) {
  console.error('Не указано имя команды. Пример: node tools/run-script-os.js compile')
  process.exit(2)
}

const root = path.join(__dirname, '..')
const scripts = require(path.join(root, 'package.json')).scripts
const key = name + ':' + process.platform

if (!scripts[key]) {
  console.error('В package.json нет команды ' + key)
  process.exit(2)
}

const result = spawnSync(scripts[key], { shell: true, stdio: 'inherit', cwd: root })
if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}
process.exit(result.status === null ? 1 : result.status)
