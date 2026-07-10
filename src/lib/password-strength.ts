export type Strength = "weak" | "fair" | "strong";

// Mirrors the server-side minimum (8+ chars, letter + digit) and adds
// softer signals for the meter. Never blocks beyond the server rule.
export function passwordStrength(password: string): {
  strength: Strength;
  meetsMinimum: boolean;
} {
  const meetsMinimum =
    password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const strength: Strength = !meetsMinimum || score <= 2 ? "weak" : score <= 3 ? "fair" : "strong";
  return { strength, meetsMinimum };
}
