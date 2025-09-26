import request from 'supertest';
import { app } from '../server';

describe('Integration Tests', () => {
  describe('Authentication Flow', () => {
    it('should register a new user', async () => {
      const userData = {
        clerkUserId: 'test-user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('User registered successfully');
    });

    it('should update existing user', async () => {
      const userData = {
        clerkUserId: 'test-user-123',
        email: 'test@example.com',
        firstName: 'Updated',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('User updated successfully');
    });
  });

  describe('Project Management', () => {
    let authToken: string;

    beforeAll(async () => {
      // Register a user and get auth token
      const userData = {
        clerkUserId: 'test-user-456',
        email: 'test2@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = 'test-user-456'; // In real implementation, this would be a JWT token
    });

    it('should create a new project', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test construction project',
        type: 'residential',
        status: 'planning'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Project created successfully');
    });

    it('should get user projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toBeInstanceOf(Array);
    });
  });
});
