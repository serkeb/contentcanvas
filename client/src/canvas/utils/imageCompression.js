/**
 * Utility functions for image compression and optimization
 */

const MAX_IMAGE_SIZE = 1920 // max width/height in pixels
const QUALITY = 0.85 // JPEG quality

/**
 * Compresses an image before storing it
 * @param {string} dataUrl - The base64 data URL of the image
 * @returns {Promise<string>} - Compressed base64 data URL
 */
export async function compressImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      // Calculate new dimensions (maintain aspect ratio)
      let width = img.width
      let height = img.height

      if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_IMAGE_SIZE) / width)
          width = MAX_IMAGE_SIZE
        } else {
          width = Math.round((width * MAX_IMAGE_SIZE) / height)
          height = MAX_IMAGE_SIZE
        }
      }

      // Create canvas and compress
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to compressed JPEG
      const compressedDataUrl = canvas.toDataURL('image/jpeg', QUALITY)
      resolve(compressedDataUrl)
    }
    img.onerror = () => resolve(dataUrl) // Return original if compression fails
    img.src = dataUrl
  })
}

/**
 * Estimates the size in bytes of a base64 string
 * @param {string} base64String - The base64 string
 * @returns {number} - Estimated size in bytes
 */
export function estimateBase64Size(base64String) {
  // Remove the data:image/...;base64, prefix if present
  const base64Data = base64String.split(',')[1] || base64String
  return Math.round(base64Data.length * 0.75) // base64 is ~33% larger than binary
}

/**
 * Formats a size in bytes to human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string
 */
export function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
