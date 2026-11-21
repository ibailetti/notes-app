import { useState, type FormEvent } from 'react';
import type { Category, Note, NoteInput } from '../types';
import Modal from './Modal';

interface Props {
  note: Note | null;
  categories: Category[];
  onSave: (input: NoteInput) => Promise<void>;
  onCancel: () => void;
}

export default function NoteFormModal({
  note,
  categories,
  onSave,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(note?.categories.map((c) => c.id)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        content,
        categoryIds: [...selected],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the note');
      setSaving(false);
    }
  }

  return (
    <Modal
      title={note ? 'Edit note' : 'New note'}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="submit"
            form="note-form"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="note-form" className="form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <label className="field">
          <span>Title</span>
          <input
            autoFocus
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Content</span>
          <textarea
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </label>
        <fieldset className="field">
          <legend>Categories</legend>
          {categories.length === 0 ? (
            <p className="muted small">
              No categories yet. Create some from the “Categories” button.
            </p>
          ) : (
            <div className="chip-picker">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className={
                    selected.has(category.id) ? 'pick selected' : 'pick'
                  }
                >
                  <input
                    type="checkbox"
                    checked={selected.has(category.id)}
                    onChange={() => toggle(category.id)}
                  />
                  {category.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}
