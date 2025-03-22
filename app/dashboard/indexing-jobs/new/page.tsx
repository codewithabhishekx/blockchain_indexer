'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Types for our form
interface FormData {
  name: string;
  description?: string;
  dbConnectionId: string;
  dataType: string;
  config: Record<string, any>;
}

// Types for database connections
interface DbConnection {
  id: string;
  name: string;
  isActive: boolean;
}

// Types for custom config fields
interface ConfigField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'checkbox' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: any;
}

export default function NewIndexingJobPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<DbConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    dbConnectionId: '',
    dataType: 'NFT_PRICES',
    config: {},
  });

  const dataTypes = [
    { value: 'NFT_PRICES', label: 'NFT Prices' },
    { value: 'NFT_BIDS', label: 'NFT Bids' },
    { value: 'TOKEN_PRICES', label: 'Token Prices' },
    { value: 'TOKEN_BORROW', label: 'Token Borrow Rates' },
    { value: 'CUSTOM', label: 'Custom Data' },
  ];

  // Config fields for each data type
  const configFields: Record<string, ConfigField[]> = {
    NFT_PRICES: [
      { name: 'collections', label: 'Collections (comma separated)', type: 'text', placeholder: 'Collection1,Collection2', required: true },
      { name: 'updateInterval', label: 'Update Interval (minutes)', type: 'number', defaultValue: 5, required: true },
    ],
    NFT_BIDS: [
      { name: 'collections', label: 'Collections (comma separated)', type: 'text', placeholder: 'Collection1,Collection2', required: true },
      { name: 'minBidValue', label: 'Minimum Bid Value (SOL)', type: 'number', defaultValue: 0, required: true },
    ],
    TOKEN_PRICES: [
      { name: 'tokens', label: 'Token Addresses (comma separated)', type: 'text', placeholder: 'Address1,Address2', required: true },
      { name: 'updateInterval', label: 'Update Interval (minutes)', type: 'number', defaultValue: 5, required: true },
    ],
    TOKEN_BORROW: [
      { name: 'protocols', label: 'Protocols', type: 'select', options: [
        { value: 'all', label: 'All Supported Protocols' },
        { value: 'solend', label: 'Solend' },
        { value: 'mango', label: 'Mango Markets' },
      ], required: true },
      { name: 'updateInterval', label: 'Update Interval (minutes)', type: 'number', defaultValue: 15, required: true },
    ],
    CUSTOM: [
      { name: 'webhookUrl', label: 'Webhook URL', type: 'text', placeholder: 'https://your-webhook.com/endpoint', required: true },
      { name: 'tableName', label: 'Table Name', type: 'text', placeholder: 'custom_data', required: true },
    ],
  };

  // Fetch available database connections
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const response = await fetch('/api/connections');
        if (!response.ok) {
          throw new Error('Failed to fetch database connections');
        }
        const data = await response.json();
        setConnections(data.data || []);
        
        // Auto-select first active connection if available
        const activeConnection = data.data?.find((c: DbConnection) => c.isActive);
        if (activeConnection) {
          setFormData(prev => ({
            ...prev,
            dbConnectionId: activeConnection.id,
          }));
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load connections');
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, []);

  // Initialize config when data type changes
  useEffect(() => {
    const initConfig: Record<string, any> = {};
    configFields[formData.dataType]?.forEach(field => {
      if (field.defaultValue !== undefined) {
        initConfig[field.name] = field.defaultValue;
      } else if (field.type === 'checkbox') {
        initConfig[field.name] = false;
      } else {
        initConfig[field.name] = '';
      }
    });

    setFormData(prev => ({
      ...prev,
      config: initConfig,
    }));
  }, [formData.dataType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'dataType') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        // Reset config when data type changes
        config: {},
      }));
    } else if (name.startsWith('config.')) {
      const configKey = name.replace('config.', '');
      setFormData(prev => ({
        ...prev,
        config: {
          ...prev.config,
          [configKey]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/indexing-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create indexing job');
      }

      router.push('/dashboard/indexing-jobs');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-2 text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Create Indexing Job</h1>
        <p className="text-gray-500 mt-1">
          Define what blockchain data you want to index and where to store it.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {connections.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <h2 className="text-xl font-medium mb-2">No database connections available</h2>
          <p className="text-gray-500 mb-6">
            You need to create a database connection before creating an indexing job.
          </p>
          <Link
            href="/dashboard/connections/new"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Create Database Connection
          </Link>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Job Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="My Indexing Job"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What this job does..."
                  rows={2}
                />
              </div>

              <div>
                <label htmlFor="dbConnectionId" className="block text-sm font-medium text-gray-700 mb-1">
                  Database Connection
                </label>
                <select
                  id="dbConnectionId"
                  name="dbConnectionId"
                  value={formData.dbConnectionId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a connection</option>
                  {connections.map(connection => (
                    <option 
                      key={connection.id} 
                      value={connection.id}
                      disabled={!connection.isActive}
                    >
                      {connection.name} {!connection.isActive && '(Inactive)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="dataType" className="block text-sm font-medium text-gray-700 mb-1">
                  Data Type
                </label>
                <select
                  id="dataType"
                  name="dataType"
                  value={formData.dataType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {dataTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium mb-3">Configuration</h3>
                
                {configFields[formData.dataType]?.map(field => (
                  <div key={field.name} className="mb-4">
                    <label htmlFor={`config.${field.name}`} className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    
                    {field.type === 'select' ? (
                      <select
                        id={`config.${field.name}`}
                        name={`config.${field.name}`}
                        value={formData.config[field.name] || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required={field.required}
                      >
                        <option value="">Select an option</option>
                        {field.options?.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <input
                        type="checkbox"
                        id={`config.${field.name}`}
                        name={`config.${field.name}`}
                        checked={formData.config[field.name] || false}
                        onChange={e => {
                          setFormData(prev => ({
                            ...prev,
                            config: {
                              ...prev.config,
                              [field.name]: e.target.checked,
                            },
                          }));
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    ) : (
                      <input
                        type={field.type}
                        id={`config.${field.name}`}
                        name={`config.${field.name}`}
                        value={formData.config[field.name] || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Link
                href="/dashboard/indexing-jobs"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Job'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 