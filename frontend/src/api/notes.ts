import type { Note, NoteInput } from '../types';
import { request } from './client';

export function listNotes(
  archived: boolean,
  categoryId?: number,
): Promise<Note[]> {
  const params = new URLSearchParams({ archived: String(archived) });
  if (categoryId !== undefined) params.set('categoryId', String(categoryId));
  return request<Note[]>('GET', `/notes?${params.toString()}`);
}

export function createNote(input: NoteInput): Promise<Note> {
  return request<Note>('POST', '/notes', input);
}

export function updateNote(id: number, input: NoteInput): Promise<Note> {
  return request<Note>('PATCH', `/notes/${id}`, input);
}

export function deleteNote(id: number): Promise<void> {
  return request<void>('DELETE', `/notes/${id}`);
}

export function archiveNote(id: number): Promise<Note> {
  return request<Note>('PATCH', `/notes/${id}/archive`);
}

export function unarchiveNote(id: number): Promise<Note> {
  return request<Note>('PATCH', `/notes/${id}/unarchive`);
}

export function removeCategoryFromNote(
  id: number,
  categoryId: number,
): Promise<Note> {
  return request<Note>('DELETE', `/notes/${id}/categories/${categoryId}`);
}
