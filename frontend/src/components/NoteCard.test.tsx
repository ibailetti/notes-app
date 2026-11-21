import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Note } from '../types';
import NoteCard from './NoteCard';

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 1,
    title: 'Quarterly planning',
    content: 'Draft the roadmap',
    archived: false,
    createdAt: '2026-11-21T10:00:00.000Z',
    updatedAt: '2026-11-21T10:00:00.000Z',
    categories: [{ id: 2, name: 'Work' }],
    ...overrides,
  };
}

function renderCard(note: Note) {
  const handlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleArchive: vi.fn(),
    onRemoveCategory: vi.fn(),
  };
  render(<NoteCard note={note} {...handlers} />);
  return handlers;
}

describe('NoteCard', () => {
  it('shows the title, content and categories', () => {
    renderCard(makeNote());

    expect(
      screen.getByRole('heading', { name: 'Quarterly planning' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Draft the roadmap')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('shows a placeholder when the note has no content', () => {
    renderCard(makeNote({ content: '' }));

    expect(screen.getByText('No content')).toBeInTheDocument();
  });

  it('offers Archive for an active note and Unarchive for an archived one', async () => {
    const user = userEvent.setup();
    const handlers = renderCard(makeNote({ archived: false }));
    await user.click(screen.getByRole('button', { name: 'Archive' }));
    expect(handlers.onToggleArchive).toHaveBeenCalledTimes(1);

    renderCard(makeNote({ id: 2, archived: true }));
    expect(
      screen.getByRole('button', { name: 'Unarchive' }),
    ).toBeInTheDocument();
  });

  it('calls the matching handlers for edit, delete and category removal', async () => {
    const user = userEvent.setup();
    const handlers = renderCard(makeNote());

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(
      screen.getByRole('button', { name: 'Remove category Work' }),
    );

    expect(handlers.onEdit).toHaveBeenCalledTimes(1);
    expect(handlers.onDelete).toHaveBeenCalledTimes(1);
    expect(handlers.onRemoveCategory).toHaveBeenCalledWith(2);
  });
});
