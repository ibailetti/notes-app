import type { Note } from '../types';

interface Props {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
  onToggleArchive: () => void;
  onRemoveCategory: (categoryId: number) => void;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'full',
  timeStyle: 'short',
});

export default function NoteCard({
  note,
  onEdit,
  onDelete,
  onToggleArchive,
  onRemoveCategory,
}: Props) {
  return (
    <article className={note.archived ? 'card archived' : 'card'}>
      <h3 className="card-title">{note.title}</h3>
      {note.content ? (
        <p className="card-content">{note.content}</p>
      ) : (
        <p className="card-content muted">No content</p>
      )}

      {note.categories.length > 0 && (
        <ul className="chips">
          {note.categories.map((category) => (
            <li key={category.id} className="chip">
              {category.name}
              <button
                className="chip-remove"
                title={`Remove “${category.name}”`}
                aria-label={`Remove category ${category.name}`}
                onClick={() => onRemoveCategory(category.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className="card-footer">
        <time
          className="muted small"
          dateTime={note.updatedAt}
          title={`Updated ${dateTimeFormat.format(new Date(note.updatedAt))}`}
        >
          {dateFormat.format(new Date(note.updatedAt))}
        </time>
        <div className="card-actions">
          <button className="btn btn-small btn-ghost" onClick={onEdit}>
            Edit
          </button>
          <button className="btn btn-small btn-ghost" onClick={onToggleArchive}>
            {note.archived ? 'Unarchive' : 'Archive'}
          </button>
          <button className="btn btn-small btn-ghost danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </footer>
    </article>
  );
}
