import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Topbar from '../components/layout/Topbar';
import { useAuthStore } from '../stores/authStore';

interface Category {
  id: string;
  nameEn: string;
  nameIt: string;
  slug: string;
  parentId: string | null;
  order: number;
}

interface NewsStats {
  user: {
    id: string;
    name: string;
    email: string;
  };
  overview: {
    total: number;
    published: number;
    draft: number;
    pending: number;
    rejected: number;
    featured: number;
    breaking: number;
  };
  views: {
    total: number;
    average: number;
  };
  recentActivity: {
    newsLast7Days: number;
    newsLast30Days: number;
  };
  topNews: Array<{
    id: string;
    title: string;
    slug: string;
    views: number;
    publishedAt: string;
    category: {
      id: string;
      nameEn: string;
      nameIt: string;
    };
  }>;
  categoryBreakdown: Array<{
    categoryId: string;
    category: {
      id: string;
      nameEn: string;
      nameIt: string;
      slug: string;
    };
    newsCount: number;
    totalViews: number;
  }>;
}

interface ArticleFormData {
  title: string;
  summary: string;
  content: string;
  categoryId: string;
  status: 'DRAFT' | 'PUBLISHED';
  isFeatured: boolean;
  isBreaking: boolean;
  tags: string[];
  mainImage: File | null;
  mainImagePreview: string | null;
}

export default function TGCalabriaProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newsStats, setNewsStats] = useState<NewsStats | null>(null);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ArticleFormData>({
    title: '',
    summary: '',
    content: '',
    categoryId: '',
    status: 'PUBLISHED',
    isFeatured: false,
    isBreaking: false,
    tags: [],
    mainImage: null,
    mainImagePreview: null,
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (projectId) {
      initializeProject();
    }
  }, [projectId]);

  const initializeProject = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Step 1: Login user
      const loginResponse = await loginUser();
      
      // Step 2: Fetch categories
      await fetchCategories();
      
      // Step 3: Fetch news stats if we have external_user_id
      if (loginResponse?.external_user_id) {
        await fetchNewsStats();
      }
    } catch (err: any) {
      console.error('Failed to initialize project:', err);
      setError(err.response?.data?.message || 'Failed to initialize project');
    } finally {
      setLoading(false);
    }
  };

  const loginUser = async () => {
    try {
      setLoginLoading(true);
      const response = await api.post(`/projects/${projectId}/tg-calabria/login`);
      
      if (response.data.success) {
        console.log('Login successful');
        return response.data;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      throw new Error(err.response?.data?.message || 'Failed to login');
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await api.get(`/projects/${projectId}/tg-calabria/categories`);
      
      if (response.data.success && response.data.data) {
        setCategories(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch categories');
      }
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
      setError(err.response?.data?.message || 'Failed to fetch categories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchNewsStats = async () => {
    try {
      setStatsLoading(true);
      const response = await api.get(`/projects/${projectId}/tg-calabria/news/stats`);
      
      if (response.data.success && response.data.data) {
        setNewsStats(response.data.data);
      } else {
        console.warn('Failed to fetch news stats:', response.data.message);
        // Don't throw error, just log it - stats are optional
      }
    } catch (err: any) {
      console.error('Failed to fetch news stats:', err);
      // Don't set error, stats are optional
    } finally {
      setStatsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content || !formData.categoryId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      // Create FormData for file upload
      const submitFormData = new FormData();
      submitFormData.append('title', formData.title);
      submitFormData.append('content', formData.content);
      submitFormData.append('categoryId', formData.categoryId);
      submitFormData.append('status', formData.status);
      
      if (formData.summary) {
        submitFormData.append('summary', formData.summary);
      }
      if (formData.isFeatured !== undefined) {
        submitFormData.append('isFeatured', formData.isFeatured.toString());
      }
      if (formData.isBreaking !== undefined) {
        submitFormData.append('isBreaking', formData.isBreaking.toString());
      }
      if (formData.tags && formData.tags.length > 0) {
        formData.tags.forEach((tag) => {
          submitFormData.append('tags[]', tag);
        });
      }
      if (formData.mainImage) {
        submitFormData.append('mainImage', formData.mainImage);
      }

      const response = await api.post(`/projects/${projectId}/tg-calabria/news`, submitFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        setSuccess('Article created successfully!');
        // Reset form
        setFormData({
          title: '',
          summary: '',
          content: '',
          categoryId: '',
          status: 'PUBLISHED',
          isFeatured: false,
          isBreaking: false,
          tags: [],
          mainImage: null,
          mainImagePreview: null,
        });
        setShowArticleForm(false);
        // Refresh stats
        await fetchNewsStats();
      } else {
        throw new Error(response.data.message || 'Failed to create article');
      }
    } catch (err: any) {
      console.error('Failed to create article:', err);
      const errorMessage = err.response?.data?.message || 'Failed to create article';
      const errors = err.response?.data?.errors;
      
      if (errors && Array.isArray(errors)) {
        const errorDetails = errors.map((e: any) => 
          `${e.field || 'Error'}: ${e.message || JSON.stringify(e)}`
        ).join('\n');
        setError(`${errorMessage}\n${errorDetails}`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loginLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Topbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aqua-5 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading TG Calabria project...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/projects')}
            className="text-aqua-5 hover:text-aqua-6 mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </button>
          <h1 className="text-3xl font-bold text-gray-900">TG Calabria Project</h1>
          <p className="text-gray-600 mt-2">Manage your news articles and categories</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="whitespace-pre-line">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Header with Create Article Button */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-800">News Statistics</h2>
          <button
            onClick={() => setShowArticleForm(!showArticleForm)}
            className="px-6 py-2.5 bg-gradient-to-r from-aqua-5 to-aqua-4 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
          >
            {showArticleForm ? 'Cancel' : 'Create Article'}
          </button>
        </div>

        {/* News Statistics Section */}
        {statsLoading ? (
          <div className="mb-8 bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aqua-5 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading statistics...</p>
          </div>
        ) : newsStats && (
          <div className="mb-8 space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Articles</p>
                    <p className="text-3xl font-bold text-gray-800">{newsStats.overview.total}</p>
                  </div>
                  <div className="bg-blue-100 rounded-full p-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Published</p>
                    <p className="text-3xl font-bold text-gray-800">{newsStats.overview.published}</p>
                  </div>
                  <div className="bg-green-100 rounded-full p-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Draft</p>
                    <p className="text-3xl font-bold text-gray-800">{newsStats.overview.draft}</p>
                  </div>
                  <div className="bg-yellow-100 rounded-full p-3">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Views</p>
                    <p className="text-3xl font-bold text-gray-800">{newsStats.views.total.toLocaleString()}</p>
                  </div>
                  <div className="bg-purple-100 rounded-full p-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm text-gray-600 mb-2">Average Views per Article</p>
                <p className="text-2xl font-bold text-gray-800">{newsStats.views.average.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm text-gray-600 mb-2">Articles Last 7 Days</p>
                <p className="text-2xl font-bold text-gray-800">{newsStats.recentActivity.newsLast7Days}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm text-gray-600 mb-2">Articles Last 30 Days</p>
                <p className="text-2xl font-bold text-gray-800">{newsStats.recentActivity.newsLast30Days}</p>
              </div>
            </div>

            {/* Top News Section */}
            {newsStats.topNews && newsStats.topNews.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Top Performing Articles</h3>
                <div className="space-y-4">
                  {newsStats.topNews.map((news) => (
                    <div key={news.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-800 mb-1">{news.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              {news.category.nameEn}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              {news.views.toLocaleString()} views
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(news.publishedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            {newsStats.categoryBreakdown && newsStats.categoryBreakdown.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Category Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {newsStats.categoryBreakdown.map((item) => (
                    <div key={item.categoryId} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2">
                        {item.category.nameEn} ({item.category.nameIt})
                      </h4>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{item.newsCount} articles</span>
                        <span className="text-gray-800 font-medium">{item.totalViews.toLocaleString()} views</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showArticleForm && (
          <div className="mb-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Create New Article</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aqua-5 focus:border-transparent"
                  placeholder="Enter article title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summary
                </label>
                <textarea
                  name="summary"
                  value={formData.summary}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aqua-5 focus:border-transparent"
                  placeholder="Enter article summary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  required
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aqua-5 focus:border-transparent font-mono text-sm"
                  placeholder="Enter article content (HTML supported)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aqua-5 focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.nameEn} ({category.nameIt})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aqua-5 focus:border-transparent"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isFeatured"
                    checked={formData.isFeatured}
                    onChange={handleInputChange}
                    className="mr-2 w-4 h-4 text-aqua-5 focus:ring-aqua-5 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Featured</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isBreaking"
                    checked={formData.isBreaking}
                    onChange={handleInputChange}
                    className="mr-2 w-4 h-4 text-aqua-5 focus:ring-aqua-5 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Breaking News</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aqua-5 focus:border-transparent"
                    placeholder="Enter tag and press Enter"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-aqua-5/10 text-aqua-7 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-aqua-7 hover:text-aqua-9"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Main Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFormData({
                        ...formData,
                        mainImage: file,
                        mainImagePreview: URL.createObjectURL(file),
                      });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-aqua-5 focus:border-transparent"
                />
                {formData.mainImagePreview && (
                  <div className="mt-2">
                    <img
                      src={formData.mainImagePreview}
                      alt="Preview"
                      className="max-w-xs max-h-48 rounded-lg border border-gray-300 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          mainImage: null,
                          mainImagePreview: null,
                        });
                      }}
                      className="mt-2 text-sm text-red-600 hover:text-red-800"
                    >
                      Remove Image
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-aqua-5 to-aqua-4 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Article'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowArticleForm(false);
                    setError(null);
                    setSuccess(null);
                    // Reset form
                    setFormData({
                      title: '',
                      summary: '',
                      content: '',
                      categoryId: '',
                      status: 'PUBLISHED',
                      isFeatured: false,
                      isBreaking: false,
                      tags: [],
                      mainImage: null,
                      mainImagePreview: null,
                    });
                  }}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
