import type { Category } from '../types';
import { request } from './client';

export function listCategories(): Promise<Category[]> {
  return request<Category[]>('GET', '/categories');
}

export function createCategory(name: string): Promise<Category> {
  return request<Category>('POST', '/categories', { name });
}

export function deleteCategory(id: number): Promise<void> {
  return request<void>('DELETE', `/categories/${id}`);
}
