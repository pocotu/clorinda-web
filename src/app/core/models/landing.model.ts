export type PostType = 'COMUNICADO' | 'AVISO' | 'GALERIA' | 'DESTACADO';
export type PostStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'UNPUBLISHED';

export interface LandingPost {
  id: string;
  postType: PostType;
  title: string;
  summary?: string;
  content: string;
  imageUrl?: string;
  status: PostStatus;
  createdBy: string;
  approvedBy?: string;
  publishedBy?: string;
  publishAt?: string; // ISO 8601 date string
  expireAt?: string; // ISO 8601 date string
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostDto {
  postType: PostType;
  title: string;
  summary?: string;
  content: string;
  imageUrl?: string;
  publishAt?: string;
  expireAt?: string;
}

export interface UpdatePostDto {
  postType?: PostType;
  title?: string;
  summary?: string;
  content?: string;
  imageUrl?: string;
  publishAt?: string;
  expireAt?: string;
}

export interface PublishPostDto {
  publishAt?: string;
}

export interface UnpublishPostDto {
  reason: string;
}

export interface PostFilters {
  postType?: PostType;
  status?: PostStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedPosts {
  data: LandingPost[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
