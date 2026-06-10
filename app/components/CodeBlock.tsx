'use client'

import { useMemo } from 'react'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import sql from 'highlight.js/lib/languages/sql'
import bash from 'highlight.js/lib/languages/bash'
import jsonLang from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import cssLang from 'highlight.js/lib/languages/css'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import go from 'highlight.js/lib/languages/go'
import kotlin from 'highlight.js/lib/languages/kotlin'
import ruby from 'highlight.js/lib/languages/ruby'
import php from 'highlight.js/lib/languages/php'
import rust from 'highlight.js/lib/languages/rust'

// 언어 컬럼이 없으므로 자동 감지(highlightAuto). 흔한 언어만 등록해 번들을 제한.
const SUBSET = ['javascript', 'typescript', 'python', 'java', 'sql', 'bash', 'json', 'xml', 'css', 'cpp', 'csharp', 'go', 'kotlin', 'ruby', 'php', 'rust']

let registered = false
function ensureRegistered() {
  if (registered) return
  hljs.registerLanguage('javascript', javascript)
  hljs.registerLanguage('typescript', typescript)
  hljs.registerLanguage('python', python)
  hljs.registerLanguage('java', java)
  hljs.registerLanguage('sql', sql)
  hljs.registerLanguage('bash', bash)
  hljs.registerLanguage('json', jsonLang)
  hljs.registerLanguage('xml', xml)
  hljs.registerLanguage('css', cssLang)
  hljs.registerLanguage('cpp', cpp)
  hljs.registerLanguage('csharp', csharp)
  hljs.registerLanguage('go', go)
  hljs.registerLanguage('kotlin', kotlin)
  hljs.registerLanguage('ruby', ruby)
  hljs.registerLanguage('php', php)
  hljs.registerLanguage('rust', rust)
  registered = true
}

export default function CodeBlock({ code, className = '' }: { code: string; className?: string }) {
  const html = useMemo(() => {
    ensureRegistered()
    try {
      return hljs.highlightAuto(code, SUBSET).value
    } catch {
      return null
    }
  }, [code])

  return (
    <pre className={`bg-slate-900 dark:bg-slate-950 p-4 rounded-lg overflow-x-auto text-sm ${className}`}>
      {html
        ? <code className="hljs font-mono" dangerouslySetInnerHTML={{ __html: html }} />
        : <code className="font-mono text-slate-50">{code}</code>}
    </pre>
  )
}
