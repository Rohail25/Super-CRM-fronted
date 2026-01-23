# Frontend Setup - LEO24 CRM

## ✅ Frontend Enhancements Complete

Comprehensive frontend improvements have been added to the LEO24 CRM system.

---

## 🎨 New UI Components

### 1. **Button Component** (`src/components/ui/Button.tsx`)
Reusable button component with:
- ✅ Multiple variants (primary, secondary, danger, ghost)
- ✅ Size options (sm, md, lg)
- ✅ Loading state
- ✅ Disabled state
- ✅ Full TypeScript support

**Usage:**
```tsx
<Button variant="primary" size="md" isLoading={loading}>
  Submit
</Button>
```

### 2. **Input Component** (`src/components/ui/Input.tsx`)
Form input component with:
- ✅ Label support
- ✅ Error messages
- ✅ Helper text
- ✅ Required field indicator
- ✅ Focus states

**Usage:**
```tsx
<Input
  label="Email"
  type="email"
  error={errors.email}
  helperText="Enter your email address"
  required
/>
```

### 3. **Modal Component** (`src/components/ui/Modal.tsx`)
Modal dialog component with:
- ✅ Multiple sizes (sm, md, lg, xl)
- ✅ Close button
- ✅ Escape key support
- ✅ Click outside to close
- ✅ Scrollable content

**Usage:**
```tsx
<Modal isOpen={isOpen} onClose={handleClose} title="Edit Customer" size="md">
  <form>...</form>
</Modal>
```

### 4. **LoadingSpinner Component** (`src/components/ui/LoadingSpinner.tsx`)
Loading spinner with:
- ✅ Multiple sizes (sm, md, lg)
- ✅ Customizable styling

**Usage:**
```tsx
<LoadingSpinner size="md" />
```

### 5. **Skeleton Component** (`src/components/ui/Skeleton.tsx`)
Loading skeleton with:
- ✅ Multiple variants (text, circular, rectangular)
- ✅ Pulse animation

**Usage:**
```tsx
<Skeleton variant="rectangular" className="h-20 w-full" />
```

### 6. **ErrorBoundary Component** (`src/components/ErrorBoundary.tsx`)
React error boundary with:
- ✅ Error catching
- ✅ Fallback UI
- ✅ Error logging
- ✅ Reset functionality

**Usage:**
```tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

---

## 🛠️ Utilities

### 1. **Error Handler** (`src/utils/errorHandler.ts`)
API error handling utilities:
- ✅ `handleApiError()` - Convert errors to ApiError format
- ✅ `getErrorMessage()` - Extract error message
- ✅ `getFieldErrors()` - Extract validation errors

**Usage:**
```tsx
import { handleApiError, getErrorMessage } from '../utils/errorHandler';

try {
  await api.post('/customers', data);
} catch (error) {
  const apiError = handleApiError(error);
  setError(apiError.message);
}
```

### 2. **Validation Utilities** (`src/utils/validation.ts`)
Form validation utilities:
- ✅ Pre-built validators (required, email, phone, password, etc.)
- ✅ `validateField()` - Validate single field
- ✅ `validateForm()` - Validate entire form

**Usage:**
```tsx
import { validators, validateForm } from '../utils/validation';

const rules = {
  email: [validators.required, validators.email],
  password: [validators.required, validators.password],
};

const errors = validateForm(formData, rules);
```

### 3. **useApi Hook** (`src/hooks/useApi.ts`)
Custom hook for API calls:
- ✅ Loading state
- ✅ Error handling
- ✅ Success/error callbacks
- ✅ Reset functionality

**Usage:**
```tsx
import { useApi } from '../hooks/useApi';
import api from '../services/api';

function MyComponent() {
  const { data, loading, error, execute } = useApi();

  const fetchData = () => {
    execute(() => api.get('/customers'), {
      onSuccess: (data) => console.log('Success!', data),
      onError: (error) => console.error('Error!', error),
    });
  };

  return (
    <div>
      {loading && <LoadingSpinner />}
      {error && <p className="text-red-500">{error}</p>}
      {data && <div>{/* Render data */}</div>}
    </div>
  );
}
```

---

## 🧪 Testing Setup

### Testing Framework
- ✅ **Vitest** - Fast unit test framework
- ✅ **React Testing Library** - Component testing
- ✅ **@testing-library/user-event** - User interaction simulation
- ✅ **jsdom** - DOM environment for tests

### Test Files Created
1. **Login.test.tsx** - Login page tests
2. **Button.test.tsx** - Button component tests

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Test Configuration
- **Config:** `vitest.config.ts`
- **Setup:** `src/test/setup.ts`
- **Environment:** jsdom
- **Coverage:** v8 provider

---

## 📦 Dependencies Added

### Dev Dependencies
```json
{
  "@testing-library/jest-dom": "^6.6.3",
  "@testing-library/react": "^16.1.0",
  "@testing-library/user-event": "^14.5.2",
  "@vitest/ui": "^2.1.8",
  "jsdom": "^25.0.1",
  "vitest": "^2.1.8"
}
```

---

## 🚀 Usage Examples

### Using Components Together

```tsx
import { useState } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useApi } from '../hooks/useApi';
import { validators } from '../utils/validation';
import api from '../services/api';

function CustomerForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { loading, execute } = useApi();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const validationErrors: Record<string, string> = {};
    const emailError = validators.email(formData.email);
    if (emailError) validationErrors.email = emailError;

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Submit
    await execute(() => api.post('/customers', formData), {
      onSuccess: () => {
        setIsOpen(false);
        setFormData({ email: '', name: '' });
      },
    });
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Add Customer</Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add Customer">
        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            required
          />
          <div className="mt-4 flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
```

### Using Error Boundary

```tsx
import ErrorBoundary from '../components/ErrorBoundary';
import App from './App';

function Root() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
```

---

## 📝 Next Steps

### Recommended Enhancements

1. **More UI Components**
   - Select/Dropdown
   - Textarea
   - Checkbox
   - Radio buttons
   - Date picker
   - Toast notifications

2. **More Tests**
   - Component tests for all UI components
   - Integration tests for pages
   - E2E tests with Playwright/Cypress

3. **Form Library Integration**
   - React Hook Form integration examples
   - Zod schema validation examples

4. **State Management**
   - More Zustand stores for different features
   - API caching with React Query

5. **Performance**
   - Code splitting
   - Lazy loading
   - Image optimization

---

## 🐛 Troubleshooting

### Tests Not Running
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
```bash
# Check TypeScript config
npx tsc --noEmit
```

### Import Errors
- Ensure path aliases are configured in `tsconfig.json`
- Check `vite.config.ts` for alias configuration

---

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)

---

*Last Updated: 2026-01-16*

