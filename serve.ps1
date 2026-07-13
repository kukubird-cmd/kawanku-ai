# Simple PowerShell static file server for MindBuddy
$port = 8086
$localDir = "C:\Users\zheho\.gemini\antigravity\scratch\kawanku-ai"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
    $listener.Start()
    Write-Host "Server started successfully."
    Write-Host "Access the website at: http://localhost:$port/"
    Write-Host "Press Ctrl+C in the terminal (or stop the task) to stop the server."
} catch {
    Write-Error "Failed to start listener. Is port $port already in use?"
    exit 1
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $urlPath = $request.RawUrl.Split('?')[0]
        if ($urlPath -eq "/" -or $urlPath -eq "") {
            $urlPath = "/index.html"
        }
        
        $localPath = Join-Path $localDir $urlPath.TrimStart('/')
        
        # Prevent path traversal security issues
        $resolvedPath = [System.IO.Path]::GetFullPath($localPath)
        $resolvedDir = [System.IO.Path]::GetFullPath($localDir)
        if (-not $resolvedPath.StartsWith($resolvedDir)) {
            $response.StatusCode = 403
            $msg = [System.Text.Encoding]::UTF8.GetBytes("Forbidden")
            $response.ContentLength64 = $msg.Length
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($msg, 0, $msg.Length)
            }
            $response.OutputStream.Close()
            continue
        }
        
        if (Test-Path $resolvedPath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($resolvedPath)
            
            $ext = [System.IO.Path]::GetExtension($resolvedPath).ToLower()
            $contentType = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".svg"  { "image/svg+xml; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".gif"  { "image/gif" }
                ".ico"  { "image/x-icon" }
                ".json" { "application/json; charset=utf-8" }
                ".mp4"  { "video/mp4" }
                ".webm" { "video/webm" }
                ".ogg"  { "video/ogg" }
                default { "application/octet-stream" }
            }
            
            $response.ContentType = $contentType
            $response.ContentLength64 = $content.Length
            # Force no-cache to prevent browser caching stale JS/CSS
            $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
            $response.Headers.Add("Pragma", "no-cache")
            $response.Headers.Add("Expires", "0")
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($content, 0, $content.Length)
            }
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("File Not Found: $urlPath")
            $response.ContentLength64 = $msg.Length  # Fix: must set before writing body
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($msg, 0, $msg.Length)
            }
        }
        $response.OutputStream.Close()
    } catch {
        # Catch errors per-request so the server doesn't stop
        Write-Warning "Error handling request: $_"
    }
}

