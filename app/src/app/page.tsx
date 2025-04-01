"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText, AlertCircle, Loader2, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface FileResult {
  fileName: string
  text: string
  error?: string
}

export default function PDFProcessor() {
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<FileResult[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0) return

    setLoading(true)
    setUploadProgress(0)
    setProcessingTime(null)

    // Start the timer
    const start = performance.now()
    setStartTime(start)

    const formData = new FormData()
    files.forEach((file) => formData.append("pdfs", file))

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval)
            return 95
          }
          return prev + 5
        })
      }, 200)

      const response = await fetch("http://localhost:3001/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const data = await response.json()
      setResults(data)

      // Calculate and set the processing time
      const end = performance.now()
      setProcessingTime(end - start)
    } catch (error) {
      console.error("Error:", error)
      // Even on error, calculate processing time
      const end = performance.now()
      setProcessingTime(end - start)
    } finally {
      setTimeout(() => {
        setLoading(false)
      }, 500) // Keep progress bar at 100% for a moment
    }
  }

  const clearFiles = () => {
    setFiles([])
  }

  const formatTime = (ms: number): string => {
    return `${ms.toFixed(2)}ms`
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">PDF Processor</CardTitle>
          </div>
          <CardDescription>Upload PDF files to extract and process their content</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer relative">
              <input
                type="file"
                multiple
                accept="application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={loading}
              />
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium mb-1">Drag and drop your PDF files here or click to browse</p>
              <p className="text-xs text-muted-foreground">You can upload multiple PDF files at once</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Selected Files ({files.length})</h3>
                  <Button variant="ghost" size="sm" onClick={clearFiles} disabled={loading} type="button">
                    Clear All
                  </Button>
                </div>
                <ScrollArea className="h-32 rounded border p-2">
                  <ul className="space-y-2">
                    {files.map((file, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="truncate flex-1">{file.name}</span>
                        <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            {loading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Uploading and processing...</span>
                  <div className="flex items-center gap-2">
                    {startTime && <span className="font-mono">{formatTime(performance.now() - startTime)}</span>}
                    <span>{uploadProgress}%</span>
                  </div>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t py-4">
          <Button type="submit" onClick={handleSubmit} disabled={loading || files.length === 0} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload & Process
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {results.length > 0 && (
        <Card className="mt-8 shadow-lg">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Processing Results</CardTitle>
                <CardDescription>
                  Extracted content from {results.length} PDF file{results.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              {processingTime !== null && (
                <div className="flex flex-col items-end">
                  <Badge variant="outline" className="font-mono">
                    <Timer className="h-3 w-3 mr-1" />
                    {formatTime(processingTime)}
                  </Badge>
                  <span className="text-xs text-muted-foreground mt-1">Processing Time</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Files ({results.length})</TabsTrigger>
                <TabsTrigger value="success">Successful ({results.filter((r) => !r.error).length})</TabsTrigger>
                <TabsTrigger value="errors">Errors ({results.filter((r) => r.error).length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {results.map((result, index) => (
                  <ResultCard key={index} result={result} index={index} />
                ))}
              </TabsContent>

              <TabsContent value="success" className="space-y-4">
                {results
                  .filter((result) => !result.error)
                  .map((result, index) => (
                    <ResultCard key={index} result={result} index={index} />
                  ))}
              </TabsContent>

              <TabsContent value="errors" className="space-y-4">
                {results
                  .filter((result) => result.error)
                  .map((result, index) => (
                    <ResultCard key={index} result={result} index={index} />
                  ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ResultCard({ result, index }: { result: FileResult; index: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card key={index} className={result.error ? "border-destructive/50" : ""}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-medium">{result.fileName}</CardTitle>
          </div>
          <Badge variant={result.error ? "destructive" : "secondary"}>{result.error ? "Error" : "Success"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="py-3 px-4">
        {result.error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Processing Error</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <div className={`text-sm ${expanded ? "" : "max-h-24 overflow-hidden"}`}>
                <p>{result.text}</p>
              </div>
              {!expanded && result.text.length > 200 && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
              )}
            </div>
            {result.text.length > 200 && (
              <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="text-xs">
                {expanded ? "Show Less" : "Show More"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

