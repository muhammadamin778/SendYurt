import { randomInt } from "crypto";

// Unambiguous alphabet: no 0/O, 1/I/L to keep codes easy to read aloud
// over a phone call between family members.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}
