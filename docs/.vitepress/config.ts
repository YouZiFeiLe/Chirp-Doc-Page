import { statSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vitepress'
import { enSidebar, zhSidebar } from './navigation'
import upstream from '../../upstream.json'

const sourceUrl = 'https://github.com/' + upstream.repository + '/'

const autoLanguageScript = `;(function(){try{var p=location.pathname;if(p==='/en'||p.indexOf('/en/')===0)return;var s=localStorage.getItem('chirp-doc-lang');if(s==='zh-Hans')return;var l=(navigator.languages&&navigator.languages[0])||navigator.language||'';if(s==='en'||!/^zh\\b/i.test(l)){var t='/en'+(p==='/'?'/':p);location.replace(t+location.search+location.hash);}}catch(e){}})();`

export default defineConfig({
  title: 'Chirp Docs',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/chirp.png' }],
    ['script', {}, autoLanguageScript],
  ],
  transformPageData(pageData) {
    if (!pageData.lastUpdated) {
      try {
        const filePath = join(process.cwd(), 'docs', pageData.relativePath)
        pageData.lastUpdated = Math.round(statSync(filePath).mtimeMs)
      } catch {
        pageData.lastUpdated = Date.now()
      }
    }
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
