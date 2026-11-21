import { useCallback, useEffect, useState } from 'react';
import { listCategories } from '../api/categories';
import {
  archiveNote,
  createNote,
  deleteNote,
  listNotes,
  removeCategoryFromNote,
  unarchiveNote,
  updateNote,
} from '../api/notes';
import CategoryManager from '../components/CategoryManager';
import ConfirmDialog from '../components/ConfirmDialog';
import NoteCard from '../components/NoteCard';
import NoteFormModal from '../components/NoteFormModal';
import type { Category, Note, NoteInput, User } from '../types';

type View = 'active' | 'archived';

interface Props {
  user: User;
  onLogout: () => void;
}

export default function NotesPage({ user, onLogout }: Props) {
  const [view, setView] = useState<View>('active');
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Note | 'new' | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
  const [managingCategories, setManagingCategories] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      setNotes(await listNotes(view === 'archived', categoryFilter));
      setError(null);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, [view, categoryFilter]);

  const loadCategories = useCallback(async () => {
    try {
      const list = await listCategories();
      setCategories(list);
      // Drop the filter if its category no longer exists.
      setCategoryFilter((current) =>
        list.some((c) => c.id === current) ? current : undefined,
      );
    } catch (err) {
      setError(messageOf(err));
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  /** Runs a mutation, then refreshes the list; surfaces any error in the banner. */
  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      await loadNotes();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function handleSave(input: NoteInput) {
    if (editing === 'new') {
      await createNote(input);
    } else if (editing) {
      await updateNote(editing.id, input);
    }
    setEditing(null);
    await loadNotes();
  }

  const activeFilterName = categories.find(
    (c) => c.id === categoryFilter,
  )?.name;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>Notes</span>
        </div>
        <div className="topbar-user">
          <span className="muted">
            Signed in as <strong>{user.username}</strong>
          </span>
          <button className="btn btn-ghost" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="content">
        <div className="toolbar">
          <div className="tabs" role="tablist">
            <button
              role="tab"
              aria-selected={view === 'active'}
              className={view === 'active' ? 'tab active' : 'tab'}
              onClick={() => setView('active')}
            >
              Active
            </button>
            <button
              role="tab"
              aria-selected={view === 'archived'}
              className={view === 'archived' ? 'tab active' : 'tab'}
              onClick={() => setView('archived')}
            >
              Archived
            </button>
          </div>

          <div className="toolbar-actions">
            <label className="filter">
              <span className="sr-only">Filter by category</span>
              <select
                value={categoryFilter ?? ''}
                onChange={(e) =>
                  setCategoryFilter(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn btn-secondary"
              onClick={() => setManagingCategories(true)}
            >
              Categories
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setEditing('new')}
            >
              + New note
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
            <button className="alert-close" onClick={() => setError(null)}>
              ×
            </button>
          </div>
        )}

        {loading && notes.length === 0 ? (
          <p className="empty muted">Loading…</p>
        ) : notes.length === 0 ? (
          <div className="empty">
            <p>
              {view === 'active' ? 'No active notes' : 'No archived notes'}
              {activeFilterName ? ` in “${activeFilterName}”` : ''}.
            </p>
            {view === 'active' && (
              <button
                className="btn btn-secondary"
                onClick={() => setEditing('new')}
              >
                Create your first note
              </button>
            )}
          </div>
        ) : (
          <div className="grid">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={() => setEditing(note)}
                onDelete={() => setPendingDelete(note)}
                onToggleArchive={() =>
                  run(() =>
                    note.archived
                      ? unarchiveNote(note.id)
                      : archiveNote(note.id),
                  )
                }
                onRemoveCategory={(categoryId) =>
                  run(() => removeCategoryFromNote(note.id, categoryId))
                }
              />
            ))}
          </div>
        )}
      </main>

      {editing && (
        <NoteFormModal
          note={editing === 'new' ? null : editing}
          categories={categories}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete note?"
          message={`“${pendingDelete.title}” will be permanently deleted.`}
          confirmLabel="Delete"
          onCancel={() => setPendingDelete(null)}
          onConfirm={async () => {
            const { id } = pendingDelete;
            setPendingDelete(null);
            await run(() => deleteNote(id));
          }}
        />
      )}

      {managingCategories && (
        <CategoryManager
          categories={categories}
          onChanged={async () => {
            await loadCategories();
            await loadNotes();
          }}
          onClose={() => setManagingCategories(false)}
        />
      )}
    </div>
  );
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}
