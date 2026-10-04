/**
 * Types för Pexels-integrationen.
 *
 * Ligger i separat fil eftersom "use server"-filer i Next 16 endast
 * får exportera async functions (ej types/interfaces).
 */

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  avg_color: string;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    tiny: string;
  };
}

export interface PexelsSearchResult {
  photos: PexelsPhoto[];
  totalResults: number;
  page: number;
  perPage: number;
  error?: string;
}

export interface PexelsDownloadResult {
  ok: boolean;
  path?: string;
  error?: string;
}
