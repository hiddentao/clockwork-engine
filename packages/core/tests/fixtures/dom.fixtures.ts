/**
 * DOM test fixtures
 *
 * Helper functions for creating DOM elements for testing
 */

/**
 * Create a test container div
 */
export function createTestContainer(): HTMLDivElement {
  const container = document.createElement("div")
  container.id = "test-container"
  container.style.width = "800px"
  container.style.height = "600px"
  document.body.appendChild(container)
  return container
}

/**
 * Cleanup a test container
 */
export function cleanupTestContainer(container: HTMLDivElement) {
  if (container.parentNode) {
    container.parentNode.removeChild(container)
  }
}

/**
 * Create a mock canvas element
 */
export function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = 800
  canvas.height = 600

  // Mock getContext for WebGL
  const originalGetContext = canvas.getContext.bind(canvas)
  canvas.getContext = function (contextType: string, options?: any) {
    if (contextType === "webgl" || contextType === "webgl2") {
      // Return a minimal WebGL mock
      return {
        canvas,
        drawingBufferWidth: canvas.width,
        drawingBufferHeight: canvas.height,
        getParameter: () => null,
        getExtension: () => null,
        // Add minimal WebGL methods as needed
      } as any
    }
    return originalGetContext(contextType, options)
  } as any

  return canvas
}

/**
 * Mock Blob for testing
 */
export function mockBlob() {
  if (typeof global.Blob === "undefined") {
    global.Blob = class Blob {
      constructor(
        public parts: any[],
        public options?: any,
      ) {}
    } as any
  }
}

/**
 * Mock URL.createObjectURL for testing
 */
export function mockURL() {
  if (typeof global.URL === "undefined" || !global.URL.createObjectURL) {
    global.URL = {
      createObjectURL: (_blob: Blob) => `blob:mock-${Math.random()}`,
      revokeObjectURL: (_url: string) => {
        // No-op mock
      },
    } as any
  }
}

/**
 * Setup all DOM mocks
 */
export function setupDOMMocks() {
  mockBlob()
  mockURL()
}
