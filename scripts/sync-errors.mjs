import { mkdir, readFile, writeFile } from 'node:fs/promises'

const upstream = JSON.parse(await readFile(new URL('../upstream.json', import.meta.url), 'utf8'))
const url = `https://raw.githubusercontent.com/${upstream.repository}/${upstream.revision}/Client/apple/ERROR_CODES.md`
const response = await fetch(url)
if (!response.ok) throw new Error(`读取错误码原表失败 (${response.status})`)
const source = await response.text()

const rows = []
const seen = new Set()
for (const line of source.split(/\r?\n/)) {
  if (!line.startsWith('| `')) continue
  const cells = line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim())
  if (cells.length !== 4 || !/^`[A-Z0-9_]+`$/.test(cells[0])) {
    throw new Error(`错误码原表格式已改变，请核对 ${line}`)
  }
  const [code, , zh, en] = cells
  if (seen.has(code)) throw new Error(`重复的错误码 ${code}`)
  seen.add(code)
  rows.push(`| ${code} | ${zh} | ${en} |`)
}
if (!rows.length) throw new Error('错误码原表中没有可识别的条目')

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
