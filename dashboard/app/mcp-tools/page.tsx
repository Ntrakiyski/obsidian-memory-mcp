"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Play, RefreshCw, Terminal, ChevronDown, ChevronRight, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ToolProperty {
  type: string
  description?: string
  enum?: string[]
  default?: unknown
}

interface ToolInputSchema {
  type: string
  properties?: Record<string, ToolProperty>
  required?: string[]
}

interface Tool {
  name: string
  title?: string
  description?: string
  inputSchema: ToolInputSchema
}

interface ToolResult {
  content?: Array<{
    type: string
    text?: string
    data?: string
    mimeType?: string
  }>
  structuredContent?: unknown
  isError?: boolean
}

export default function McpToolsPage() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [toolArgs, setToolArgs] = useState<Record<string, unknown>>({})
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<ToolResult | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set())

  // Use API route for MCP communication (server-side proxy)
  const MCP_ENDPOINT = "/api/mcp"

  // Track initialization to prevent race conditions
  const initializingRef = useRef(false)
  const mountedRef = useRef(true)

  // Initialize MCP session and fetch tools
  useEffect(() => {
    mountedRef.current = true
    initializeAndFetchTools()

    return () => {
      mountedRef.current = false
    }
  }, [])

  const initializeAndFetchTools = async () => {
    // Prevent multiple simultaneous initializations
    if (initializingRef.current) {
      return
    }
    initializingRef.current = true

    setLoading(true)
    setError(null)

    try {
      // First, initialize the MCP session
      const initResponse = await fetch(MCP_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: {
              name: "obsidian-vault-client",
              version: "1.0.0",
            },
          },
        }),
      })

      if (!mountedRef.current) return

      if (!initResponse.ok) {
        throw new Error(`MCP server returned ${initResponse.status}: ${initResponse.statusText}`)
      }

      // Get session ID if provided
      const newSessionId = initResponse.headers.get("Mcp-Session-Id")
      if (newSessionId && mountedRef.current) {
        setSessionId(newSessionId)
      }

      const initResult = await initResponse.json()

      if (!mountedRef.current) return

      if (initResult.error) {
        throw new Error(initResult.error.message || "Failed to initialize MCP session")
      }

      // Send initialized notification
      await fetch(MCP_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(newSessionId && { "Mcp-Session-Id": newSessionId }),
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
      })

      if (!mountedRef.current) return

      // Now fetch tools list
      const toolsResponse = await fetch(MCP_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(newSessionId && { "Mcp-Session-Id": newSessionId }),
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/list",
          params: {},
        }),
      })

      if (!mountedRef.current) return

      if (!toolsResponse.ok) {
        throw new Error(`MCP server returned ${toolsResponse.status}: ${toolsResponse.statusText}`)
      }

      const toolsResult = await toolsResponse.json()

      if (!mountedRef.current) return

      if (toolsResult.error) {
        throw new Error(toolsResult.error.message || "Failed to fetch tools")
      }

      setTools(toolsResult.result?.tools || [])
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to connect to MCP server")
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
      initializingRef.current = false
    }
  }

  const executeTool = async (tool: Tool) => {
    setExecuting(true)
    setResult(null)

    try {
      const response = await fetch(MCP_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(sessionId && { "Mcp-Session-Id": sessionId }),
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: tool.name,
            arguments: toolArgs,
          },
        }),
      })

      const contentType = response.headers.get("Content-Type") || ""

      if (contentType.includes("text/event-stream")) {
        // Handle SSE response
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let fullText = ""

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            fullText += decoder.decode(value, { stream: true })
          }

          // Parse SSE events
          const events = fullText.split("\n\n").filter((e) => e.trim())
          for (const event of events) {
            const dataMatch = event.match(/data: (.+)/)
            if (dataMatch) {
              try {
                const data = JSON.parse(dataMatch[1])
                if (data.result) {
                  setResult(data.result)
                } else if (data.error) {
                  setResult({ content: [{ type: "text", text: data.error.message }], isError: true })
                }
              } catch {
                // Continue parsing
              }
            }
          }
        }
      } else {
        // Handle JSON response
        const jsonResult = await response.json()

        if (jsonResult.error) {
          setResult({ content: [{ type: "text", text: jsonResult.error.message }], isError: true })
        } else {
          setResult(jsonResult.result)
        }
      }
    } catch (err) {
      setResult({
        content: [{ type: "text", text: err instanceof Error ? err.message : "Failed to execute tool" }],
        isError: true,
      })
    } finally {
      setExecuting(false)
    }
  }

  const selectTool = (tool: Tool) => {
    setSelectedTool(tool)
    setToolArgs({})
    setResult(null)

    // Set default values for properties
    if (tool.inputSchema.properties) {
      const defaults: Record<string, unknown> = {}
      for (const [key, prop] of Object.entries(tool.inputSchema.properties)) {
        if (prop.default !== undefined) {
          defaults[key] = prop.default
        }
      }
      setToolArgs(defaults)
    }
  }

  const toggleToolExpand = (toolName: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev)
      if (next.has(toolName)) {
        next.delete(toolName)
      } else {
        next.add(toolName)
      }
      return next
    })
  }

  const renderPropertyInput = (name: string, prop: ToolProperty, required: boolean) => {
    const value = toolArgs[name]

    if (prop.enum) {
      return (
        <select
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={(value as string) || ""}
          onChange={(e) => setToolArgs((prev) => ({ ...prev, [name]: e.target.value }))}
        >
          <option value="">Select {name}...</option>
          {prop.enum.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )
    }

    if (prop.type === "boolean") {
      return (
        <select
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={value === true ? "true" : value === false ? "false" : ""}
          onChange={(e) =>
            setToolArgs((prev) => ({
              ...prev,
              [name]: e.target.value === "true" ? true : e.target.value === "false" ? false : undefined,
            }))
          }
        >
          <option value="">Select...</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      )
    }

    if (prop.type === "number" || prop.type === "integer") {
      return (
        <Input
          type="number"
          placeholder={prop.description || name}
          value={(value as number) || ""}
          onChange={(e) =>
            setToolArgs((prev) => ({
              ...prev,
              [name]: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
        />
      )
    }

    // Default: string input
    return (
      <Input
        type="text"
        placeholder={prop.description || name}
        value={(value as string) || ""}
        onChange={(e) => setToolArgs((prev) => ({ ...prev, [name]: e.target.value || undefined }))}
      />
    )
  }

  const formatResult = (result: ToolResult) => {
    if (result.structuredContent) {
      return JSON.stringify(result.structuredContent, null, 2)
    }

    if (result.content) {
      return result.content
        .map((item) => {
          if (item.type === "text") {
            return item.text
          }
          if (item.type === "image") {
            return `[Image: ${item.mimeType}]`
          }
          return JSON.stringify(item)
        })
        .join("\n")
    }

    return JSON.stringify(result, null, 2)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Terminal className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">MCP Tools Explorer</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={initializeAndFetchTools} disabled={loading || initializingRef.current}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Connecting to MCP server...</span>
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Connection Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={initializeAndFetchTools} disabled={initializingRef.current}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tools List */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Available Tools ({tools.length})</h2>
              <ScrollArea className="h-[calc(100vh-220px)]">
                <div className="space-y-2 pr-4">
                  {tools.map((tool) => (
                    <Card
                      key={tool.name}
                      className={`cursor-pointer transition-colors hover:border-primary ${
                        selectedTool?.name === tool.name ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0" onClick={() => selectTool(tool)}>
                            <CardTitle className="text-sm font-mono truncate">{tool.name}</CardTitle>
                            {tool.title && <p className="text-xs text-muted-foreground mt-0.5">{tool.title}</p>}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleToolExpand(tool.name)
                            }}
                          >
                            {expandedTools.has(tool.name) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        {expandedTools.has(tool.name) && (
                          <div className="mt-2 pt-2 border-t border-border">
                            {tool.description && (
                              <p className="text-xs text-muted-foreground mb-2">{tool.description}</p>
                            )}
                            {tool.inputSchema.properties && (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(tool.inputSchema.properties).map(([name, prop]) => (
                                  <Badge
                                    key={name}
                                    variant={tool.inputSchema.required?.includes(name) ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {name}: {prop.type}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Tool Execution Panel */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Execute Tool</h2>

              {selectedTool ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-mono text-base">{selectedTool.name}</CardTitle>
                    {selectedTool.description && <CardDescription>{selectedTool.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Input Parameters */}
                    {selectedTool.inputSchema.properties &&
                      Object.keys(selectedTool.inputSchema.properties).length > 0 && (
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Parameters</Label>
                          {Object.entries(selectedTool.inputSchema.properties).map(([name, prop]) => (
                            <div key={name} className="space-y-1">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                {name}
                                {selectedTool.inputSchema.required?.includes(name) && (
                                  <span className="text-destructive">*</span>
                                )}
                                <span className="text-muted-foreground/60">({prop.type})</span>
                              </Label>
                              {renderPropertyInput(
                                name,
                                prop,
                                selectedTool.inputSchema.required?.includes(name) || false,
                              )}
                              {prop.description && <p className="text-xs text-muted-foreground">{prop.description}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                    {/* Execute Button */}
                    <Button className="w-full" onClick={() => executeTool(selectedTool)} disabled={executing}>
                      {executing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Execute
                        </>
                      )}
                    </Button>

                    {/* Result */}
                    {result && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          Result
                          {result.isError && (
                            <Badge variant="destructive" className="text-xs">
                              Error
                            </Badge>
                          )}
                        </Label>
                        <ScrollArea className="h-[300px] rounded-md border border-border bg-muted/30">
                          <pre
                            className={`p-4 text-xs font-mono whitespace-pre-wrap break-words ${
                              result.isError ? "text-destructive" : ""
                            }`}
                          >
                            {formatResult(result)}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-20 text-center text-muted-foreground">
                    <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a tool from the list to execute it</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
