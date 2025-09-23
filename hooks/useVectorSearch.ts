import { useState, useCallback } from 'react';
import { vectorService } from '../services/vectorService';
import type { VectorSearchResult, VectorEmbedding, DocumentVector } from '../services/vectorService';
import type { Document } from '../types';

// Hook for vector search operations
export const useVectorSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<VectorSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Search for similar documents
  const searchDocuments = useCallback(async (
    query: string, 
    projectId?: string, 
    limit: number = 10
  ): Promise<VectorSearchResult[]> => {
    try {
      setIsSearching(true);
      setError(null);
      
      const results = await vectorService.searchSimilarDocuments(query, projectId, limit);
      setSearchResults(results);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      console.error('Vector search error:', err);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Search within a specific document
  const searchWithinDocument = useCallback(async (
    documentId: string, 
    query: string, 
    limit: number = 5
  ): Promise<VectorSearchResult[]> => {
    try {
      setIsSearching(true);
      setError(null);
      
      const results = await vectorService.searchWithinDocument(documentId, query, limit);
      setSearchResults(results);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Document search failed';
      setError(errorMessage);
      console.error('Document search error:', err);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Create embeddings for a document
  const createDocumentEmbedding = useCallback(async (document: Document): Promise<VectorEmbedding | null> => {
    try {
      setError(null);
      return await vectorService.createDocumentEmbedding(document);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create embedding';
      setError(errorMessage);
      console.error('Embedding creation error:', err);
      return null;
    }
  }, []);

  // Create document chunks
  const createDocumentChunks = useCallback(async (document: Document): Promise<DocumentVector | null> => {
    try {
      setError(null);
      return await vectorService.createDocumentChunks(document);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create document chunks';
      setError(errorMessage);
      console.error('Document chunking error:', err);
      return null;
    }
  }, []);

  // Create chat embedding
  const createChatEmbedding = useCallback(async (
    message: string, 
    sessionId: string, 
    projectId?: string
  ): Promise<VectorEmbedding | null> => {
    try {
      setError(null);
      return await vectorService.createChatEmbedding(message, sessionId, projectId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create chat embedding';
      setError(errorMessage);
      console.error('Chat embedding error:', err);
      return null;
    }
  }, []);

  // Create file embedding
  const createFileEmbedding = useCallback(async (
    fileName: string, 
    content: string, 
    projectId?: string
  ): Promise<VectorEmbedding | null> => {
    try {
      setError(null);
      return await vectorService.createFileEmbedding(fileName, content, projectId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create file embedding';
      setError(errorMessage);
      console.error('File embedding error:', err);
      return null;
    }
  }, []);

  // Clear search results
  const clearResults = useCallback(() => {
    setSearchResults([]);
    setError(null);
  }, []);

  return {
    // State
    isSearching,
    searchResults,
    error,
    
    // Actions
    searchDocuments,
    searchWithinDocument,
    createDocumentEmbedding,
    createDocumentChunks,
    createChatEmbedding,
    createFileEmbedding,
    clearResults,
    
    // Utility
    calculateSimilarity: vectorService.calculateSimilarity.bind(vectorService),
    chunkText: vectorService.chunkText.bind(vectorService),
    generateEmbedding: vectorService.generateEmbedding.bind(vectorService),
  };
};

// Hook for document vector operations
export const useDocumentVectors = (documentId?: string) => {
  const [vectors, setVectors] = useState<DocumentVector[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create vectors for a document
  const createVectors = useCallback(async (document: Document): Promise<DocumentVector | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const documentVector = await vectorService.createDocumentChunks(document);
      if (documentVector) {
        setVectors(prev => [...prev, documentVector]);
      }
      return documentVector;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create document vectors';
      setError(errorMessage);
      console.error('Document vector creation error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search within document vectors
  const searchVectors = useCallback(async (
    query: string, 
    limit: number = 5
  ): Promise<VectorSearchResult[]> => {
    if (!documentId) {
      setError('No document ID provided');
      return [];
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const results = await vectorService.searchWithinDocument(documentId, query, limit);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Vector search failed';
      setError(errorMessage);
      console.error('Vector search error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  return {
    vectors,
    isLoading,
    error,
    createVectors,
    searchVectors,
  };
};

// Hook for semantic search across all content
export const useSemanticSearch = () => {
  const [searchHistory, setSearchHistory] = useState<Array<{
    query: string;
    results: VectorSearchResult[];
    timestamp: string;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Perform semantic search
  const performSearch = useCallback(async (
    query: string, 
    projectId?: string, 
    limit: number = 10
  ): Promise<VectorSearchResult[]> => {
    try {
      setIsSearching(true);
      setError(null);
      
      const results = await vectorService.searchSimilarDocuments(query, projectId, limit);
      
      // Add to search history
      setSearchHistory(prev => [{
        query,
        results,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)]); // Keep last 10 searches
      
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Semantic search failed';
      setError(errorMessage);
      console.error('Semantic search error:', err);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Clear search history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    setError(null);
  }, []);

  // Get search suggestions based on history
  const getSuggestions = useCallback((currentQuery: string): string[] => {
    if (!currentQuery.trim()) return [];
    
    const suggestions = searchHistory
      .filter(entry => 
        entry.query.toLowerCase().includes(currentQuery.toLowerCase()) ||
        currentQuery.toLowerCase().includes(entry.query.toLowerCase())
      )
      .map(entry => entry.query)
      .slice(0, 5);
    
    return [...new Set(suggestions)]; // Remove duplicates
  }, [searchHistory]);

  return {
    searchHistory,
    isSearching,
    error,
    performSearch,
    clearHistory,
    getSuggestions,
  };
};
