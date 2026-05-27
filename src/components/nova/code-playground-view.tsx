'use client'

import { motion } from 'framer-motion'
import { Code, Play, Trash2, Copy, Maximize2, Minimize2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'

const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Rust', 'Go']

const TEMPLATES: Record<string, { label: string; code: string }> = {
  hello: {
    label: 'Hello World',
    code: `// Hello World\nfunction greet(name) {\n  console.log(\`Hello, \${name}!\`);\n  return \`Welcome to NOVA Code Playground\`;\n}\n\ngreet("Developer");`,
  },
  api: {
    label: 'API Server',
    code: `// Simple API Server\nconst server = {\n  routes: {},\n  get(path, handler) {\n    this.routes[path] = handler;\n  },\n  handleRequest(path, req) {\n    const handler = this.routes[path];\n    if (handler) return handler(req);\n    return { status: 404, body: "Not Found" };\n  }\n};\n\nserver.get("/api/users", (req) => {\n  return { status: 200, body: [{ id: 1, name: "Nova" }] };\n});\n\nconsole.log(server.handleRequest("/api/users", {}));`,
  },
  parser: {
    label: 'Data Parser',
    code: `// Data Parser\nclass DataParser {\n  constructor(data) {\n    this.data = data;\n  }\n\n  filter(predicate) {\n    return this.data.filter(predicate);\n  }\n\n  map(transform) {\n    return this.data.map(transform);\n  }\n\n  sortBy(key) {\n    return [...this.data].sort((a, b) => a[key] - b[key]);\n  }\n\n  stats() {\n    const values = this.data.map(d => d.value);\n    return {\n      count: values.length,\n      sum: values.reduce((a, b) => a + b, 0),\n      avg: values.reduce((a, b) => a + b, 0) / values.length\n    };\n  }\n}\n\nconst data = [\n  { name: "Alpha", value: 42 },\n  { name: "Beta", value: 88 },\n  { name: "Gamma", value: 15 }\n];\n\nconst parser = new DataParser(data);\nconsole.log("Stats:", parser.stats());\nconsole.log("Sorted:", parser.sortBy("value"));`,
  },
  sort: {
    label: 'Sort Algorithm',
    code: `// Quick Sort Algorithm\nfunction quickSort(arr) {\n  if (arr.length <= 1) return arr;\n\n  const pivot = arr[Math.floor(arr.length / 2)];\n  const left = arr.filter(x => x < pivot);\n  const middle = arr.filter(x => x === pivot);\n  const right = arr.filter(x => x > pivot);\n\n  return [...quickSort(left), ...middle, ...quickSort(right)];\n}\n\nconst data = [38, 27, 43, 3, 9, 82, 10];\nconsole.log("Input:", data);\nconsole.log("Sorted:", quickSort(data));`,
  },
  http: {
    label: 'HTTP Client',
    code: `// HTTP Client Simulation\nclass HttpClient {\n  constructor(baseUrl) {\n    this.baseUrl = baseUrl;\n    this.headers = { "Content-Type": "application/json" };\n  }\n\n  async get(path) {\n    console.log(\`GET \${this.baseUrl}\${path}\`);\n    return { status: 200, data: { message: "Success" } };\n  }\n\n  async post(path, body) {\n    console.log(\`POST \${this.baseUrl}\${path}\`);\n    console.log("Body:", JSON.stringify(body));\n    return { status: 201, data: { id: 1, ...body } };\n  }\n}\n\nconst client = new HttpClient("https://api.example.com");\nclient.get("/users").then(r => console.log("Response:", r));\nclient.post("/users", { name: "Nova" }).then(r => console.log("Response:", r));`,
  },
}

export function CodePlaygroundView() {
  const { authFetch } = useAuth()
  const [language, setLanguage] = useState('JavaScript')
  const [code, setCode] = useState(TEMPLATES.hello.code)
  const [output, setOutput] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [executionTime, setExecutionTime] = useState<number | null>(null)

  const handleRun = async () => {
    setIsRunning(true)
    setOutput([])
    setExecutionTime(null)

    try {
      const startTime = Date.now()
      const res = await authFetch('/api/execute', {
        method: 'POST',
        body: JSON.stringify({ code, language }),
      })

      const endTime = Date.now()

      if (res.ok) {
        const data = await res.json()
        setOutput(data.output || ['No output'])
        setExecutionTime(data.executionTime || (endTime - startTime))
      } else {
        const data = await res.json()
        setOutput([`Error: ${data.error || 'Execution failed'}`])
        setExecutionTime(endTime - startTime)
      }
    } catch {
      setOutput(['Error: Failed to connect to execution server'])
    }

    setIsRunning(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
  }

  const handleTemplate = (key: string) => {
    setCode(TEMPLATES[key].code)
  }

  const lineCount = code.split('\n').length

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4' : 'p-4 lg:p-6'} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Code className="w-5 h-5 text-nova-gold" />
            Code Playground
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none focus-gold"
          >
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
        {/* Editor area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Templates */}
          <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
            {Object.entries(TEMPLATES).map(([key, template]) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTemplate(key)}
                className="px-2.5 py-1 rounded-lg text-[10px] whitespace-nowrap glass-card text-muted-foreground hover:text-nova-gold transition-colors"
              >
                {template.label}
              </motion.button>
            ))}
          </div>

          {/* Code editor */}
          <div className="flex-1 glass-card overflow-hidden flex min-h-0">
            <div className="py-3 px-2 text-right select-none border-r border-border overflow-y-auto">
              {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i} className="text-[10px] text-muted-foreground/50 leading-5">{i + 1}</div>
              ))}
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="flex-1 bg-transparent p-3 text-sm text-foreground font-mono leading-5 outline-none resize-none overflow-y-auto"
            />
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRun}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg gold-gradient-bg text-background text-xs font-medium disabled:opacity-50"
              >
                <Play className="w-3 h-3" />
                {isRunning ? 'Running...' : 'Run'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setOutput([])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </motion.button>
            </div>
            <div className="flex items-center gap-3">
              {executionTime !== null && (
                <span className="text-[10px] text-emerald-500">{executionTime}ms</span>
              )}
              <span className="text-[10px] text-muted-foreground">{language} · {lineCount} lines</span>
            </div>
          </div>
        </div>

        {/* Output console */}
        <div className="w-72 lg:w-80 flex flex-col min-h-0">
          <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-nova-gold nova-pulse' : output.length > 0 ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
            Console
          </div>
          <div className="flex-1 glass-card p-3 bg-[#0d0d0d] overflow-y-auto">
            {output.length === 0 && !isRunning && (
              <p className="text-xs text-muted-foreground/30 font-mono">Output will appear here...</p>
            )}
            {isRunning && (
              <motion.p
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-xs text-nova-gold font-mono"
              >
                Running...
              </motion.p>
            )}
            {output.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`text-xs font-mono leading-5 ${line.startsWith('Error:') ? 'text-red-400' : 'text-emerald-400'}`}
              >
                {line}
              </motion.p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
