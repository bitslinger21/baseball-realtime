/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NarrationStrip } from './NarrationStrip';

describe('NarrationStrip', () => {
  it('renders nothing when narration is null', () => {
    const { container } = render(<NarrationStrip narration={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders narration text when provided', () => {
    render(<NarrationStrip narration="Judge crushes one to left field!" />);
    expect(screen.getByText('Judge crushes one to left field!')).toBeTruthy();
  });

  it('updates when narration prop changes', () => {
    const { rerender } = render(<NarrationStrip narration="First narration." />);
    expect(screen.getByText('First narration.')).toBeTruthy();

    rerender(<NarrationStrip narration="Second narration." />);
    expect(screen.getByText('Second narration.')).toBeTruthy();
    expect(screen.queryByText('First narration.')).toBeNull();
  });
});
