import { initializeMongoDB, checkMongoDBHealth } from './mongodbService';

// Initialize database connection when the app starts
export const initializeDatabase = async (): Promise<boolean> => {
  try {
    console.log('Initializing MongoDB connection...');
    await initializeMongoDB();
    
    // Perform health check
    const isHealthy = await checkMongoDBHealth();
    if (isHealthy) {
      console.log('✅ MongoDB connection established and healthy');
      return true;
    } else {
      console.error('❌ MongoDB health check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to initialize MongoDB:', error);
    return false;
  }
};

// Export for use in other parts of the application
export { 
  createOrUpdateUser,
  getUserByClerkId,
  createSession,
  getSessionByToken,
  updateSessionAccess,
  invalidateSession,
  createProject,
  getProjectsByUser,
  updateProject,
  deleteProject,
  createDocument,
  getDocumentsByUser,
  updateDocument,
  saveChatMessage,
  getChatMessagesBySession,
  saveUploadedFile,
  getUploadedFilesByUser,
  saveReport,
  getReportsByUser,
  closeMongoDBConnection,
  checkMongoDBHealth
} from './mongodbService';
