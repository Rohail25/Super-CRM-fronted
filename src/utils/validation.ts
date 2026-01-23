export const validators = {
  required: (value: string) => {
    if (!value || value.trim() === '') {
      return 'This field is required';
    }
    return null;
  },

  email: (value: string) => {
    if (!value) return null; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  phone: (value: string) => {
    if (!value) return null; // Optional field
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(value)) {
      return 'Please enter a valid phone number';
    }
    return null;
  },

  minLength: (min: number) => (value: string) => {
    if (!value) return null;
    if (value.length < min) {
      return `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max: number) => (value: string) => {
    if (!value) return null;
    if (value.length > max) {
      return `Must be no more than ${max} characters`;
    }
    return null;
  },

  password: (value: string) => {
    if (!value) return null;
    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    return null;
  },

  vat: (value: string) => {
    if (!value) return null; // Optional field
    const vatRegex = /^[A-Z]{2}[\dA-Z]{2,12}$/;
    if (!vatRegex.test(value)) {
      return 'Please enter a valid VAT number';
    }
    return null;
  },
};

export function validateField(value: string, rules: Array<(value: string) => string | null>): string | null {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
}

export function validateForm<T extends Record<string, string>>(
  data: T,
  rules: Record<keyof T, Array<(value: string) => string | null>>
): Record<keyof T, string> {
  const errors: Record<string, string> = {} as Record<keyof T, string>;

  for (const field in rules) {
    const fieldRules = rules[field];
    const value = data[field];
    const error = validateField(value, fieldRules);
    if (error) {
      errors[field] = error;
    }
  }

  return errors as Record<keyof T, string>;
}

