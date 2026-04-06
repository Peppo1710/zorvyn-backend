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
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/api/auth/register': {
      post: {
        summary: 'Register a new user',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  role: { type: 'string', enum: ['viewer', 'analyst', 'admin'] },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Success' } },
      },
    },
    '/api/users/me': {
      get: {
        summary: 'Current user profile',
        responses: { 200: { description: 'Success' } },
      },
    },
    '/api/users': {
      get: {
        summary: 'List users (admin only)',
        responses: { 200: { description: 'Success' } },
      },
    },
    '/api/users/{id}': {
      get: {
        summary: 'Get user by id (self or admin)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: { 200: { description: 'Success' } },
      },
    },
    '/api/audit/logs': {
      get: {
        summary: 'List audit logs (admin only)',
        responses: { 200: { description: 'Success' } },
      },
    },
    '/api/records': {
      get: {
        summary: 'List financial records (search, filters, pagination)',
        responses: { 200: { description: 'Success' } },
      },
      post: {
        summary: 'Create a record (analyst or admin)',
        responses: { 201: { description: 'Created' }, 403: { description: 'Forbidden for viewer' } },
      },
    },
    '/api/analytics/dashboard': {
      get: {
        summary: 'Dashboard stats',
        responses: { 200: { description: 'Success' } },
      },
    },
    '/api/analytics/insights/generate': {
      post: {
        summary: 'Generate AI insights (analyst or admin)',
        responses: { 200: { description: 'Success' }, 403: { description: 'Forbidden for viewer' } },
      },
    },
  },
};

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};

module.exports = setupSwagger;
