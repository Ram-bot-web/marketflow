/**
 * Image optimization utilities
 * Provides lazy loading and responsive image handling
 */

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png';
}

/**
 * Generate optimized image URL
 * For use with image CDN or optimization service
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  options: ImageOptions = {}
): string {
  const { width, height, quality = 80, format = 'webp' } = options;
  
  // If using a CDN like Cloudinary, Imgix, etc., add transformation params
  // Example for Cloudinary:
  // return `${originalUrl}?w=${width}&h=${height}&q=${quality}&f=${format}`
  
  // For now, return original URL
  // In production, integrate with your image optimization service
  return originalUrl;
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  return widths
    .map(width => `${getOptimizedImageUrl(baseUrl, { width })} ${width}w`)
    .join(', ');
}

/**
 * Lazy load image component props
 */
export interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Get placeholder image (blur or low quality)
 */
export function getPlaceholderImage(width: number, height: number): string {
  // Generate a data URI for a tiny placeholder
  // In production, use a proper placeholder service
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, width, height);
  }
  return canvas.toDataURL();
}

/**
 * Preload image
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Check if image is cached
 */
export function isImageCached(src: string): boolean {
  const img = new Image();
  img.src = src;
  return img.complete;
}



