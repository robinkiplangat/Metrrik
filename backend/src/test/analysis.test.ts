import request from 'supertest';
import { app } from '../server';
import path from 'path';
import fs from 'fs';

describe('Analysis API', () => {
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    // Create test user
    testUser = await global.testUtils.createTestUser();
    authToken = global.testUtils.generateTestToken();
  });

  describe('POST /api/analysis/analyze', () => {
    it('should analyze a floor plan successfully', async () => {
      // Create a test file
      const testFilePath = path.join(__dirname, 'test-files', 'test-floor-plan.pdf');
      const testFileDir = path.dirname(testFilePath);
      
      // Ensure directory exists
      if (!fs.existsSync(testFileDir)) {
        fs.mkdirSync(testFileDir, { recursive: true });
      }
      
      // Create a dummy PDF file for testing
      const dummyPdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF');
      fs.writeFileSync(testFilePath, dummyPdfContent);

      const response = await request(app)
        .post('/api/analysis/analyze')
        .attach('floorPlan', testFilePath)
        .field('projectName', 'Test Bungalow')
        .field('projectType', 'residential')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('analysis');
      expect(response.body.data.analysis).toHaveProperty('projectName', 'Test Bungalow');
      expect(response.body.data.analysis).toHaveProperty('totalArea');
      expect(response.body.data.analysis).toHaveProperty('totalCost');
      expect(response.body.data.analysis).toHaveProperty('costPerSqm');
      expect(response.body.data.analysis).toHaveProperty('breakdown');
      expect(response.body.data.analysis).toHaveProperty('metadata');

      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });

    it('should reject request without file', async () => {
      const response = await request(app)
        .post('/api/analysis/analyze')
        .field('projectName', 'Test Project')
        .field('projectType', 'residential')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('No floor plan file uploaded');
    });

    it('should reject invalid file types', async () => {
      // Create a test text file (invalid type)
      const testFilePath = path.join(__dirname, 'test-files', 'test.txt');
      const testFileDir = path.dirname(testFilePath);
      
      if (!fs.existsSync(testFileDir)) {
        fs.mkdirSync(testFileDir, { recursive: true });
      }
      
      fs.writeFileSync(testFilePath, 'This is not a valid floor plan file');

      const response = await request(app)
        .post('/api/analysis/analyze')
        .attach('floorPlan', testFilePath)
        .field('projectName', 'Test Project')
        .field('projectType', 'residential')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('File type not allowed');

      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });

    it('should handle large files appropriately', async () => {
      // Create a large test file (simulate large PDF)
      const testFilePath = path.join(__dirname, 'test-files', 'large-test.pdf');
      const testFileDir = path.dirname(testFilePath);
      
      if (!fs.existsSync(testFileDir)) {
        fs.mkdirSync(testFileDir, { recursive: true });
      }
      
      // Create a 6MB file (larger than 5MB threshold)
      const largeContent = Buffer.alloc(6 * 1024 * 1024, 'A');
      fs.writeFileSync(testFilePath, largeContent);

      const response = await request(app)
        .post('/api/analysis/analyze')
        .attach('floorPlan', testFilePath)
        .field('projectName', 'Large Project')
        .field('projectType', 'commercial')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.analysis).toHaveProperty('projectName', 'Large Project');
      
      // For large files, we expect higher base area
      const totalArea = response.body.data.analysis.totalArea;
      expect(totalArea).toMatch(/\d+ sqm/);
      
      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });

    it('should validate required fields', async () => {
      const testFilePath = path.join(__dirname, 'test-files', 'test-floor-plan.pdf');
      const testFileDir = path.dirname(testFilePath);
      
      if (!fs.existsSync(testFileDir)) {
        fs.mkdirSync(testFileDir, { recursive: true });
      }
      
      const dummyPdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF');
      fs.writeFileSync(testFilePath, dummyPdfContent);

      // Test without projectName
      const response = await request(app)
        .post('/api/analysis/analyze')
        .attach('floorPlan', testFilePath)
        .field('projectType', 'residential')
        .expect(200); // Should still work with default project name

      expect(response.body).toHaveProperty('success', true);

      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });
  });

  describe('GET /api/analysis/history', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/analysis/history')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Access token required');
    });

    it('should return analysis history for authenticated user', async () => {
      // First, create some test analysis data
      const db = (global as any).mongoClient.db('q-sci-test');
      await db.collection('analysis_results').insertOne({
        fileName: 'test-plan.pdf',
        filePath: '/uploads/analysis/test-plan.pdf',
        projectName: 'Test Project',
        analysisResult: {
          projectName: 'Test Project',
          totalArea: '120 sqm',
          totalCost: 'KSh 3,360,000',
          costPerSqm: 'KSh 28,000/sqm'
        },
        createdAt: new Date(),
        metadata: {
          fileType: 'application/pdf',
          fileSize: 1024000
        }
      });

      const response = await request(app)
        .get('/api/analysis/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('analyses');
      expect(Array.isArray(response.body.data.analyses)).toBe(true);
      expect(response.body.data.analyses.length).toBeGreaterThan(0);
    });

    it('should return empty array when no analyses exist', async () => {
      const response = await request(app)
        .get('/api/analysis/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.analyses).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('should handle server errors gracefully', async () => {
      // Mock a database error by temporarily breaking the connection
      const originalGetDatabase = require('../config/database').getDatabase;
      jest.spyOn(require('../config/database'), 'getDatabase').mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const testFilePath = path.join(__dirname, 'test-files', 'test-floor-plan.pdf');
      const testFileDir = path.dirname(testFilePath);
      
      if (!fs.existsSync(testFileDir)) {
        fs.mkdirSync(testFileDir, { recursive: true });
      }
      
      const dummyPdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF');
      fs.writeFileSync(testFilePath, dummyPdfContent);

      const response = await request(app)
        .post('/api/analysis/analyze')
        .attach('floorPlan', testFilePath)
        .field('projectName', 'Test Project')
        .field('projectType', 'residential')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');

      // Restore original function
      require('../config/database').getDatabase = originalGetDatabase;

      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });
  });
});
