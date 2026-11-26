import { readFile, readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { extname, join } from 'node:path'
import { parse } from 'parse5'

const output = fileURLToPath(new URL('../docs/.vitepress/dist/', import.meta.url))
const origin = 'https://docs.local'
const pages = new Map()
const failures = []

async function readPages(directory, prefix = '') {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + item.name
    const file = join(directory, item.name)
    if (item.isDirectory()) {
      await readPages(file, relative + '/')
    } else if (item.name.endsWith('.html')) {
      const tree = parse(await readFile(file, 'utf8'))
      const page = { name: relative, ids: new Set(), references: [] }
      collect(tree, page)
      pages.set('/' + relative, page)
    }
  }
}

function collect(node, page) {
  const attrs = Object.fromEntries((node.attrs ?? []).map((attr) => [attr.name, attr.value]))
  if (attrs.id) page.ids.add(attrs.id)
  if ((node.tagName === 'a' || node.tagName === 'link') && attrs.href) {
    page.references.push(attrs.href)
  }
  if ((node.tagName === 'img' || node.tagName === 'script') && attrs.src) {
    page.references.push(attrs.src)
  }
  for (const child of node.childNodes ?? []) collect(child, page)
}

await readPages(output)
const assetCache = new Map()
async function isAsset(pathname) {
  if (!assetCache.has(pathname)) {
    assetCache.set(
      pathname,
      await stat(join(output, pathname))
        .then((s) => s.isFile())
        .catch(() => false),
    )
  }
  return assetCache.get(pathname)
}

for (const [path, page] of pages) {
  const base = new URL(path.replace(/\/index\.html$/, '/').replace(/\.html$/, ''), origin)
  for (const ref of new Set(page.references)) {
    const url = new URL(ref, base)
    if (url.origin !== origin) continue
    const pathname = decodeURIComponent(url.pathname)
    const destination =
      pages.get(pathname) ??
      pages.get(pathname + '.html') ??
      pages.get(pathname.replace(/\/?$/, '/') + 'index.html')
    if (destination) {
      const id = decodeURIComponent(url.hash.slice(1))
      if (id && !destination.ids.has(id)) failures.push(`${page.name} → ${ref}（缺少标题或锚点）`)
    } else if (!extname(pathname) || !(await isAsset(pathname))) {
      failures.push(`${page.name} → ${ref}（缺少文件）`)
    }
  }
}
if (failures.length) throw new Error('站内链接检查失败\n' + failures.join('\n'))
console.log(`已检查 ${pages.size} 个 HTML 页面的站内链接、锚点及静态资源。`)
