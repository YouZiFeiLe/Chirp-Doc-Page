import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type DefaultTheme, type HeadConfig } from 'vitepress'
import { enSidebar, zhSidebar } from './navigation'
import upstream from '../../upstream.json'

const siteUrl = 'https://chirp.youzifeile.com'
const socialImage = `${siteUrl}/social-preview.png`
const sourceUrl = 'https://github.com/' + upstream.repository + '/'

const autoLanguageScript = `;(function(){try{if(navigator.webdriver||/bot|crawl|spider|slurp|mediapartners|adsbot|bingpreview|lighthouse|pagespeed|headless/i.test(navigator.userAgent))return;var p=location.pathname;if(p==='/en'||p.indexOf('/en/')===0)return;var s=localStorage.getItem('chirp-doc-lang');if(s==='zh-Hans')return;var l=(navigator.languages&&navigator.languages[0])||navigator.language||'';if(s==='en'||!/^zh\\b/i.test(l)){var t='/en'+(p==='/'?'/':p);location.replace(t+location.search+location.hash);}}catch(e){}})();`

function toCleanPath(relativePath: string): string {
  const cleaned = relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
  return '/' + cleaned
}

function stripMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateDescription(text: string, maxLength = 160): string {
  if (text.length <= maxLength) return text
  const slice = text.slice(0, maxLength - 3)
  const isMostlyAscii = /^[\x00-\x7F]+$/.test(slice.slice(-20))
  const boundary = isMostlyAscii ? slice.lastIndexOf(' ') : -1
  const clipped = boundary > maxLength * 0.6 ? slice.slice(0, boundary) : slice
  return clipped.trimEnd() + '...'
}

function extractDescription(markdown: string): string {
  const body = markdown
    .replace(/^---[\s\S]*?---\s*/, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
  const paragraphs: string[] = []
  let current: string[] = []
  let inCode = false
  let divDepth = 0

  const flush = () => {
    if (current.length) {
      paragraphs.push(current.join(' '))
      current = []
    }
  }

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim()
    if (/^```|^~~~/.test(line)) {
      inCode = !inCode
      continue
    }
    if (inCode) continue
    if (/^<div\b/i.test(line)) {
      divDepth++
      continue
    }
    if (/^<\/div>/i.test(line)) {
      divDepth = Math.max(0, divDepth - 1)
      continue
    }
    if (divDepth > 0) continue
    if (
      !line ||
      /^:::\s*\w+/.test(line) ||
      line === ':::' ||
      /^#+\s/.test(line) ||
      /^<[A-Z][A-Za-z0-9]*[^>]*\/>$/.test(line) ||
      /^\|/.test(line) ||
      /^>\s*\[!/.test(line) ||
      /^---+$/.test(line)
    ) {
      flush()
      continue
    }
    if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      if (paragraphs.length && /[:：]$/.test(paragraphs[paragraphs.length - 1])) {
        paragraphs[paragraphs.length - 1] += ' ' + line.replace(/^([-*]|\d+\.)\s+/, '')
      } else {
        flush()
      }
      continue
    }
    current.push(line.replace(/^>\s?/, ''))
  }
  flush()

  for (const paragraph of paragraphs) {
    const cleaned = stripMarkdown(paragraph)
    if (cleaned.length >= 20 && !/^项目：|^Project:/i.test(cleaned)) {
      return truncateDescription(cleaned)
    }
  }
  return ''
}

function findBreadcrumbs(
  sidebar: DefaultTheme.SidebarItem[],
  targetPath: string,
  homeLabel: string,
  homePath: string,
): Array<{ name: string; item: string }> {
  const crumbs = [{ name: homeLabel, item: siteUrl + homePath }]
  for (const group of sidebar) {
    if (group.link === targetPath) {
      crumbs.push({ name: group.text ?? targetPath, item: siteUrl + targetPath })
      return crumbs
    }
    const child = group.items?.find((item) => item.link === targetPath)
    if (child) {
      if (group.text) {
        const groupTarget = group.items?.[0]?.link ?? homePath
        crumbs.push({ name: group.text, item: siteUrl + groupTarget })
      }
      crumbs.push({ name: child.text ?? targetPath, item: siteUrl + targetPath })
      return crumbs
    }
  }
  return crumbs
}

export default defineConfig({
  title: 'Chirp Docs',
  cleanUrls: true,
  lastUpdated: true,
  sitemap: {
    hostname: siteUrl,
  },
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/chirp.png' }],
    ['meta', { name: 'theme-color', content: '#246448' }],
    ['script', {}, autoLanguageScript],
  ],
  transformPageData(pageData) {
    const filePath = join(process.cwd(), 'docs', pageData.relativePath)
    if (!pageData.lastUpdated) {
      try {
        pageData.lastUpdated = Math.round(statSync(filePath).mtimeMs)
      } catch {
        pageData.lastUpdated = Date.now()
      }
    }
    const isHome = pageData.relativePath === 'index.md' || pageData.relativePath === 'en/index.md'
    if (!pageData.frontmatter.description && !isHome && pageData.relativePath !== '404.md') {
      try {
        const extracted = extractDescription(readFileSync(filePath, 'utf8'))
        if (extracted) pageData.description = extracted
      } catch {
        // Fallback to locale description when file read fails.
      }
    }
  },
  transformHead({ pageData, title, description }) {
    if (pageData.relativePath === '404.md') {
      return [['meta', { name: 'robots', content: 'noindex, nofollow' }]]
    }

    const cleanPath = toCleanPath(pageData.relativePath)
    const canonicalUrl = siteUrl + cleanPath
    const isEn = pageData.relativePath === 'en/index.md' || pageData.relativePath.startsWith('en/')
    const zhRel = isEn ? pageData.relativePath.slice(3) : pageData.relativePath
    const enRel = isEn ? pageData.relativePath : 'en/' + pageData.relativePath
    const hasZh = existsSync(join(process.cwd(), 'docs', zhRel))
    const hasEn = existsSync(join(process.cwd(), 'docs', enRel))

    const isHome = pageData.relativePath === 'index.md' || pageData.relativePath === 'en/index.md'
    const siteName = isEn ? 'Chirp Docs' : 'Chirp 文档'
    const imageAlt = isEn
      ? 'Chirp — Self-hosted end-to-end encrypted voice rooms'
      : 'Chirp — 自托管端到端加密语音房间文档'

    const tags: HeadConfig[] = [
      ['link', { rel: 'canonical', href: canonicalUrl }],
      ['meta', { property: 'og:site_name', content: siteName }],
      ['meta', { property: 'og:type', content: isHome ? 'website' : 'article' }],
      ['meta', { property: 'og:locale', content: isEn ? 'en_US' : 'zh_CN' }],
      ['meta', { property: 'og:locale:alternate', content: isEn ? 'zh_CN' : 'en_US' }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: canonicalUrl }],
      ['meta', { property: 'og:image', content: socialImage }],
      ['meta', { property: 'og:image:width', content: '1280' }],
      ['meta', { property: 'og:image:height', content: '640' }],
      ['meta', { property: 'og:image:alt', content: imageAlt }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }],
      ['meta', { name: 'twitter:image', content: socialImage }],
      ['meta', { name: 'twitter:image:alt', content: imageAlt }],
    ]

    if (hasZh && hasEn) {
      const zhUrl = siteUrl + toCleanPath(zhRel)
      const enUrl = siteUrl + toCleanPath(enRel)
      tags.push(
        ['link', { rel: 'alternate', hreflang: 'zh-Hans', href: zhUrl }],
        ['link', { rel: 'alternate', hreflang: 'en', href: enUrl }],
        ['link', { rel: 'alternate', hreflang: 'x-default', href: zhUrl }],
      )
    }

    const inLanguage = isEn ? 'en' : 'zh-Hans'
    const homeUrl = siteUrl + (isEn ? '/en/' : '/')
    const webSiteNode = {
      '@type': 'WebSite',
      '@id': `${homeUrl}#website`,
      name: siteName,
      url: homeUrl,
      inLanguage,
      description,
      image: socialImage,
      sameAs: [
        'https://github.com/YouZiFeiLe/Chirp',
        'https://github.com/YouZiFeiLe/Chirp-Doc-Page',
      ],
    }

    if (isHome) {
      tags.push([
        'script',
        { type: 'application/ld+json' },
        JSON.stringify({ '@context': 'https://schema.org', ...webSiteNode }),
      ])
    } else {
      const breadcrumbs = findBreadcrumbs(
        isEn ? enSidebar : zhSidebar,
        cleanPath,
        isEn ? 'Overview' : '文档首页',
        isEn ? '/en/' : '/',
      )
      const modifiedIso = pageData.lastUpdated
        ? new Date(pageData.lastUpdated).toISOString()
        : undefined
      const graph: Record<string, unknown>[] = [
        {
          '@type': 'TechArticle',
          headline: pageData.title || title,
          description,
          url: canonicalUrl,
          inLanguage,
          image: socialImage,
          ...(modifiedIso ? { dateModified: modifiedIso } : {}),
          isPartOf: { '@id': `${homeUrl}#website`, '@type': 'WebSite', name: siteName, url: homeUrl },
        },
      ]
      if (breadcrumbs.length > 1) {
        graph.push({
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbs.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: crumb.name,
            item: crumb.item,
          })),
        })
      }
      tags.push([
        'script',
        { type: 'application/ld+json' },
        JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }),
      ])
    }

    return tags
  },
  markdown: {
    config(md) {
      md.core.ruler.push('inject-doc-updated-meta', (state) => {
        const tokens = state.tokens
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i].type === 'heading_close' && tokens[i].tag === 'h1') {
            const metaToken = new state.Token('html_block', '', 0)
            metaToken.content = '<DocUpdatedMeta />\n'
            tokens.splice(i + 1, 0, metaToken)
            break
          }
        }
      })

      const renderLink = md.renderer.rules.link_open
      md.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
        const token = tokens[index]
        const href = token.attrGet('href')
        if (href?.startsWith(sourceUrl)) {
          const path = href.slice(sourceUrl.length)
          const pinned = path.replace(/^(blob|tree)\/main(?=\/|#|$)/, '$1/' + upstream.revision)
          token.attrSet('href', sourceUrl + pinned)
        }
        return renderLink
          ? renderLink(tokens, index, options, env, renderer)
          : renderer.renderToken(tokens, index, options)
      }
    },
    theme: { light: 'github-light', dark: 'github-dark' },
    image: { lazyLoading: true },
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-Hans',
      title: 'Chirp 文档',
      titleTemplate: ':title · Chirp 文档',
      description: 'Chirp 自托管端到端加密语音房间的成员指南、部署手册、客户端架构与协议参考。',
      themeConfig: {
        sidebar: zhSidebar,
        outline: { label: '本页目录', level: [2, 3] },
        docFooter: { prev: '上一篇', next: '下一篇' },
        lastUpdated: {
          text: '最后更新于',
          formatOptions: {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Shanghai',
          },
        },
        sidebarMenuLabel: '文档目录',
        returnToTopLabel: '回到顶部',
        langMenuLabel: '切换语言',
        darkModeSwitchLabel: '外观',
        darkModeSwitchTitle: '切换至深色',
        lightModeSwitchTitle: '切换至浅色',
        skipToContentLabel: '跳到正文',
        notFound: {
          title: '找不到这篇文档',
          quote: '可以从文档首页重新选择，或用搜索查找主题。',
          linkLabel: '返回文档首页',
          linkText: '返回文档首页',
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      title: 'Chirp Docs',
      titleTemplate: ':title · Chirp Docs',
      description:
        'Member guides, self-hosting manuals, cross-platform client architecture, and E2EE protocol references for Chirp.',
      themeConfig: {
        sidebar: enSidebar,
        outline: { label: 'On this page', level: [2, 3] },
        docFooter: { prev: 'Previous', next: 'Next' },
        lastUpdated: {
          text: 'Last updated',
          formatOptions: {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC',
          },
        },
        sidebarMenuLabel: 'Navigation',
        returnToTopLabel: 'Back to top',
        langMenuLabel: 'Language',
        darkModeSwitchLabel: 'Appearance',
        darkModeSwitchTitle: 'Switch to dark mode',
        lightModeSwitchTitle: 'Switch to light mode',
        skipToContentLabel: 'Skip to content',
      },
    },
  },
  themeConfig: {
    siteTitle: 'Chirp',
    logo: { src: '/chirp.png', alt: '' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/YouZiFeiLe/Chirp', ariaLabel: 'Chirp Source Repository' },
    ],
    search: {
      provider: 'local',
      options: {
        miniSearch: {
          options: {
            tokenize: (text: string) => {
              const words =
                text.match(/[\p{Script=Han}]+|[\p{Script=Latin}\p{N}_]+|[\p{L}]+/gu) ?? []
              return words.flatMap((word) => {
                if (!/^\p{Script=Han}/u.test(word) || word.length < 2) return [word]
                return Array.from(word.slice(1), (_, i) => word.slice(i, i + 2))
              })
            },
          },
          searchOptions: { prefix: true, combineWith: 'AND' },
        },
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
              modal: {
                displayDetails: '显示正文摘要',
                resetButtonTitle: '清空搜索',
                backButtonTitle: '关闭搜索',
                noResultsText: '没有找到相关文档',
                footer: {
                  selectText: '打开',
                  selectKeyAriaLabel: '回车',
                  navigateText: '切换',
                  navigateUpKeyAriaLabel: '上箭头',
                  navigateDownKeyAriaLabel: '下箭头',
                  closeText: '关闭',
                  closeKeyAriaLabel: 'Esc',
                },
              },
            },
          },
          en: {
            translations: {
              button: { buttonText: 'Search docs', buttonAriaLabel: 'Search docs' },
              modal: {
                displayDetails: 'Display detailed list',
                resetButtonTitle: 'Reset query',
                backButtonTitle: 'Close search',
                noResultsText: 'No results found',
                footer: {
                  selectText: 'to select',
                  selectKeyAriaLabel: 'Enter',
                  navigateText: 'to navigate',
                  navigateUpKeyAriaLabel: 'Arrow Up',
                  navigateDownKeyAriaLabel: 'Arrow Down',
                  closeText: 'to close',
                  closeKeyAriaLabel: 'Escape',
                },
              },
            },
          },
        },
      },
    },
  },
})
