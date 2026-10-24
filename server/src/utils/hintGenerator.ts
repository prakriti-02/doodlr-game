/**
 * Generates masked hint strings for guessers.
 */
export function generateInitialHint(word: string, mode: 'normal' | 'hidden' | 'combination' = 'normal'): string {
  if (mode === 'hidden') {
    // Hidden mode: hides length or shows generic question marks
    return '???';
  }

  // Preserve spaces and special characters, mask alphanumeric characters with '_'
  return word
    .split('')
    .map(char => (char === ' ' ? ' ' : char === '-' ? '-' : '_'))
    .join('');
}

/**
 * Progressively reveals letters in the hint.
 * @param word The original secret word
 * @param currentHint The current hint pattern
 * @param revealCount Number of new letters to reveal
 */
export function revealLetters(word: string, currentHint: string, revealCount: number = 1): string {
  const chars = word.split('');
  const hintChars = currentHint.split('');

  // Find all unrevealed letter indices (where hint is '_')
  const unrevealedIndices: number[] = [];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== ' ' && chars[i] !== '-' && hintChars[i] === '_') {
      unrevealedIndices.push(i);
    }
  }

  if (unrevealedIndices.length === 0) return currentHint;

  // Don't reveal the entire word if there's only 1 or 2 letters left
  const maxCanReveal = Math.max(0, unrevealedIndices.length - 1);
  const toReveal = Math.min(revealCount, maxCanReveal);

  // Shuffle unrevealed indices and pick
  const shuffled = [...unrevealedIndices].sort(() => 0.5 - Math.random());
  for (let i = 0; i < toReveal; i++) {
    const idx = shuffled[i];
    hintChars[idx] = chars[idx];
  }

  return hintChars.join('');
}

/**
 * Formats a hint pattern with spaces for clear rendering (e.g., "_ _ _   _ _ _ _")
 */
export function formatDisplayHint(hint: string): string {
  if (hint === '???') return '???';
  return hint
    .split('')
    .map(c => (c === ' ' ? '   ' : `${c} `))
    .join('')
    .trim();
}
