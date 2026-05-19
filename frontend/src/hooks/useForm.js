import { useState, useCallback } from 'react';

export function useForm(initialValues = {}, validationRules = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validateField = useCallback((name, value) => {
    const rules = validationRules[name];
    if (!rules) return '';

    if (rules.required && !value?.toString().trim()) {
      return rules.message || `${name} is required`;
    }
    if (rules.minLength && value?.length < rules.minLength) {
      return rules.message || `Minimum ${rules.minLength} characters required`;
    }
    if (rules.maxLength && value?.length > rules.maxLength) {
      return `Maximum ${rules.maxLength} characters allowed`;
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.message || `Invalid ${name} format`;
    }
    if (rules.validate) {
      return rules.validate(value, values) || '';
    }
    return '';
  }, [validationRules, values]);

  const setValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, [validateField]);

  const setMultiple = useCallback((newValues) => {
    setValues((prev) => ({ ...prev, ...newValues }));
    const newErrors = {};
    for (const name of Object.keys(newValues)) {
      newErrors[name] = validateField(name, newValues[name]);
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
  }, [validateField]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setValue(name, val);
  }, [setValue]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, values[name]);
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, [validateField, values]);

  const validate = useCallback(() => {
    const newErrors = {};
    const newTouched = {};
    let isValid = true;

    for (const name of Object.keys(validationRules)) {
      newTouched[name] = true;
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    setTouched((prev) => ({ ...prev, ...newTouched }));
    return isValid;
  }, [validationRules, values, validateField]);

  const handleSubmit = useCallback((onSubmit) => async (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }, [validate, values]);

  const reset = useCallback((newValues) => {
    setValues(newValues || initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    submitting,
    setValue,
    setMultiple,
    handleChange,
    handleBlur,
    handleSubmit,
    validate,
    reset,
    setValues,
    setErrors,
    isValid: Object.keys(errors).filter((k) => errors[k]).length === 0,
  };
}
