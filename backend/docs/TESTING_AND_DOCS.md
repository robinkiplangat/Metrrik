# Q-Sci Backend Testing & API Documentation

This document provides comprehensive information about testing and API documentation for the Q-Sci backend.

## 🚀 Quick Start

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test:analysis
npm run test:health

# Run comprehensive test suite with options
npm run test:runner --coverage --verbose
```

### Accessing API Documentation
```bash
# Start the development server
npm run dev

# Access Swagger UI
open http://localhost:5050/api-docs

# Access OpenAPI JSON
open http://localhost:5050/api-docs.json
```

## 📚 API Documentation

### Swagger/OpenAPI Integration

The backend uses `express-jsdoc-swagger` to automatically generate interactive API documentation from JSDoc comments.

#### Features
- **Interactive Swagger UI** at `/api-docs`
- **OpenAPI JSON** at `/api-docs.json`
- **Automatic schema generation** from TypeScript types
- **Request/Response examples** with realistic data
- **Authentication documentation** with Bearer token support
- **Custom styling** matching Q-Sci brand colors

#### Documentation Structure
```typescript
/**
 * POST /api/analysis/analyze
 * @summary Analyze floor plan and generate Bill of Quantities
 * @tags Analysis
 * @param {file} floorPlan.formData.required - Floor plan file
 * @param {string} projectName.formData.required - Project name
 * @return {object} 200 - Analysis completed successfully
 * @example response - 200 - Analysis result
 * {
 *   "success": true,
 *   "data": { "analysis": { ... } }
 * }
 */
```

#### Available Tags
- **Authentication** - User auth and authorization
- **Users** - User management
- **Projects** - Construction project management
- **Analysis** - AI-powered floor plan analysis
- **Documents** - Document management
- **Files** - File upload and management
- **Chat** - Real-time chat and AI assistance
- **Vector** - Vector search operations
- **Knowledge** - Knowledge base management

## 🧪 Testing Framework

### Test Structure

```
src/test/
├── setup.ts              # Test configuration and utilities
├── analysis.test.ts      # Analysis API tests
├── health.test.ts        # Health check tests
└── run-tests.ts          # Comprehensive test runner
```

### Test Categories

#### 1. Unit Tests
- Individual function testing
- Mock dependencies
- Fast execution

#### 2. Integration Tests
- API endpoint testing
- Database integration
- File upload testing

#### 3. End-to-End Tests
- Complete user workflows
- Authentication flows
- Error handling

### Test Utilities

The test suite includes comprehensive utilities:

```typescript
// Create test user
const testUser = await global.testUtils.createTestUser();

// Create test project
const project = await global.testUtils.createTestProject(userId);

// Generate test token
const token = global.testUtils.generateTestToken();
```

### Test Database

Tests use **MongoDB Memory Server** for:
- Isolated test environment
- No external dependencies
- Fast test execution
- Automatic cleanup

## 🔧 Configuration

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testTimeout: 30000,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageReporters: ['text', 'lcov', 'html']
};
```

### Swagger Configuration

```typescript
// src/config/swagger.ts
export const swaggerOptions = {
  info: {
    title: 'Q-Sci Construction Management API',
    version: '1.0.0',
    description: 'Comprehensive API for construction project management'
  },
  security: {
    BearerAuth: { type: 'http', scheme: 'bearer' }
  },
  swaggerUIPath: '/api-docs',
  exposeSwaggerUI: true
};
```

## 📊 Test Coverage

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

### Coverage Targets
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## 🚀 Performance Testing

### Benchmarking

```bash
# Run performance benchmarks
npm run test:benchmark

# Benchmark specific endpoints
npm run test:runner --benchmark --test analysis
```

### Performance Metrics
- **Response Time**: < 2s for analysis endpoints
- **Throughput**: > 100 requests/minute
- **Memory Usage**: < 512MB per request
- **File Upload**: < 5s for 10MB files

## 🔍 API Validation

### Request/Response Validation

The API includes comprehensive validation:

```typescript
// File type validation
const allowedTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/dwg'
];

// Request body validation
const { projectName, projectType } = req.body;
if (!projectName) {
  throw new CustomError('Project name is required', 400);
}
```

### Error Handling

```typescript
// Standardized error responses
{
  "success": false,
  "error": {
    "message": "Detailed error message",
    "stack": "Error stack (development only)"
  }
}
```

## 🛠️ Development Workflow

### 1. Writing Tests

```typescript
describe('Analysis API', () => {
  it('should analyze floor plan successfully', async () => {
    const response = await request(app)
      .post('/api/analysis/analyze')
      .attach('floorPlan', testFilePath)
      .field('projectName', 'Test Project')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data.analysis).toHaveProperty('totalCost');
  });
});
```

### 2. Adding Documentation

```typescript
/**
 * GET /api/projects
 * @summary Get user projects
 * @tags Projects
 * @security BearerAuth
 * @return {array<Project>} 200 - List of projects
 */
app.get('/api/projects', authenticateUser, getProjects);
```

### 3. Running Tests

```bash
# During development
npm run test:watch

# Before commit
npm run test:coverage

# Full validation
npm run test:runner --coverage --docs --benchmark
```

## 📈 Continuous Integration

### GitHub Actions Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:docs
```

## 🐛 Debugging

### Test Debugging

```bash
# Run specific test with verbose output
npm run test:analysis -- --verbose

# Debug with Node.js inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Run single test case
npm test -- --testNamePattern="should analyze floor plan"
```

### API Debugging

```bash
# Check API documentation
curl http://localhost:5050/api-docs.json | jq

# Test health endpoint
curl http://localhost:5050/health

# Validate OpenAPI spec
npx swagger-codegen validate -i http://localhost:5050/api-docs.json
```

## 📋 Best Practices

### Testing Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External Dependencies**: Use mocks for external services
3. **Test Edge Cases**: Include error conditions and boundary values
4. **Descriptive Test Names**: Use clear, descriptive test names
5. **Arrange-Act-Assert**: Structure tests clearly

### Documentation Best Practices

1. **Complete Examples**: Provide realistic request/response examples
2. **Clear Descriptions**: Use clear, concise descriptions
3. **Parameter Validation**: Document all required parameters
4. **Error Responses**: Document all possible error responses
5. **Authentication**: Clearly document authentication requirements

## 🔗 Useful Links

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Express JSDoc Swagger](https://github.com/brikev/express-jsdoc-swagger)
- [OpenAPI Specification](https://swagger.io/specification/)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)

## 📞 Support

For questions about testing or API documentation:

1. Check this documentation first
2. Review existing test examples
3. Check the API documentation at `/api-docs`
4. Contact the development team

---

**Last Updated**: September 26, 2025  
**Version**: 1.0.0
