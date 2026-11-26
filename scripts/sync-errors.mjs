import { mkdir, readFile, writeFile } from 'node:fs/promises'

const upstream = JSON.parse(await readFile(new URL('../upstream.json', import.meta.url), 'utf8'))
const base = `https://raw.githubusercontent.com/${upstream.repository}/${upstream.revision}/Client/apple/Shared`

async function fetchText(path) {
  const response = await fetch(`${base}/${path}`)
  if (!response.ok) throw new Error(`读取 ${path} 失败 (${response.status})`)
  return response.text()
}

function parseStrings(source, label) {
  const map = new Map()
  const pattern = /^\s*"([A-Z0-9_]+)"\s*=\s*"((?:\\.|[^"\\])*)"\s*;\s*$/gm
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) continue
    pattern.lastIndex = 0
    const match = pattern.exec(line)
    if (!match) throw new Error(`${label} 格式已改变，请核对：${line}`)
    const [, key, rawValue] = match
    if (map.has(key)) throw new Error(`${label} 中存在重复的错误码 ${key}`)
    const value = rawValue.replace(/\\(["\\ntr])/g, (_, ch) => {
      if (ch === 'n') return ' '
      if (ch === 't') return ' '
      if (ch === 'r') return ''
      return ch
    })
    map.set(key, value.replace(/\|/g, '\\|'))
  }
  return map
}

const [swiftSource, zhSource, enSource] = await Promise.all([
  fetchText('ClientError.swift'),
  fetchText('Resources/zh-Hans.lproj/Errors.strings'),
  fetchText('Resources/en.lproj/Errors.strings'),
])

const codes = []
const seen = new Set()
for (const match of swiftSource.matchAll(/^\s*case\s+\w+\s*=\s*"([A-Z0-9_]+)"/gm)) {
  const code = match[1]
  if (seen.has(code)) throw new Error(`ClientError.swift 中存在重复的错误码 ${code}`)
  seen.add(code)
  codes.push(code)
}
if (!codes.length) throw new Error('ClientError.swift 中没有可识别的错误码')

const zhMap = parseStrings(zhSource, 'zh-Hans.lproj/Errors.strings')
const enMap = parseStrings(enSource, 'en.lproj/Errors.strings')

for (const code of codes) {
  if (!zhMap.has(code)) throw new Error(`zh-Hans.lproj/Errors.strings 缺少错误码 ${code}`)
  if (!enMap.has(code)) throw new Error(`en.lproj/Errors.strings 缺少错误码 ${code}`)
}
for (const key of zhMap.keys()) {
  if (!seen.has(key)) throw new Error(`zh-Hans.lproj/Errors.strings 存在多余错误码 ${key}`)
}
for (const key of enMap.keys()) {
  if (!seen.has(key)) throw new Error(`en.lproj/Errors.strings 存在多余错误码 ${key}`)
}

const rows = codes.map((code) => `| \`${code}\` | ${zhMap.get(code)} | ${enMap.get(code)} |`)
const contents = [
  '<!-- 由 npm run sync:errors 从 upstream.json 指定的公开源码快照生成。 -->',
  '| 错误码 | 简体中文 | English |',
  '| --- | --- | --- |',
  ...rows,
  '',
].join('\n')

const directory = new URL('../docs/.vitepress/data/', import.meta.url)
await mkdir(directory, { recursive: true })
await writeFile(new URL('apple-errors.inc.md', directory), contents)
console.log(`已同步 ${rows.length} 条错误码，来源为 ${upstream.revision.slice(0, 7)}。`)
