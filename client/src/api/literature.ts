import {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
} from '@client/src/utils/api-client';
import type {
  LiteraturePost,
  LiteratureTag,
  LiteratureComment,
  LiteraturePostQuery,
  CreateLiteraturePostRequest,
  CreateLiteratureCommentRequest,
  ReviewPostRequest,
  PagedResponse,
} from '@shared/api.interface';

interface CommentListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export async function getPosts(
  params?: LiteraturePostQuery,
): Promise<PagedResponse<LiteraturePost>> {
  const res = await apiGet<{ data: PagedResponse<LiteraturePost> }>(
    '/api/literature/posts',
    params,
  );
  return res.data;
}

export async function getPost(id: string): Promise<LiteraturePost> {
  const res = await apiGet<{ data: LiteraturePost }>(
    `/api/literature/posts/${id}`,
  );
  return res.data;
}

export async function createPost(
  data: CreateLiteraturePostRequest,
): Promise<LiteraturePost> {
  const res = await apiPost<{ data: LiteraturePost }>(
    '/api/literature/posts',
    data,
  );
  return res.data;
}

export async function getTags(): Promise<LiteratureTag[]> {
  const res = await apiGet<{ data: LiteratureTag[] }>('/api/literature/tags');
  return res.data;
}

export async function getComments(
  postId: string,
  params?: CommentListQuery,
): Promise<PagedResponse<LiteratureComment>> {
  const res = await apiGet<{ data: PagedResponse<LiteratureComment> }>(
    `/api/literature/posts/${postId}/comments`,
    params,
  );
  return res.data;
}

export async function createComment(
  postId: string,
  data: CreateLiteratureCommentRequest,
): Promise<LiteratureComment> {
  const res = await apiPost<{ data: LiteratureComment }>(
    `/api/literature/posts/${postId}/comments`,
    data,
  );
  return res.data;
}

// === Admin ===

export async function getAdminPosts(
  params?: LiteraturePostQuery,
): Promise<PagedResponse<LiteraturePost>> {
  const res = await apiGet<{ data: PagedResponse<LiteraturePost> }>(
    '/api/literature/admin/posts',
    params,
  );
  return res.data;
}

export async function reviewPost(
  id: string,
  data: ReviewPostRequest,
): Promise<void> {
  await apiPost(`/api/literature/admin/posts/${id}/review`, data);
}

export async function updatePostAdmin(
  id: string,
  data: Partial<LiteraturePost>,
): Promise<LiteraturePost> {
  const res = await apiPut<{ data: LiteraturePost }>(
    `/api/literature/admin/posts/${id}`,
    data,
  );
  return res.data;
}

export async function deletePostAdmin(id: string): Promise<void> {
  await apiDelete(`/api/literature/admin/posts/${id}`);
}

export async function getAdminComments(
  params?: CommentListQuery & { status?: string },
): Promise<PagedResponse<LiteratureComment>> {
  const res = await apiGet<{ data: PagedResponse<LiteratureComment> }>(
    '/api/literature/admin/comments',
    params,
  );
  return res.data;
}

export async function deleteCommentAdmin(id: string): Promise<void> {
  await apiDelete(`/api/literature/admin/comments/${id}`);
}

export async function createTag(
  data: Partial<LiteratureTag>,
): Promise<LiteratureTag> {
  const res = await apiPost<{ data: LiteratureTag }>(
    '/api/literature/admin/tags',
    data,
  );
  return res.data;
}

export async function updateTag(
  id: string,
  data: Partial<LiteratureTag>,
): Promise<LiteratureTag> {
  const res = await apiPut<{ data: LiteratureTag }>(
    `/api/literature/admin/tags/${id}`,
    data,
  );
  return res.data;
}

export async function deleteTag(id: string): Promise<void> {
  await apiDelete(`/api/literature/admin/tags/${id}`);
}
