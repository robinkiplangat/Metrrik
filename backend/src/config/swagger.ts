import expressJSDocSwagger from 'express-jsdoc-swagger';
import { Express } from 'express';

/**
 * Swagger configuration for Metrrik API
 */
export const swaggerOptions = {
  info: {
    version: '1.0.0',
    title: 'Metrrik Construction Management API',
    description: `
      # Metrrik Construction Management API
      
      A comprehensive API for construction project management, cost estimation, and AI-powered analysis.
      
      ## Features
      - 🏗️ Project Management
      - 📊 Cost Estimation & Analysis
      - 🤖 AI-Powered Floor Plan Analysis
      - 📄 Document Management
      - 👥 User Authentication & Authorization
      - 💬 Real-time Chat & Collaboration
      
      ## Authentication
      This API uses Bearer token authentication. Include your token in the Authorization header:
      \`Authorization: Bearer <your-token>\`
      
      ## Rate Limiting
      API requests are limited to 100 requests per 15-minute window per IP address.
    `,
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    contact: {
      name: 'Metrrik Team',
      email: 'support@metrrik.com',
      url: 'https://metrrik.com',
    },
  },
  security: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    BasicAuth: {
      type: 'http',
      scheme: 'basic',
    },
  },
  servers: [
    {
      url: process.env.API_URL || 'http://localhost:5050',
      description: 'Development server',
    },
    {
      url: 'https://metrrik.com',
      description: 'Production server',
    },
  ],
  baseDir: __dirname,
  filesPattern: [
    '../routes/**/*.ts',
    '../types/**/*.ts',
    '../middleware/**/*.ts',
  ],
  swaggerUIPath: '/api-docs',
  exposeSwaggerUI: true,
  exposeApiDocs: true,
  apiDocsPath: '/api-docs.json',
  notRequiredAsNullable: false,
  swaggerUiOptions: {
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #29B6F6; }
      .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 4px; }
    `,
    customSiteTitle: 'Metrrik API Documentation',
    customfavIcon: '/assets/metrrik_icon.png',
  },
  multiple: false,
};

/**
 * Initialize Swagger documentation
 */
export const initializeSwagger = (app: Express) => {
  return expressJSDocSwagger(app)(swaggerOptions);
};

/**
 * Common response schemas
 */
export const commonSchemas = {
  /**
   * Success response
   * @typedef {object} SuccessResponse
   * @property {boolean} success - Indicates if the request was successful
   * @property {object} data - Response data
   * @property {string} message - Success message
   */

  /**
   * Error response
   * @typedef {object} ErrorResponse
   * @property {boolean} success - Always false for errors
   * @property {object} error - Error details
   * @property {string} error.message - Error message
   * @property {string} error.stack - Error stack trace (development only)
   */

  /**
   * Pagination response
   * @typedef {object} PaginationResponse
   * @property {boolean} success - Indicates if the request was successful
   * @property {object} data - Response data
   * @property {object} pagination - Pagination information
   * @property {number} pagination.page - Current page number
   * @property {number} pagination.limit - Items per page
   * @property {number} pagination.total - Total number of items
   * @property {number} pagination.pages - Total number of pages
   */
};

/**
 * Common tags for API documentation
 */
export const apiTags = [
  {
    name: 'Authentication',
    description: 'User authentication and authorization endpoints',
  },
  {
    name: 'Users',
    description: 'User management and profile operations',
  },
  {
    name: 'Projects',
    description: 'Construction project management',
  },
  {
    name: 'Analysis',
    description: 'AI-powered floor plan analysis and cost estimation',
  },
  {
    name: 'Documents',
    description: 'Document management and processing',
  },
  {
    name: 'Files',
    description: 'File upload and management',
  },
  {
    name: 'Chat',
    description: 'Real-time chat and AI assistance',
  },
  {
    name: 'Vector',
    description: 'Vector search and knowledge base operations',
  },
  {
    name: 'Knowledge',
    description: 'Knowledge base management',
  },
];
