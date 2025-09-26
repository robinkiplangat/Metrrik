import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { logger } from '../utils/logger';

let mongoServer: MongoMemoryServer;
let mongoClient: MongoClient;

// Setup test database
beforeAll(async () => {
  try {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'q-sci-test',
      },
    });
    
    const mongoUri = mongoServer.getUri();
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = mongoUri;
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.API_URL = 'http://localhost:5050';
    
    logger.info('Test database setup completed');
  } catch (error) {
    logger.error('Failed to setup test database:', error);
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    if (mongoClient) {
      await mongoClient.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    logger.info('Test database cleanup completed');
  } catch (error) {
    logger.error('Failed to cleanup test database:', error);
  }
});

// Clean up database between tests
beforeEach(async () => {
  if (mongoClient) {
    const db = mongoClient.db('q-sci-test');
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
    }
  }
});

// Global test utilities
global.testUtils = {
  createTestUser: async () => {
    const db = mongoClient.db('q-sci-test');
    const user = {
      clerkUserId: 'test-user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date(),
      lastLoginAt: new Date(),
      isActive: true,
      preferences: {
        theme: 'light',
        notifications: true,
        defaultProjectType: 'residential'
      }
    };
    
    const result = await db.collection('users').insertOne(user);
    return { ...user, _id: result.insertedId };
  },
  
  createTestProject: async (userId: string) => {
    const db = mongoClient.db('q-sci-test');
    const project = {
      name: 'Test Project',
      client: 'Test Client',
      type: 'residential',
      status: 'draft',
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        area: 150,
        location: 'Nairobi, Kenya'
      }
    };
    
    const result = await db.collection('projects').insertOne(project);
    return { ...project, _id: result.insertedId };
  },
  
  generateTestToken: () => {
    // In a real implementation, you would generate a proper JWT token
    return 'test-bearer-token';
  }
};

// Extend global types
declare global {
  var testUtils: {
    createTestUser: () => Promise<any>;
    createTestProject: (userId: string) => Promise<any>;
    generateTestToken: () => string;
  };
}