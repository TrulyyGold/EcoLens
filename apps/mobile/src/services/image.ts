import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import type { LocalImage } from '../types/scan';

export interface ImageAssetLike {
  uri: string;
  width: number;
  height: number;
  fileSize?: number | null;
  mimeType?: string | null;
  fileName?: string | null;
}

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_EDGE = 1600;
const MIN_EDGE = 180;
const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageValidationError';
  }
}

export function validateImageAsset(asset: ImageAssetLike): void {
  if (!asset.uri) {
    throw new ImageValidationError('The selected image could not be opened. Choose another photo.');
  }
  if (asset.fileSize != null && asset.fileSize > MAX_SOURCE_BYTES) {
    throw new ImageValidationError('This image is larger than 25 MB. Choose a smaller photo.');
  }
  if (asset.mimeType && !ACCEPTED_MIME_TYPES.has(asset.mimeType.toLowerCase())) {
    throw new ImageValidationError('Use a JPEG, PNG, WebP, HEIC, or HEIF image.');
  }
  if (asset.width > 0 && asset.height > 0 && Math.min(asset.width, asset.height) < MIN_EDGE) {
    throw new ImageValidationError('This image is too small to analyze. Use a photo at least 180 px on each side.');
  }
}

export async function prepareImage(asset: ImageAssetLike): Promise<LocalImage> {
  validateImageAsset(asset);

  const longestEdge = Math.max(asset.width, asset.height);
  const resize = longestEdge > MAX_EDGE
    ? asset.width >= asset.height
      ? { width: MAX_EDGE }
      : { height: MAX_EDGE }
    : undefined;

  const transformed = await manipulateAsync(
    asset.uri,
    resize ? [{ resize }] : [],
    { compress: 0.82, format: SaveFormat.JPEG },
  );

  return {
    uri: transformed.uri,
    width: transformed.width,
    height: transformed.height,
    mimeType: 'image/jpeg',
    fileName: 'ecolens-scan.jpg',
  };
}
