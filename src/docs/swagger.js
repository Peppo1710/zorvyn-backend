const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Zorvyn Finance API',
    version: '1.0.0',
    description:
      'API documentation for Zorvyn Finance Backend. Roles: viewer (read-only records & dashboard), analyst (create/update/delete records + insights), admin (full access including user list and audit logs).',
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Record: {
        type: 'object',
        required: ['amount', 'type', 'category', 'date'],
        properties: {
          amount: { type: 'number', example: 1500.0, description: 'Positive monetary value' },
          type: { type: 'string', enum: ['income', 'expense'], example: 'income' },
          category: { type: 'string', example: 'Salary', description: 'Category name' },
          date: { type: 'string', example: '2026-04-06', description: 'Date in YYYY-MM-DD format' },
          notes: { type: 'string', example: 'Monthly salary', description: 'Optional notes' },
        },
      },
      RecordUpdate: {
        type: 'object',
        properties: {
          amount: { type: 'number', example: 2000.0 },
          type: { type: 'string', enum: ['income', 'expense'] },
          category: { type: 'string', example: 'Freelance' },
          date: { type: 'string', example: '2026-04-06' },
          notes: { type: 'string', example: 'Updated notes' },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', minLength: 6, example: 'password123' },
                  role: { type: 'string', enum: ['viewer', 'analyst', 'admin'], example: 'analyst' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully' },
          400: { description: 'Invalid input' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', minLength: 6, example: 'password123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful, returns JWT token' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Current user profile',
        responses: { 200: { description: 'Success' } },
      },
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List users (admin only)',
        responses: { 200: { description: 'Success' }, 403: { description: 'Forbidden' } },
      },
    },
    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by id (self or admin)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', description: 'ID' },
          },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/api/audit/logs': {
      get: {
        tags: ['Audit'],
        summary: 'List audit logs (admin only)',
        responses: { 200: { description: 'Success' }, 403: { description: 'Forbidden' } },
      },
    },
    '/api/records': {
      get: {
        tags: ['Records'],
        summary: 'List financial records (search, filters, pagination)',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search in category or notes' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category' },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['income', 'expense'] }, description: 'Filter by type' },
          { name: 'startDate', in: 'query', schema: { type: 'string' }, description: 'Start date (YYYY-MM-DD)' },
          { name: 'endDate', in: 'query', schema: { type: 'string' }, description: 'End date (YYYY-MM-DD)' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 }, description: 'Items per page' },
        ],
        responses: { 200: { description: 'Success' } },
      },
      post: {
        tags: ['Records'],
        summary: 'Create a record (analyst or admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Record' },
            },
          },
        },
        responses: {
          201: { description: 'Record created' },
          400: { description: 'Invalid input' },
          403: { description: 'Forbidden for viewer' },
        },
      },
    },
    '/api/records/{id}': {
      get: {
        tags: ['Records'],
        summary: 'Get a record by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', description: 'ID' },
          },
        ],
        responses: {
          200: { description: 'Success' },
          404: { description: 'Not found' },
        },
      },
      put: {
        tags: ['Records'],
        summary: 'Update a record (analyst or admin)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', description: 'ID' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RecordUpdate' },
            },
          },
        },
        responses: {
          200: { description: 'Record updated' },
          400: { description: 'Invalid input' },
          403: { description: 'Forbidden' },
          404: { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Records'],
        summary: 'Soft-delete a record (analyst or admin)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', description: 'ID' },
          },
        ],
        responses: {
          200: { description: 'Record deleted' },
          403: { description: 'Forbidden' },
          404: { description: 'Not found' },
        },
      },
    },
    '/api/analytics/dashboard': {
      get: {
        tags: ['Analytics'],
        summary: 'Dashboard stats (income, expenses, categories, trends)',
        responses: { 200: { description: 'Success' } },
      },
    },
    '/api/analytics/insights/generate': {
      post: {
        tags: ['Analytics'],
        summary: 'Generate AI insights (analyst or admin)',
        description: 'Generates AI-powered financial insights based on the user\'s records. No request body is needed — the backend aggregates data from existing records automatically.',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {},
                example: {},
              },
            },
          },
        },
        responses: {
          200: { description: 'Insights generated successfully' },
          403: { description: 'Forbidden for viewer' },
          500: { description: 'Error generating insights' },
        },
      },
    },
  },
};

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};

module.exports = setupSwagger;
