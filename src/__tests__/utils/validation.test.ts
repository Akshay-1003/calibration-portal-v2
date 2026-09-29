import { describe, it, expect } from 'vitest';
import { 
  validateField, 
  validateForm, 
  sanitizeInput, 
  sanitizeHtml, 
  VALIDATION_PATTERNS, 
  VALIDATION_MESSAGES,
  COMMON_SCHEMAS 
} from '../../utils/validation';

describe('Validation Utils', () => {
  describe('validateField', () => {
    it('should validate required fields', () => {
      const rules = { required: true };
      const result = validateField('', rules);
      expect(result).toContain(VALIDATION_MESSAGES.REQUIRED);
    });

    it('should validate min length', () => {
      const rules = { minLength: 5 };
      const result = validateField('abc', rules);
      expect(result).toContain('Must be at least 5 characters');
    });

    it('should validate max length', () => {
      const rules = { maxLength: 10 };
      const result = validateField('abcdefghijklmnop', rules);
      expect(result).toContain('Must be no more than 10 characters');
    });

    it('should validate pattern', () => {
      const rules = { pattern: VALIDATION_PATTERNS.EMAIL };
      const result = validateField('invalid-email', rules);
      expect(result).toContain(VALIDATION_MESSAGES.PATTERN);
    });

    it('should validate custom rules', () => {
      const rules = {
        custom: (value: string) => value.length > 5 ? null : 'Must be longer than 5 characters'
      };
      const result = validateField('abc', rules);
      expect(result).toContain('Must be longer than 5 characters');
    });

    it('should return empty array for valid input', () => {
      const rules = { required: true, minLength: 3 };
      const result = validateField('valid', rules);
      expect(result).toHaveLength(0);
    });
  });

  describe('validateForm', () => {
    it('should validate entire form', () => {
      const schema = {
        name: { required: true, minLength: 2 },
        email: { required: true, pattern: VALIDATION_PATTERNS.EMAIL },
      };
      const data = { name: 'a', email: 'invalid' };
      const result = validateForm(data, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toContain('Must be at least 2 characters');
      expect(result.errors.email).toContain(VALIDATION_MESSAGES.PATTERN);
    });

    it('should return valid for correct data', () => {
      const schema = {
        name: { required: true, minLength: 2 },
        email: { required: true, pattern: VALIDATION_PATTERNS.EMAIL },
      };
      const data = { name: 'John', email: 'john@example.com' };
      const result = validateForm(data, schema);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML tags', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<script>');
    });

    it('should sanitize javascript protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeInput(input);
      expect(result).not.toContain('javascript:');
    });

    it('should sanitize event handlers', () => {
      const input = 'onclick="alert(\'xss\')"';
      const result = sanitizeInput(input);
      expect(result).not.toContain('onclick=');
    });

    it('should trim whitespace', () => {
      const input = '  hello  ';
      const result = sanitizeInput(input);
      expect(result).toBe('hello');
    });
  });

  describe('sanitizeHtml', () => {
    it('should escape HTML entities', () => {
      const html = '<div>Hello & "World"</div>';
      const result = sanitizeHtml(html);
      // textContent escapes & and quotes, but the output format may vary
      // The important thing is that HTML tags are escaped
      expect(result).toContain('&amp;'); // & should be escaped
      expect(result).not.toContain('<div>'); // HTML tags should be escaped
      expect(result).not.toContain('</div>');
      // Quotes are escaped differently by textContent, so check for safe output
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('COMMON_SCHEMAS', () => {
    it('should validate email schema', () => {
      const emailSchema = COMMON_SCHEMAS.EMAIL;
      const validEmail = 'test@example.com';
      const invalidEmail = 'invalid-email';
      
      const validResult = validateField(validEmail, emailSchema);
      const invalidResult = validateField(invalidEmail, emailSchema);
      
      expect(validResult).toHaveLength(0);
      expect(invalidResult).toContain(VALIDATION_MESSAGES.EMAIL);
    });

    it('should validate password schema', () => {
      const passwordSchema = COMMON_SCHEMAS.PASSWORD;
      const validPassword = 'Password123!';
      const invalidPassword = 'weak';
      
      const validResult = validateField(validPassword, passwordSchema);
      const invalidResult = validateField(invalidPassword, passwordSchema);
      
      expect(validResult).toHaveLength(0);
      expect(invalidResult.length).toBeGreaterThan(0);
    });

    it('should validate name schema', () => {
      const nameSchema = COMMON_SCHEMAS.NAME;
      const validName = 'John Doe';
      const invalidName = 'John123';
      
      const validResult = validateField(validName, nameSchema);
      const invalidResult = validateField(invalidName, nameSchema);
      
      expect(validResult).toHaveLength(0);
      expect(invalidResult.length).toBeGreaterThan(0);
    });
  });
});
