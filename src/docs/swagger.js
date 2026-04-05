const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Zorvyn Finance API',
    version: '1.0.0',
    description: 'API documentation for Zorvyn Finance Backend',
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
    '/api/records': {
      get: {
        summary: 'Get all financial records',
        responses: { 200: { description: 'Success' } },
      },
      post: {
        summary: 'Create a financial record',
        responses: { 201: { description: 'Created' } },
      },
    },
    '/api/analytics/dashboard': {
      get: {
        summary: 'Get dashboard stats',
        responses: { 200: { description: 'Success' } },
      },
    },
    '/api/analytics/insights/generate': {
      post: {
        summary: 'Generate smart financial insights using AI',
        responses: { 200: { description: 'Success' } },
      },
    },
  },
};

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};

module.exports = setupSwagger;
