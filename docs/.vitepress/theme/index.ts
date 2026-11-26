import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './style.css'

import NetworkTopologyDiagram from './components/NetworkTopologyDiagram.vue'
import AuthAndJoinSequence from './components/AuthAndJoinSequence.vue'
import KeyHierarchyAndRotation from './components/KeyHierarchyAndRotation.vue'
import AttachmentLifecycleDiagram from './components/AttachmentLifecycleDiagram.vue'
import ChirpKeyLayoutDiagram from './components/ChirpKeyLayoutDiagram.vue'
import AudioPipelineDiagram from './components/AudioPipelineDiagram.vue'
import VerificationFlowDiagram from './components/VerificationFlowDiagram.vue'
import ChirpLogDiagram from './components/ChirpLogDiagram.vue'
import CrossPlatformMatrixDiagram from './components/CrossPlatformMatrixDiagram.vue'
import E2eeAuditChainDiagram from './components/E2eeAuditChainDiagram.vue'
import PasskeyQrLoginDiagram from './components/PasskeyQrLoginDiagram.vue'
import DeviceTrustTreeDiagram from './components/DeviceTrustTreeDiagram.vue'
import GroupStateMachineDiagram from './components/GroupStateMachineDiagram.vue'
import AdminSessionCascadeDiagram from './components/AdminSessionCascadeDiagram.vue'
import DocUpdatedMeta from './components/DocUpdatedMeta.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('DocUpdatedMeta', DocUpdatedMeta)
    app.component('NetworkTopologyDiagram', NetworkTopologyDiagram)
    app.component('AuthAndJoinSequence', AuthAndJoinSequence)
    app.component('KeyHierarchyAndRotation', KeyHierarchyAndRotation)
    app.component('AttachmentLifecycleDiagram', AttachmentLifecycleDiagram)
    app.component('ChirpKeyLayoutDiagram', ChirpKeyLayoutDiagram)
    app.component('AudioPipelineDiagram', AudioPipelineDiagram)
    app.component('VerificationFlowDiagram', VerificationFlowDiagram)
    app.component('ChirpLogDiagram', ChirpLogDiagram)
    app.component('CrossPlatformMatrixDiagram', CrossPlatformMatrixDiagram)
    app.component('E2eeAuditChainDiagram', E2eeAuditChainDiagram)
    app.component('PasskeyQrLoginDiagram', PasskeyQrLoginDiagram)
    app.component('DeviceTrustTreeDiagram', DeviceTrustTreeDiagram)
    app.component('GroupStateMachineDiagram', GroupStateMachineDiagram)
    app.component('AdminSessionCascadeDiagram', AdminSessionCascadeDiagram)

    if (typeof window !== 'undefined') {
      window.addEventListener(
        'click',
        (event) => {
          const target = (event.target as HTMLElement | null)?.closest('a')
          if (!target) return
          const inLangSwitcher = Boolean(
            target.closest('.VPNavBarTranslations, .VPNavScreenTranslations'),
          )
          if (!inLangSwitcher) return
          const href = target.getAttribute('href') ?? ''
          try {
            const nextLang = href.startsWith('/en') ? 'en' : 'zh-Hans'
            window.localStorage.setItem('chirp-doc-lang', nextLang)
          } catch {
            // Ignore storage failures in restricted contexts.
          }
        },
        true,
      )
    }
  },
} satisfies Theme
