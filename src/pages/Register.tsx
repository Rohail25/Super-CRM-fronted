import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

interface Project {
  id: number;
  name: string;
  description?: string;
}

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    // Company data
    company_name: '',
    company_vat: '',
    company_address: '',
    // Contact person
    contact_name: '',
    contact_email: '',
    contact_password: '',
    contact_password_confirmation: '',
    // Projects
    requested_projects: [] as number[],
  });

  useEffect(() => {
    // Fetch available projects for selection
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects/public');
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      // If it fails, we'll just show an empty list - admin can assign projects later
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    // Validation
    if (formData.contact_password !== formData.contact_password_confirmation) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.contact_password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        company_data: {
          name: formData.company_name,
          vat: formData.company_vat || null,
          address: formData.company_address || null,
        },
        contact_person: {
          name: formData.contact_name,
          email: formData.contact_email,
          password: formData.contact_password,
        },
        requested_projects: formData.requested_projects,
      };

      await api.post('/signup-requests', payload);
      setSuccess(true);
    } catch (err: any) {
      // Handle validation errors with field-specific messages
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const fieldErrorMap: Record<string, string> = {};
        const errorMessages: string[] = [];
        
        // Map errors to fields and collect general messages
        Object.keys(errors).forEach((field) => {
          const fieldErrors = Array.isArray(errors[field]) ? errors[field] : [errors[field]];
          
          // Map nested field errors (e.g., company_data.vat)
          if (field.includes('.')) {
            const [parent, child] = field.split('.');
            if (parent === 'company_data') {
              fieldErrorMap[`company_${child}`] = fieldErrors[0];
            } else if (parent === 'contact_person') {
              fieldErrorMap[`contact_${child}`] = fieldErrors[0];
            }
          } else {
            fieldErrorMap[field] = fieldErrors[0];
          }
          
          errorMessages.push(...fieldErrors);
        });
        
        setFieldErrors(fieldErrorMap);
        setError(errorMessages.join(' '));
      } else {
        // Handle other errors
        const errorMessage = err.response?.data?.message || 
                            err.response?.data?.error || 
                            'Registration failed. Please try again.';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProjectToggle = (projectId: number) => {
    setFormData((prev) => ({
      ...prev,
      requested_projects: prev.requested_projects.includes(projectId)
        ? prev.requested_projects.filter((id) => id !== projectId)
        : [...prev.requested_projects, projectId],
    }));
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-aqua-2 to-aqua-1">
        <div className="bg-card p-8 rounded-2xl shadow-lg border border-line w-full max-w-md">
          <div className="text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-ink mb-2">Registration Submitted!</h1>
            <p className="text-muted mb-6">
              Your company registration request has been submitted successfully. 
              Our team will review your request and you'll receive an email once it's approved.
              After approval, you'll need to complete your subscription to activate your account.
            </p>
            <Link to="/login">
              <Button variant="primary">Go to Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-aqua-2 to-aqua-1 py-12 px-4">
      <div className="bg-card p-8 rounded-2xl shadow-lg border border-line w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ink mb-2">LEO24 CRM</h1>
          <p className="text-muted">Register your company</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Information */}
          <div className="border-b border-line pb-6">
            <h2 className="text-lg font-semibold text-ink mb-4">Company Information</h2>
            <div className="space-y-4">
              <Input
                label="Company Name"
                type="text"
                value={formData.company_name}
                onChange={(e) => {
                  setFormData({ ...formData, company_name: e.target.value });
                  if (fieldErrors.company_name) setFieldErrors({ ...fieldErrors, company_name: '' });
                }}
                error={fieldErrors.company_name}
                required
              />
              <Input
                label="VAT Number"
                type="text"
                value={formData.company_vat}
                onChange={(e) => {
                  setFormData({ ...formData, company_vat: e.target.value });
                  if (fieldErrors.company_vat) setFieldErrors({ ...fieldErrors, company_vat: '' });
                }}
                error={fieldErrors.company_vat}
                helperText="Optional"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.company_address}
                  onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Contact Person */}
          <div className="border-b border-line pb-6">
            <h2 className="text-lg font-semibold text-ink mb-4">Contact Person (Admin)</h2>
            <div className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                value={formData.contact_name}
                onChange={(e) => {
                  setFormData({ ...formData, contact_name: e.target.value });
                  if (fieldErrors.contact_name) setFieldErrors({ ...fieldErrors, contact_name: '' });
                }}
                error={fieldErrors.contact_name}
                required
              />
              <Input
                label="Email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => {
                  setFormData({ ...formData, contact_email: e.target.value });
                  if (fieldErrors.contact_email) setFieldErrors({ ...fieldErrors, contact_email: '' });
                }}
                error={fieldErrors.contact_email}
                required
              />
              <Input
                label="Password"
                type="password"
                value={formData.contact_password}
                onChange={(e) => {
                  setFormData({ ...formData, contact_password: e.target.value });
                  if (fieldErrors.contact_password) setFieldErrors({ ...fieldErrors, contact_password: '' });
                }}
                error={fieldErrors.contact_password}
                required
                helperText="Minimum 8 characters"
              />
              <Input
                label="Confirm Password"
                type="password"
                value={formData.contact_password_confirmation}
                onChange={(e) => {
                  setFormData({ ...formData, contact_password_confirmation: e.target.value });
                  if (fieldErrors.contact_password_confirmation) setFieldErrors({ ...fieldErrors, contact_password_confirmation: '' });
                }}
                error={fieldErrors.contact_password_confirmation}
                required
              />
            </div>
          </div>

          {/* Project Selection */}
          {projects.length > 0 && (
            <div className="pb-6">
              <h2 className="text-lg font-semibold text-ink mb-2">Select Projects (Optional)</h2>
              <p className="text-sm text-muted mb-4">
                Select which projects you'd like access to. You can also request access later.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
                {projects.map((project) => {
                  const isSelected = formData.requested_projects.includes(project.id);
                  return (
                    <div
                      key={project.id}
                      onClick={() => handleProjectToggle(project.id)}
                      className={`
                        relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                        ${isSelected
                          ? 'border-cyan-500 bg-gradient-to-br from-cyan-50 to-blue-50 shadow-lg shadow-cyan-500/20'
                          : 'border-gray-200 bg-white hover:border-cyan-300 hover:shadow-md'
                        }
                      `}
                    >
                      {/* Checkmark indicator */}
                      <div className="absolute top-3 right-3">
                        {isSelected ? (
                          <div className="w-6 h-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-6 h-6 border-2 border-gray-300 rounded-full bg-white"></div>
                        )}
                      </div>

                      {/* Project content */}
                      <div className="pr-8">
                        <h3 className={`font-semibold text-lg mb-2 ${isSelected ? 'text-cyan-700' : 'text-ink'}`}>
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className={`text-sm ${isSelected ? 'text-cyan-600' : 'text-muted'}`}>
                            {project.description}
                          </p>
                        )}
                      </div>

                      {/* Selection indicator at bottom */}
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-cyan-200">
                          <span className="text-xs font-medium text-cyan-600 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Selected
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {formData.requested_projects.length > 0 && (
                <p className="mt-3 text-sm text-cyan-600 font-medium">
                  {formData.requested_projects.length} project{formData.requested_projects.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Link to="/login" className="text-cyan-500 hover:text-cyan-600 text-sm">
              Already have an account? Sign in
            </Link>
            <Button type="submit" isLoading={loading} variant="primary">
              Submit Registration
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

