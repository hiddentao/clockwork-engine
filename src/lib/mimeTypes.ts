const IMAGE_MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
}

/**
 * Get the MIME type for an image based on file path extension.
 * @param path - File path or filename with extension
 * @returns MIME type string, defaults to 'image/png' for unknown extensions
 */
export function getImageMimeType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? ""
  return IMAGE_MIME_TYPES[ext] ?? "image/png"
}
