import { MongoClient, Db } from 'mongodb';
import { logger } from '../utils/logger';

let client: MongoClient;
let db: Db;

export async function connectDatabase(): Promise<void> {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });

    await client.connect();
    db = client.db('q-sci');

    // Test the connection
    await db.admin().ping();
    
    logger.info('✅ Connected to MongoDB Atlas');
    
    // Initialize collections and indexes
    await initializeCollections();
    
  } catch (error) {
    logger.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    logger.info('📴 Database connection closed');
  }
}

async function initializeCollections(): Promise<void> {
  try {
    const collections = [
      'users',
      'sessions',
      'projects',
      'documents',
      'chat_messages',
      'uploaded_files',
      'reports',
      'vector_embeddings',
      'document_vectors',
      'knowledge_graph',
      'analysis_results'
    ];

    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      
      // Create collection if it doesn't exist (this will create the collection)
      // The _id index is created automatically by MongoDB
      await collection.createIndex({ createdAt: 1 }, { background: true });
      
      logger.info(`✅ Collection '${collectionName}' initialized`);
    }

    // Create specific indexes
    await createIndexes();
    
  } catch (error) {
    logger.error('❌ Failed to initialize collections:', error);
    throw error;
  }
}

async function createIndexes(): Promise<void> {
  try {
    // Users collection indexes
    await db.collection('users').createIndex({ clerkUserId: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ createdAt: 1 });

    // Sessions collection indexes
    await db.collection('sessions').createIndex({ sessionToken: 1 }, { unique: true });
    await db.collection('sessions').createIndex({ userId: 1 });
    await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection('sessions').createIndex({ isActive: 1 });

    // Projects collection indexes
    await db.collection('projects').createIndex({ userId: 1 });
    await db.collection('projects').createIndex({ name: 1 });
    await db.collection('projects').createIndex({ createdAt: 1 });
    await db.collection('projects').createIndex({ status: 1 });

    // Documents collection indexes
    await db.collection('documents').createIndex({ projectId: 1 });
    await db.collection('documents').createIndex({ userId: 1 });
    await db.collection('documents').createIndex({ title: 1 });
    await db.collection('documents').createIndex({ createdAt: 1 });
    await db.collection('documents').createIndex({ type: 1 });

    // Chat messages collection indexes
    await db.collection('chat_messages').createIndex({ projectId: 1 });
    await db.collection('chat_messages').createIndex({ userId: 1 });
    await db.collection('chat_messages').createIndex({ createdAt: 1 });
    await db.collection('chat_messages').createIndex({ messageType: 1 });

    // Uploaded files collection indexes
    await db.collection('uploaded_files').createIndex({ projectId: 1 });
    await db.collection('uploaded_files').createIndex({ userId: 1 });
    await db.collection('uploaded_files').createIndex({ filename: 1 });
    await db.collection('uploaded_files').createIndex({ uploadedAt: 1 });
    await db.collection('uploaded_files').createIndex({ fileType: 1 });

    // Reports collection indexes
    await db.collection('reports').createIndex({ projectId: 1 });
    await db.collection('reports').createIndex({ userId: 1 });
    await db.collection('reports').createIndex({ reportType: 1 });
    await db.collection('reports').createIndex({ createdAt: 1 });

    // Vector embeddings collection indexes
    await db.collection('vector_embeddings').createIndex({ projectId: 1 });
    await db.collection('vector_embeddings').createIndex({ documentId: 1 });
    await db.collection('vector_embeddings').createIndex({ embeddingType: 1 });
    await db.collection('vector_embeddings').createIndex({ createdAt: 1 });

    // Document vectors collection indexes
    await db.collection('document_vectors').createIndex({ documentId: 1 });
    await db.collection('document_vectors').createIndex({ projectId: 1 });
    await db.collection('document_vectors').createIndex({ vector: 1 });

    // Knowledge graph collection indexes
    await db.collection('knowledge_graph').createIndex({ projectId: 1 });
    await db.collection('knowledge_graph').createIndex({ entityType: 1 });
    await db.collection('knowledge_graph').createIndex({ entityId: 1 });
    await db.collection('knowledge_graph').createIndex({ relationships: 1 });

    // Analysis results collection indexes
    await db.collection('analysis_results').createIndex({ fileName: 1 });
    await db.collection('analysis_results').createIndex({ createdAt: 1 });
    await db.collection('analysis_results').createIndex({ 'metadata.fileType': 1 });

    logger.info('✅ All database indexes created successfully');
    
  } catch (error) {
    logger.error('❌ Failed to create indexes:', error);
    throw error;
  }
}
