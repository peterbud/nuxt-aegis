import DefaultTheme from 'vitepress/theme'
import Mermaid from './MermaidCanvas.vue'
import type { EnhanceAppContext } from 'vitepress'
import './custom.css'

export default {
  ...DefaultTheme,
  enhanceApp({ app }: EnhanceAppContext) {
    // register global components
    app.component('MermaidCanvas', Mermaid)
  },
}
