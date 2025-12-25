import request from 'supertest';
import { app } from '../server';

describe('Health Check API', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      
      // Validate timestamp format
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      
      // Validate uptime is a number
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
      
      // Validate environment
      expect(['development', 'test', 'production']).toContain(response.body.environment);
    });

    it('should return consistent response structure', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const expectedKeys = ['status', 'timestamp', 'uptime', 'environment'];
      expectedKeys.forEach(key => {
        expect(response.body).toHaveProperty(key);
      });

      // Should not have any unexpected keys
      const responseKeys = Object.keys(response.body);
      expect(responseKeys).toEqual(expect.arrayContaining(expectedKeys));
      expect(responseKeys.length).toBe(expectedKeys.length);
    });

    it('should handle multiple requests', async () => {
      const promises = Array(5).fill(null).map(() => 
        request(app).get('/health').expect(200)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.body).toHaveProperty('status', 'OK');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('environment');
      });
    });
  });
});
