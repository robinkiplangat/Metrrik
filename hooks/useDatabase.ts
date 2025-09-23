import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { userService } from '../services/userService';
import { projectService } from '../services/projectService';
import type { Project, Document, UploadedFile, ReportDocument } from '../types';

// Hook for database operations
export const useDatabase = () => {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize user when Clerk user is loaded
  useEffect(() => {
    const initializeUser = async () => {
      if (isLoaded && isSignedIn && clerkUser) {
        try {
          setIsLoading(true);
          setError(null);
          
          // Initialize user in our database
          await userService.initializeUser(clerkUser);
          setIsInitialized(true);
        } catch (err) {
          console.error('Failed to initialize user:', err);
          setError('Failed to initialize user session');
        } finally {
          setIsLoading(false);
        }
      } else if (isLoaded && !isSignedIn) {
        setIsInitialized(false);
      }
    };

    initializeUser();
  }, [isLoaded, isSignedIn, clerkUser]);

  return {
    isInitialized,
    isLoading,
    error,
    isAuthenticated: userService.isAuthenticated(),
    userId: userService.getUserId(),
    userService,
    projectService,
  };
};

// Hook for project operations
export const useProjects = () => {
  const { isInitialized, projectService } = useDatabase();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    if (!isInitialized) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const userProjects = await projectService.getUserProjects();
      setProjects(userProjects);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (projectData: {
    name: string;
    client: string;
    description?: string;
    tags?: string[];
  }) => {
    if (!isInitialized) throw new Error('User not initialized');
    
    try {
      const newProject = await projectService.createNewProject(projectData);
      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (err) {
      console.error('Failed to create project:', err);
      throw err;
    }
  };

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    if (!isInitialized) throw new Error('User not initialized');
    
    try {
      await projectService.updateProjectData(projectId, updates);
      setProjects(prev => 
        prev.map(p => p.id === projectId ? { ...p, ...updates } : p)
      );
    } catch (err) {
      console.error('Failed to update project:', err);
      throw err;
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!isInitialized) throw new Error('User not initialized');
    
    try {
      await projectService.deleteProjectData(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Failed to delete project:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadProjects();
  }, [isInitialized]);

  return {
    projects,
    isLoading,
    error,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
  };
};

// Hook for document operations
export const useDocuments = (projectId?: string) => {
  const { isInitialized, projectService } = useDatabase();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = async () => {
    if (!isInitialized) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const userDocuments = await projectService.getUserDocuments(projectId);
      setDocuments(userDocuments);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const createDocument = async (documentData: {
    name: string;
    type: Document['type'];
    content: string;
    tags?: string[];
  }) => {
    if (!isInitialized) throw new Error('User not initialized');
    
    try {
      const newDocument = await projectService.createNewDocument({
        ...documentData,
        projectId,
      });
      setDocuments(prev => [newDocument, ...prev]);
      return newDocument;
    } catch (err) {
      console.error('Failed to create document:', err);
      throw err;
    }
  };

  const updateDocument = async (documentId: string, content: string) => {
    if (!isInitialized) throw new Error('User not initialized');
    
    try {
      await projectService.updateDocumentContent(documentId, content);
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, content, lastModified: new Date().toISOString() }
            : doc
        )
      );
    } catch (err) {
      console.error('Failed to update document:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [isInitialized, projectId]);

  return {
    documents,
    isLoading,
    error,
    loadDocuments,
    createDocument,
    updateDocument,
  };
};

// Hook for file operations
export const useFiles = (projectId?: string) => {
  const { isInitialized, projectService } = useDatabase();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = async () => {
    if (!isInitialized) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const userFiles = await projectService.getUserFiles(projectId);
      setFiles(userFiles);
    } catch (err) {
      console.error('Failed to load files:', err);
      setError('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (fileData: {
    name: string;
    originalName: string;
    size: number;
    mimeType: string;
    base64: string;
    metadata?: any;
  }) => {
    if (!isInitialized) throw new Error('User not initialized');
    
    try {
      const newFile = await projectService.saveUploadedFile({
        ...fileData,
        projectId,
      });
      setFiles(prev => [newFile, ...prev]);
      return newFile;
    } catch (err) {
      console.error('Failed to upload file:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadFiles();
  }, [isInitialized, projectId]);

  return {
    files,
    isLoading,
    error,
    loadFiles,
    uploadFile,
  };
};

// Hook for reports
export const useReports = (projectId?: string) => {
  const { isInitialized, projectService } = useDatabase();
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async () => {
    if (!isInitialized) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const userReports = await projectService.getUserReports(projectId);
      setReports(userReports);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const saveReport = async (reportData: {
    name: string;
    type: 'Summary' | 'Analysis' | 'Estimate' | 'BQ' | 'Custom';
    content: string;
    data: any;
    metadata?: any;
  }) => {
    if (!isInitialized) throw new Error('User not initialized');
    
    try {
      const newReport = await projectService.saveAnalysisReport({
        ...reportData,
        projectId,
      });
      setReports(prev => [newReport, ...prev]);
      return newReport;
    } catch (err) {
      console.error('Failed to save report:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadReports();
  }, [isInitialized, projectId]);

  return {
    reports,
    isLoading,
    error,
    loadReports,
    saveReport,
  };
};
