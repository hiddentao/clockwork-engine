# Clockwork Engine: WebAudioLayer Data URL Support

## Problem

`WebAudioLayer.loadSound()` throws an error when receiving data URL strings:

```typescript
// src/platform/web/WebAudioLayer.ts:59-61
if (typeof data === "string") {
  throw new Error("Loading from URL strings not yet implemented")
}
```

But `DemoLoader.fetchData()` (in game-base) returns data URLs for binary assets including audio files. This breaks the engine's `AssetLoader.loadSound()` flow.

## Fix Required

**File:** `src/platform/web/WebAudioLayer.ts`

**Change:** Replace the error throw with data URL → ArrayBuffer conversion:

```typescript
async loadSound(id: string, data: string | ArrayBuffer): Promise<void> {
  if (!this.context) {
    return
  }

  // Convert data URL string to ArrayBuffer
  if (typeof data === "string") {
    const response = await fetch(data)
    data = await response.arrayBuffer()
  }

  if (data.byteLength === 0) {
    const emptyBuffer = this.createBuffer(1, 1, 44100)
    this.buffers.set(id, emptyBuffer)
    return
  }

  try {
    const audioBuffer = await this.context.decodeAudioData(data)
    this.buffers.set(id, audioBuffer as AudioBuffer)
  } catch (error) {
    console.warn(`Failed to decode audio data for ${id}:`, error)
  }
}
```

## Why This Works

- `fetch()` can handle data URLs (e.g., `data:audio/mpeg;base64,...`)
- `response.arrayBuffer()` converts it to the format `decodeAudioData()` expects
- This maintains backwards compatibility - ArrayBuffer inputs still work as before

## Testing

After making this change:
1. Run existing tests: `bun test`
2. Test with a game that loads sounds via DemoLoader (e.g., tiki-kong)
