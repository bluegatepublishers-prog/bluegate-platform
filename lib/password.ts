import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

const INITIAL_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const INITIAL_PASSWORD_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const INITIAL_PASSWORD_DIGITS = "23456789";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
) {
  return bcrypt.compare(password, hash);
}

export function generateInitialPassword(length = 16) {
  if (!Number.isInteger(length) || length < 12 || length > 64) {
    throw new Error("Initial password length must be between 12 and 64 characters.");
  }
  const characters = [
    INITIAL_PASSWORD_LETTERS[randomInt(INITIAL_PASSWORD_LETTERS.length)],
    INITIAL_PASSWORD_DIGITS[randomInt(INITIAL_PASSWORD_DIGITS.length)],
    ...Array.from({ length: length - 2 }, () => INITIAL_PASSWORD_ALPHABET[randomInt(INITIAL_PASSWORD_ALPHABET.length)]),
  ];
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }
  return characters.join("");
}
