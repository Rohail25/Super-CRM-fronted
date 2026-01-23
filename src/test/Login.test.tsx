import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import api from '../services/api';

// Mock the API service
vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock the auth store
vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    setUser: vi.fn(),
    setToken: vi.fn(),
  }),
}));

describe('Login', () => {
  const renderLogin = () => {
    return render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
  };

  it('renders login form', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup();
    renderLogin();

    const submitButton = screen.getByRole('button', { name: /login/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      data: {
        user: { id: 1, email: 'test@example.com', name: 'Test User' },
        token: 'test-token',
      },
    };

    (api.post as any).mockResolvedValue(mockResponse);
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('displays error message on login failure', async () => {
    const user = userEvent.setup();
    const mockError = {
      response: {
        status: 422,
        data: {
          message: 'Invalid credentials',
        },
      },
    };

    (api.post as any).mockRejectedValue(mockError);
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});

