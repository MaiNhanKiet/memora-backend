import { BadRequestException } from '@nestjs/common';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_SECRET_LENGTH = 8;
const MAX_SECRET_LENGTH = 128;
const UPPERCASE_PATTERN = /[A-Z]/;
const DIGIT_PATTERN = /\d/;
const SPECIAL_PATTERN = /[^A-Za-z0-9\s]/;

export function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new BadRequestException('Email is invalid');
  }
  return normalized;
}

export function assertPasswordLength(password: string): void {
  if (
    password.length < MIN_SECRET_LENGTH ||
    password.length > MAX_SECRET_LENGTH
  ) {
    throw new BadRequestException('Credentials do not meet requirements');
  }
}

export function assertValidPassword(password: string): void {
  assertPasswordLength(password);
  if (
    !UPPERCASE_PATTERN.test(password) ||
    !DIGIT_PATTERN.test(password) ||
    !SPECIAL_PATTERN.test(password)
  ) {
    throw new BadRequestException('Credentials do not meet requirements');
  }
}
