import { 
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
  getReportsByUser
} from './databaseInit';
import { userService } from './userService';
import type { 
  Project, 
  Document, 
  ChatMessage, 
  UploadedFile, 
  AnalyzedBQ,
  ProjectDocument,
  DocumentDocument,
  ChatMessageDocument,
  UploadedFileDocument,
  ReportDocument
} from '../types';

export class ProjectService {
  private static instance: ProjectService;

  private constructor() {}

  public static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService();
    }
    return ProjectService.instance;
  }

  // Project management
  public async createNewProject(projectData: {
    name: string;
    client: string;
    description?: string;
    tags?: string[];
    metadata?: any;
  }): Promise<Project> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const dbProject = await createProject(userId as any, projectData);
    
    return {
      id: dbProject._id!,
      name: dbProject.name,
      client: dbProject.client,
      lastModified: dbProject.lastModified,
      status: dbProject.status,
    };
  }

  public async getUserProjects(): Promise<Project[]> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const dbProjects = await getProjectsByUser(userId as any);
    
    return dbProjects.map(project => ({
      id: project._id!,
      name: project.name,
      client: project.client,
      lastModified: project.lastModified,
      status: project.status,
    }));
  }

  public async updateProjectData(projectId: string, updates: Partial<Project>): Promise<void> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const updateData: Partial<ProjectDocument> = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.client) updateData.client = updates.client;
    if (updates.status) updateData.status = updates.status;

    await updateProject(projectId as any, updateData);
  }

  public async deleteProjectData(projectId: string): Promise<void> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    await deleteProject(projectId as any);
  }

  // Document management
  public async createNewDocument(documentData: {
    name: string;
    type: Document['type'];
    content: string;
    projectId?: string;
    tags?: string[];
    isTemplate?: boolean;
  }): Promise<Document> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const dbDocument = await createDocument(userId as any, {
      ...documentData,
      projectId: documentData.projectId as any,
    });

    return {
      id: dbDocument._id!,
      name: dbDocument.name,
      type: dbDocument.type,
      createdAt: dbDocument.createdAt,
      content: dbDocument.content,
      versions: dbDocument.versions.map(v => ({
        version: v.version,
        createdAt: v.createdAt,
        content: v.content,
      })),
    };
  }

  public async getUserDocuments(projectId?: string): Promise<Document[]> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const dbDocuments = await getDocumentsByUser(userId as any, projectId as any);
    
    return dbDocuments.map(doc => ({
      id: doc._id!,
      name: doc.name,
      type: doc.type,
      createdAt: doc.createdAt,
      content: doc.content,
      versions: doc.versions.map(v => ({
        version: v.version,
        createdAt: v.createdAt,
        content: v.content,
      })),
    }));
  }

  public async updateDocumentContent(documentId: string, content: string): Promise<void> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    await updateDocument(documentId as any, { content });
  }

  // Chat message management
  public async saveChatMessage(messageData: {
    text: string;
    sender: 'user' | 'ai';
    projectId?: string;
    sessionId?: string;
    metadata?: any;
  }): Promise<ChatMessage> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const dbMessage = await saveChatMessage(userId as any, {
      ...messageData,
      projectId: messageData.projectId as any,
    });

    return {
      id: dbMessage._id!,
      sender: dbMessage.sender,
      text: dbMessage.text,
    };
  }

  public async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const dbMessages = await getChatMessagesBySession(userId as any, sessionId);
    
    return dbMessages.map(msg => ({
      id: msg._id!,
      sender: msg.sender,
      text: msg.text,
    }));
  }

  // File upload management
  public async saveUploadedFile(fileData: {
    name: string;
    originalName: string;
    size: number;
    mimeType: string;
    base64: string;
    projectId?: string;
    metadata?: any;
  }): Promise<UploadedFile> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const dbFile = await saveUploadedFile(userId as any, {
      ...fileData,
      projectId: fileData.projectId as any,
    });

    return {
      id: dbFile._id!,
      name: dbFile.name,
      size: dbFile.size,
      type: dbFile.mimeType,
      uploadedAt: dbFile.uploadedAt,
      base64: dbFile.base64,
      status: dbFile.status,
    };
  }

  public async getUserFiles(projectId?: string): Promise<UploadedFile[]> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const dbFiles = await getUploadedFilesByUser(userId as any, projectId as any);
    
    return dbFiles.map(file => ({
      id: file._id!,
      name: file.name,
      size: file.size,
      type: file.mimeType,
      uploadedAt: file.uploadedAt,
      base64: file.base64,
      status: file.status,
    }));
  }

  // Report management
  public async saveAnalysisReport(reportData: {
    name: string;
    type: 'Summary' | 'Analysis' | 'Estimate' | 'BQ' | 'Custom';
    content: string;
    data: AnalyzedBQ | any;
    projectId?: string;
    metadata?: any;
  }): Promise<ReportDocument> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return await saveReport(userId as any, {
      ...reportData,
      projectId: reportData.projectId as any,
    });
  }

  public async getUserReports(projectId?: string): Promise<ReportDocument[]> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return await getReportsByUser(userId as any, projectId as any);
  }

  // Utility methods
  public async getProjectSummary(projectId: string): Promise<{
    project: Project;
    documents: Document[];
    files: UploadedFile[];
    reports: ReportDocument[];
    chatHistory: ChatMessage[];
  }> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const [documents, files, reports, chatHistory] = await Promise.all([
      this.getUserDocuments(projectId),
      this.getUserFiles(projectId),
      this.getUserReports(projectId),
      this.getChatHistory(`project-${projectId}`),
    ]);

    // Get project data (you might want to add a getProjectById method)
    const projects = await this.getUserProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    return {
      project,
      documents,
      files,
      reports,
      chatHistory,
    };
  }
}

// Export singleton instance
export const projectService = ProjectService.getInstance();
