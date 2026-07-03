/// <reference types="vitest/globals" />
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSpeechSynthesis = {
  cancel: vi.fn(),
  speak: vi.fn(),
};

beforeEach(() => {
  Object.defineProperty(window, 'speechSynthesis', {
    value: mockSpeechSynthesis,
    writable: true,
  });
  vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; rate = 1; pitch = 1; constructor(text: string) { this.text = text; } });
  mockSpeechSynthesis.cancel.mockClear();
  mockSpeechSynthesis.speak.mockClear();
});
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
