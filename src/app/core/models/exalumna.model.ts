/**
 * Exalumna Story Status Type
 */
export type StoryStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Exalumna Story Model representation in frontend
 */
export interface ExalumnaStory {
  id: string;
  description: string;
  photos: string[]; // URLs of the story photos
  status: StoryStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for public exalumna story submission
 */
export interface SubmitStoryDto {
  description: string;
  photos: File[]; // Uploaded files
}

/**
 * Filters for admin exalumnas moderation panel
 */
export interface StoryFilters {
  status?: StoryStatus;
  page?: number;
  pageSize?: number;
}

/**
 * Paginated stories wrapper
 */
export interface PaginatedStories {
  data: ExalumnaStory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
