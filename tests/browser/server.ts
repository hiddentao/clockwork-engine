/**
 * Simple test server for browser tests
 * Serves the clockwork-engine bundles and test page
 */

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url)
    let filePath = url.pathname

    // Serve test page
    if (filePath === "/" || filePath === "/tests/browser/test-page.html") {
      const file = Bun.file("./tests/browser/test-page.html")
      return new Response(file, {
        headers: { "Content-Type": "text/html" },
      })
    }

    // Serve bundles and other dist files
    if (filePath.startsWith("/dist/")) {
      try {
        const file = Bun.file("." + filePath)
        const exists = await file.exists()
        if (exists) {
          let contentType = "application/javascript"
          if (filePath.endsWith(".map")) {
            contentType = "application/json"
          }
          return new Response(file, {
            headers: {
              "Content-Type": contentType,
              "Access-Control-Allow-Origin": "*",
            },
          })
        }
      } catch (_e) {
        // File not found
      }
    }

    // Serve test-data files
    if (filePath.startsWith("/tests/browser/test-data/")) {
      try {
        const file = Bun.file("." + filePath)
        const exists = await file.exists()
        if (exists) {
          let contentType = "application/octet-stream"
          if (filePath.endsWith(".json")) {
            contentType = "application/json"
          } else if (filePath.endsWith(".webp")) {
            contentType = "image/webp"
          } else if (filePath.endsWith(".png")) {
            contentType = "image/png"
          }
          return new Response(file, {
            headers: {
              "Content-Type": contentType,
              "Access-Control-Allow-Origin": "*",
            },
          })
        }
      } catch (_e) {
        // File not found
      }
    }

    return new Response("Not Found", { status: 404 })
  },
})

console.log(`Test server running at http://localhost:${server.port}`)
console.log(`Serving clockwork-engine bundles from /dist/`)
