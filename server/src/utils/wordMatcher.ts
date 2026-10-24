/**
 * Normalizes text for case-insensitive, whitespace-trimmed comparison.
 */
export function normalizeWord(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '') // remove special characters
    .replace(/\s+/g, ' '); // collapse consecutive spaces
}

/**
 * Checks whether the guess strictly matches the target word.
 */
export function isExactMatch(guess: string, target: string): boolean {
  const normGuess = normalizeWord(guess);
  const normTarget = normalizeWord(target);
  return normGuess.length > 0 && normGuess === normTarget;
}

/**
 * Calculates Levenshtein Distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks if a guess is very close to the target word (e.g. 1 or 2 typos away).
 * Useful for showing a private "You are very close!" hint without giving it away publicly.
 */
export function isCloseMatch(guess: string, target: string): boolean {
  const normGuess = normalizeWord(guess);
  const normTarget = normalizeWord(target);

  if (!normGuess || !normTarget || normGuess === normTarget) return false;

  const dist = levenshteinDistance(normGuess, normTarget);
  const targetLen = normTarget.length;

  if (targetLen >= 4 && targetLen <= 6 && dist === 1) return true;
  if (targetLen > 6 && dist <= 2) return true;

  return false;
}
