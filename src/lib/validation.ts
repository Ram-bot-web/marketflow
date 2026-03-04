/**
 * Input validation utilities
 * Provides comprehensive validation for user inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Email validation
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  if (email.length > 254) {
    return { isValid: false, error: 'Email address is too long' };
  }
  
  return { isValid: true };
}

// Password validation with policy
export interface PasswordPolicy {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  maxLength?: number;
}

const defaultPasswordPolicy: Required<PasswordPolicy> = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

export function validatePassword(
  password: string,
  policy: PasswordPolicy = defaultPasswordPolicy
): ValidationResult {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }
  
  const minLength = policy.minLength ?? defaultPasswordPolicy.minLength;
  const maxLength = policy.maxLength ?? defaultPasswordPolicy.maxLength;
  const requireUppercase = policy.requireUppercase ?? defaultPasswordPolicy.requireUppercase;
  const requireLowercase = policy.requireLowercase ?? defaultPasswordPolicy.requireLowercase;
  const requireNumbers = policy.requireNumbers ?? defaultPasswordPolicy.requireNumbers;
  const requireSpecialChars = policy.requireSpecialChars ?? defaultPasswordPolicy.requireSpecialChars;
  
  if (password.length < minLength) {
    return { isValid: false, error: `Password must be at least ${minLength} characters long` };
  }
  
  if (password.length > maxLength) {
    return { isValid: false, error: `Password must be no more than ${maxLength} characters long` };
  }
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  if (requireNumbers && !/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  
  if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character' };
  }
  
  return { isValid: true };
}

// String validation
export function validateString(
  value: string,
  options: {
    minLength?: number;
    maxLength?: number;
    required?: boolean;
    pattern?: RegExp;
    patternMessage?: string;
  } = {}
): ValidationResult {
  const {
    minLength = 0,
    maxLength = 10000,
    required = false,
    pattern,
    patternMessage,
  } = options;
  
  if (required && (!value || value.trim().length === 0)) {
    return { isValid: false, error: 'This field is required' };
  }
  
  if (value && typeof value !== 'string') {
    return { isValid: false, error: 'Invalid input type' };
  }
  
  if (value && value.length < minLength) {
    return { isValid: false, error: `Must be at least ${minLength} characters long` };
  }
  
  if (value && value.length > maxLength) {
    return { isValid: false, error: `Must be no more than ${maxLength} characters long` };
  }
  
  if (value && pattern && !pattern.test(value)) {
    return { isValid: false, error: patternMessage || 'Invalid format' };
  }
  
  return { isValid: true };
}

// Number validation
export function validateNumber(
  value: number | string,
  options: {
    min?: number;
    max?: number;
    required?: boolean;
    integer?: boolean;
  } = {}
): ValidationResult {
  const { min, max, required = false, integer = false } = options;
  
  if (required && (value === null || value === undefined || value === '')) {
    return { isValid: false, error: 'This field is required' };
  }
  
  if (value === null || value === undefined || value === '') {
    return { isValid: true }; // Optional field
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Must be a valid number' };
  }
  
  if (integer && !Number.isInteger(numValue)) {
    return { isValid: false, error: 'Must be a whole number' };
  }
  
  if (min !== undefined && numValue < min) {
    return { isValid: false, error: `Must be at least ${min}` };
  }
  
  if (max !== undefined && numValue > max) {
    return { isValid: false, error: `Must be no more than ${max}` };
  }
  
  return { isValid: true };
}

// URL validation
export function validateURL(url: string): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required' };
  }
  
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'URL must use http or https protocol' };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
}

// Phone number validation (basic)
export function validatePhone(phone: string): ValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  
  // Check if it's all digits and reasonable length
  if (!/^\d+$/.test(cleaned)) {
    return { isValid: false, error: 'Phone number must contain only digits' };
  }
  
  if (cleaned.length < 10 || cleaned.length > 15) {
    return { isValid: false, error: 'Phone number must be between 10 and 15 digits' };
  }
  
  return { isValid: true };
}

// Business name validation
export function validateBusinessName(name: string): ValidationResult {
  return validateString(name, {
    minLength: 1,
    maxLength: 200,
    required: true,
    pattern: /^[a-zA-Z0-9\s\-'&.,()]+$/,
    patternMessage: 'Business name contains invalid characters',
  });
}

// Sanitize string (remove potentially dangerous characters)
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 10000); // Limit length
}

// Sanitize HTML (basic - for display only)
export function sanitizeHTML(html: string): string {
  if (typeof html !== 'string') return '';
  
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}



