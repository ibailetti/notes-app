export interface User {
  id: number;
  username: string;
}

export interface Session {
  token: string;
  user: User;
}

export interface Category {
  id: number;
  name: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  categories: Category[];
}

export interface NoteInput {
  title: string;
  content: string;
  categoryIds: number[];
}
