import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
} from '@client/src/utils/api-client';
import type {
  CollectionCard,
  CollectionListQuery,
  PagedResponse,
} from '@shared/api.interface';

export async function getCollectionList(
  params?: CollectionListQuery,
): Promise<PagedResponse<CollectionCard>> {
  const res = await apiGet<{ data: PagedResponse<CollectionCard> }>(
    '/api/collection',
    params,
  );
  return res.data;
}

export async function getCollectionCategories(): Promise<string[]> {
  const res = await apiGet<{ data: string[] }>(
    '/api/collection/categories',
  );
  return res.data;
}

export async function getCollectionFeatured(): Promise<CollectionCard[]> {
  const res = await apiGet<{ data: CollectionCard[] }>(
    '/api/collection/featured',
  );
  return res.data;
}

export async function getCollectionCard(id: string): Promise<CollectionCard> {
  const res = await apiGet<{ data: CollectionCard }>(
    `/api/collection/${id}`,
  );
  return res.data;
}

export async function createCollectionCard(
  data: Partial<CollectionCard>,
): Promise<CollectionCard> {
  const res = await apiPost<{ data: CollectionCard }>(
    '/api/collection',
    data,
  );
  return res.data;
}

export async function updateCollectionCard(
  id: string,
  data: Partial<CollectionCard>,
): Promise<CollectionCard> {
  const res = await apiPut<{ data: CollectionCard }>(
    `/api/collection/${id}`,
    data,
  );
  return res.data;
}

export async function deleteCollectionCard(id: string): Promise<void> {
  await apiDelete(`/api/collection/${id}`);
}
