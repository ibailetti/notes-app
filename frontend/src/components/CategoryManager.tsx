import { useState, type FormEvent } from 'react';
import { createCategory, deleteCategory } from '../api/categories';
import type { Category } from '../types';
import Modal from './Modal';

interface Props {
  categories: Category[];
  onChanged: () => Promise<void>;
  onClose: () => void;
}

export default function CategoryManager({
  categories,
  onChanged,
  onClose,
}: Props) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function perform(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onChanged();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (await perform(() => createCategory(trimmed))) setName('');
  }

  return (
    <Modal title="Categories" size="sm" onClose={onClose}>
      <form className="inline-form" onSubmit={handleCreate}>
        <input
          autoFocus
          placeholder="New category name"
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn btn-primary" disabled={busy || !name.trim()}>
          Add
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {categories.length === 0 ? (
        <p className="muted small">No categories yet.</p>
      ) : (
        <ul className="category-list">
          {categories.map((category) => (
            <li key={category.id}>
              <span>{category.name}</span>
              <button
                className="btn btn-small btn-ghost danger"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete category “${category.name}”? It will be removed from all notes.`,
                    )
                  ) {
                    void perform(() => deleteCategory(category.id));
                  }
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
