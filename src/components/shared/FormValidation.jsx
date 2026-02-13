import { toast } from "sonner";

/**
 * Global validation utilities for consistent error handling across the app
 */

export const validateRequired = (fields, formData) => {
  const errors = {};
  
  for (const field of fields) {
    const value = formData[field.key];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors[field.key] = `${field.label} is required`;
      toast.error(`Missing required field: ${field.label}`);
      return { valid: false, errors };
    }
  }
  
  return { valid: true, errors: {} };
};

export const validateField = (key, value, rules) => {
  const errors = [];
  
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    errors.push('This field is required');
  }
  
  if (rules.minLength && value && value.length < rules.minLength) {
    errors.push(`Must be at least ${rules.minLength} characters`);
  }
  
  if (rules.maxLength && value && value.length > rules.maxLength) {
    errors.push(`Must be no more than ${rules.maxLength} characters`);
  }
  
  if (rules.pattern && value && !rules.pattern.test(value)) {
    errors.push(rules.patternMessage || 'Invalid format');
  }
  
  if (rules.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    errors.push('Invalid email address');
  }
  
  if (rules.state && value && !/^[A-Z]{2}$/.test(value)) {
    errors.push('State must be 2 letters (e.g., CA, TX)');
  }
  
  if (rules.zip && value && !/^\d{5}(-\d{4})?$/.test(value)) {
    errors.push('Invalid ZIP code format');
  }
  
  if (rules.custom && typeof rules.custom === 'function') {
    const customError = rules.custom(value);
    if (customError) errors.push(customError);
  }
  
  return errors;
};

export const getFieldErrorClass = (hasError, baseClass = '') => {
  if (!hasError) return baseClass;
  return `${baseClass} border-red-600 bg-red-50 focus-visible:ring-red-500`;
};

export const FieldError = ({ error }) => {
  if (!error) return null;
  return (
    <p className="text-xs text-red-600 mt-1">
      {error}
    </p>
  );
};

export const validateForm = (fields, formData) => {
  const errors = {};
  let isValid = true;
  
  for (const field of fields) {
    const fieldErrors = validateField(field.key, formData[field.key], field.rules || {});
    if (fieldErrors.length > 0) {
      errors[field.key] = fieldErrors[0];
      isValid = false;
      if (field.rules?.required) {
        toast.error(`Missing required field: ${field.label}`);
      } else {
        toast.error(`Please correct: ${fieldErrors[0]}`);
      }
      break; // Show one error at a time
    }
  }
  
  return { valid: isValid, errors };
};

export const handleServerError = (error) => {
  const message = error?.response?.data?.message 
    || error?.message 
    || 'An error occurred. Please try again.';
  
  toast.error(message);
  return message;
};