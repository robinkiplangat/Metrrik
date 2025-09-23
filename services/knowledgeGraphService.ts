import { userService } from './userService';
import { projectService } from './projectService';
import type { Document, Project, ReportDocument, UploadedFile } from '../types';

// Knowledge Graph Node Types
export type NodeType = 
  | 'project' 
  | 'document' 
  | 'report' 
  | 'file' 
  | 'material' 
  | 'cost_item' 
  | 'location' 
  | 'client' 
  | 'contractor' 
  | 'concept';

// Knowledge Graph Relationship Types
export type RelationshipType = 
  | 'contains' 
  | 'references' 
  | 'similar_to' 
  | 'uses_material' 
  | 'located_in' 
  | 'costs' 
  | 'generates' 
  | 'analyzes' 
  | 'belongs_to' 
  | 'related_to';

// Knowledge Graph Node
export interface KnowledgeNode {
  id: string;
  type: NodeType;
  label: string;
  properties: {
    [key: string]: any;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    confidence: number;
    source: string;
  };
}

// Knowledge Graph Relationship
export interface KnowledgeRelationship {
  id: string;
  source: string; // Source node ID
  target: string; // Target node ID
  type: RelationshipType;
  properties: {
    [key: string]: any;
  };
  metadata: {
    createdAt: string;
    confidence: number;
    source: string;
  };
}

// Knowledge Graph Query Result
export interface GraphQueryResult {
  nodes: KnowledgeNode[];
  relationships: KnowledgeRelationship[];
  paths: Array<{
    nodes: KnowledgeNode[];
    relationships: KnowledgeRelationship[];
    length: number;
  }>;
}

export class KnowledgeGraphService {
  private static instance: KnowledgeGraphService;
  private nodes: Map<string, KnowledgeNode> = new Map();
  private relationships: Map<string, KnowledgeRelationship> = new Map();
  private nodeIndex: Map<NodeType, Set<string>> = new Map();

  private constructor() {
    this.initializeNodeIndex();
  }

  public static getInstance(): KnowledgeGraphService {
    if (!KnowledgeGraphService.instance) {
      KnowledgeGraphService.instance = new KnowledgeGraphService();
    }
    return KnowledgeGraphService.instance;
  }

  private initializeNodeIndex(): void {
    const nodeTypes: NodeType[] = [
      'project', 'document', 'report', 'file', 'material', 
      'cost_item', 'location', 'client', 'contractor', 'concept'
    ];
    
    nodeTypes.forEach(type => {
      this.nodeIndex.set(type, new Set());
    });
  }

  // Add a node to the knowledge graph
  public addNode(node: KnowledgeNode): void {
    this.nodes.set(node.id, node);
    this.nodeIndex.get(node.type)?.add(node.id);
  }

  // Add a relationship to the knowledge graph
  public addRelationship(relationship: KnowledgeRelationship): void {
    this.relationships.set(relationship.id, relationship);
  }

  // Get node by ID
  public getNode(nodeId: string): KnowledgeNode | undefined {
    return this.nodes.get(nodeId);
  }

  // Get nodes by type
  public getNodesByType(type: NodeType): KnowledgeNode[] {
    const nodeIds = this.nodeIndex.get(type) || new Set();
    return Array.from(nodeIds).map(id => this.nodes.get(id)!).filter(Boolean);
  }

  // Get relationships for a node
  public getNodeRelationships(nodeId: string): KnowledgeRelationship[] {
    return Array.from(this.relationships.values()).filter(
      rel => rel.source === nodeId || rel.target === nodeId
    );
  }

  // Build knowledge graph from project data
  public async buildProjectGraph(projectId: string): Promise<void> {
    try {
      const userId = userService.getUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get project data
      const [documents, reports, files] = await Promise.all([
        projectService.getUserDocuments(projectId),
        projectService.getUserReports(projectId),
        projectService.getUserFiles(projectId)
      ]);

      // Create project node
      const projectNode: KnowledgeNode = {
        id: `project_${projectId}`,
        type: 'project',
        label: `Project ${projectId}`,
        properties: {
          projectId,
          userId
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          confidence: 1.0,
          source: 'project_service'
        }
      };
      this.addNode(projectNode);

      // Process documents
      documents.forEach(doc => {
        this.processDocument(doc, projectId);
      });

      // Process reports
      reports.forEach(report => {
        this.processReport(report, projectId);
      });

      // Process files
      files.forEach(file => {
        this.processFile(file, projectId);
      });

      // Extract entities and relationships from content
      await this.extractEntitiesAndRelationships(projectId);

    } catch (error) {
      console.error('Error building project graph:', error);
    }
  }

  // Process document and create nodes/relationships
  private processDocument(doc: Document, projectId: string): void {
    // Create document node
    const docNode: KnowledgeNode = {
      id: `doc_${doc.id}`,
      type: 'document',
      label: doc.name,
      properties: {
        documentId: doc.id,
        type: doc.type,
        content: doc.content,
        createdAt: doc.createdAt
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        confidence: 1.0,
        source: 'document_service'
      }
    };
    this.addNode(docNode);

    // Create relationship: project contains document
    const containsRel: KnowledgeRelationship = {
      id: `rel_${projectId}_contains_${doc.id}`,
      source: `project_${projectId}`,
      target: `doc_${doc.id}`,
      type: 'contains',
      properties: {},
      metadata: {
        createdAt: new Date().toISOString(),
        confidence: 1.0,
        source: 'knowledge_graph'
      }
    };
    this.addRelationship(containsRel);

    // Extract materials and cost items from document content
    this.extractMaterialsFromContent(doc.content, doc.id);
    this.extractCostItemsFromContent(doc.content, doc.id);
  }

  // Process report and create nodes/relationships
  private processReport(report: ReportDocument, projectId: string): void {
    // Create report node
    const reportNode: KnowledgeNode = {
      id: `report_${report._id}`,
      type: 'report',
      label: report.name,
      properties: {
        reportId: report._id,
        type: report.type,
        content: report.content,
        generatedAt: report.generatedAt
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        confidence: 1.0,
        source: 'report_service'
      }
    };
    this.addNode(reportNode);

    // Create relationship: project generates report
    const generatesRel: KnowledgeRelationship = {
      id: `rel_${projectId}_generates_${report._id}`,
      source: `project_${projectId}`,
      target: `report_${report._id}`,
      type: 'generates',
      properties: {},
      metadata: {
        createdAt: new Date().toISOString(),
        confidence: 1.0,
        source: 'knowledge_graph'
      }
    };
    this.addRelationship(generatesRel);
  }

  // Process file and create nodes/relationships
  private processFile(file: UploadedFile, projectId: string): void {
    // Create file node
    const fileNode: KnowledgeNode = {
      id: `file_${file.id}`,
      type: 'file',
      label: file.name,
      properties: {
        fileId: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: file.uploadedAt
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        confidence: 1.0,
        source: 'file_service'
      }
    };
    this.addNode(fileNode);

    // Create relationship: project contains file
    const containsRel: KnowledgeRelationship = {
      id: `rel_${projectId}_contains_file_${file.id}`,
      source: `project_${projectId}`,
      target: `file_${file.id}`,
      type: 'contains',
      properties: {},
      metadata: {
        createdAt: new Date().toISOString(),
        confidence: 1.0,
        source: 'knowledge_graph'
      }
    };
    this.addRelationship(containsRel);
  }

  // Extract materials from document content
  private extractMaterialsFromContent(content: string, documentId: string): void {
    const materialKeywords = [
      'concrete', 'steel', 'brick', 'block', 'tiles', 'paint', 'roofing',
      'timber', 'glass', 'aluminum', 'cement', 'sand', 'gravel', 'stone',
      'marble', 'granite', 'wood', 'plastic', 'metal', 'iron'
    ];

    materialKeywords.forEach(material => {
      if (content.toLowerCase().includes(material)) {
        const materialId = `material_${material}`;
        
        // Create material node if it doesn't exist
        if (!this.nodes.has(materialId)) {
          const materialNode: KnowledgeNode = {
            id: materialId,
            type: 'material',
            label: material.charAt(0).toUpperCase() + material.slice(1),
            properties: {
              name: material,
              category: this.getMaterialCategory(material)
            },
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              confidence: 0.8,
              source: 'content_extraction'
            }
          };
          this.addNode(materialNode);
        }

        // Create relationship: document uses material
        const usesRel: KnowledgeRelationship = {
          id: `rel_${documentId}_uses_${material}`,
          source: `doc_${documentId}`,
          target: materialId,
          type: 'uses_material',
          properties: {},
          metadata: {
            createdAt: new Date().toISOString(),
            confidence: 0.8,
            source: 'content_extraction'
          }
        };
        this.addRelationship(usesRel);
      }
    });
  }

  // Extract cost items from document content
  private extractCostItemsFromContent(content: string, documentId: string): void {
    const costPattern = /KES\s*([\d,]+)/g;
    let match;
    let costItemIndex = 0;

    while ((match = costPattern.exec(content)) !== null) {
      const costItemId = `cost_${documentId}_${costItemIndex++}`;
      const amount = parseInt(match[1].replace(/,/g, ''));
      
      // Create cost item node
      const costNode: KnowledgeNode = {
        id: costItemId,
        type: 'cost_item',
        label: `KES ${match[1]}`,
        properties: {
          amount,
          currency: 'KES',
          rawText: match[0]
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          confidence: 0.9,
          source: 'content_extraction'
        }
      };
      this.addNode(costNode);

      // Create relationship: document costs
      const costsRel: KnowledgeRelationship = {
        id: `rel_${documentId}_costs_${costItemId}`,
        source: `doc_${documentId}`,
        target: costItemId,
        type: 'costs',
        properties: {},
        metadata: {
          createdAt: new Date().toISOString(),
          confidence: 0.9,
          source: 'content_extraction'
        }
      };
      this.addRelationship(costsRel);
    }
  }

  // Get material category
  private getMaterialCategory(material: string): string {
    const categories: { [key: string]: string[] } = {
      'structural': ['concrete', 'steel', 'brick', 'block', 'cement'],
      'finishing': ['tiles', 'paint', 'marble', 'granite', 'wood'],
      'roofing': ['roofing', 'timber', 'aluminum'],
      'windows': ['glass', 'aluminum'],
      'aggregates': ['sand', 'gravel', 'stone']
    };

    for (const [category, materials] of Object.entries(categories)) {
      if (materials.includes(material)) {
        return category;
      }
    }
    return 'other';
  }

  // Extract entities and relationships from content
  private async extractEntitiesAndRelationships(projectId: string): Promise<void> {
    // This would typically use NLP techniques to extract more complex relationships
    // For now, we'll implement basic pattern matching
    
    const documents = this.getNodesByType('document');
    
    documents.forEach(doc => {
      const content = doc.properties.content || '';
      
      // Extract location references
      this.extractLocations(content, doc.id);
      
      // Extract client references
      this.extractClients(content, doc.id);
    });
  }

  // Extract location references
  private extractLocations(content: string, documentId: string): void {
    const locationKeywords = [
      'nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'thika',
      'runda', 'kilimani', 'karen', 'westlands', 'lavington'
    ];

    locationKeywords.forEach(location => {
      if (content.toLowerCase().includes(location)) {
        const locationId = `location_${location}`;
        
        if (!this.nodes.has(locationId)) {
          const locationNode: KnowledgeNode = {
            id: locationId,
            type: 'location',
            label: location.charAt(0).toUpperCase() + location.slice(1),
            properties: {
              name: location,
              type: 'city'
            },
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              confidence: 0.7,
              source: 'content_extraction'
            }
          };
          this.addNode(locationNode);
        }

        const locatedRel: KnowledgeRelationship = {
          id: `rel_${documentId}_located_${location}`,
          source: `doc_${documentId}`,
          target: locationId,
          type: 'located_in',
          properties: {},
          metadata: {
            createdAt: new Date().toISOString(),
            confidence: 0.7,
            source: 'content_extraction'
          }
        };
        this.addRelationship(locatedRel);
      }
    });
  }

  // Extract client references
  private extractClients(content: string, documentId: string): void {
    const clientPattern = /client[:\s]+([A-Za-z\s&.]+)/gi;
    let match;

    while ((match = clientPattern.exec(content)) !== null) {
      const clientName = match[1].trim();
      const clientId = `client_${clientName.replace(/\s+/g, '_').toLowerCase()}`;
      
      if (!this.nodes.has(clientId)) {
        const clientNode: KnowledgeNode = {
          id: clientId,
          type: 'client',
          label: clientName,
          properties: {
            name: clientName
          },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            confidence: 0.8,
            source: 'content_extraction'
          }
        };
        this.addNode(clientNode);
      }

      const belongsRel: KnowledgeRelationship = {
        id: `rel_${documentId}_belongs_${clientId}`,
        source: `doc_${documentId}`,
        target: clientId,
        type: 'belongs_to',
        properties: {},
        metadata: {
          createdAt: new Date().toISOString(),
          confidence: 0.8,
          source: 'content_extraction'
        }
      };
      this.addRelationship(belongsRel);
    }
  }

  // Query the knowledge graph
  public queryGraph(query: {
    nodeTypes?: NodeType[];
    relationshipTypes?: RelationshipType[];
    properties?: { [key: string]: any };
    limit?: number;
  }): GraphQueryResult {
    let nodes: KnowledgeNode[] = [];
    let relationships: KnowledgeRelationship[] = [];

    // Filter nodes by type
    if (query.nodeTypes && query.nodeTypes.length > 0) {
      query.nodeTypes.forEach(type => {
        nodes = nodes.concat(this.getNodesByType(type));
      });
    } else {
      nodes = Array.from(this.nodes.values());
    }

    // Filter by properties
    if (query.properties) {
      nodes = nodes.filter(node => {
        return Object.entries(query.properties!).every(([key, value]) => {
          return node.properties[key] === value;
        });
      });
    }

    // Get relationships for filtered nodes
    const nodeIds = new Set(nodes.map(n => n.id));
    relationships = Array.from(this.relationships.values()).filter(rel => {
      return nodeIds.has(rel.source) || nodeIds.has(rel.target);
    });

    // Filter relationships by type
    if (query.relationshipTypes && query.relationshipTypes.length > 0) {
      relationships = relationships.filter(rel => 
        query.relationshipTypes!.includes(rel.type)
      );
    }

    // Apply limit
    if (query.limit) {
      nodes = nodes.slice(0, query.limit);
      relationships = relationships.slice(0, query.limit);
    }

    // Find paths (simplified implementation)
    const paths = this.findPaths(nodes, relationships);

    return {
      nodes,
      relationships,
      paths
    };
  }

  // Find paths between nodes (simplified implementation)
  private findPaths(nodes: KnowledgeNode[], relationships: KnowledgeRelationship[]): Array<{
    nodes: KnowledgeNode[];
    relationships: KnowledgeRelationship[];
    length: number;
  }> {
    // This is a simplified path finding implementation
    // In a real system, you'd use graph algorithms like BFS or DFS
    const paths: Array<{
      nodes: KnowledgeNode[];
      relationships: KnowledgeRelationship[];
      length: number;
    }> = [];

    // Find direct connections
    relationships.forEach(rel => {
      const sourceNode = nodes.find(n => n.id === rel.source);
      const targetNode = nodes.find(n => n.id === rel.target);
      
      if (sourceNode && targetNode) {
        paths.push({
          nodes: [sourceNode, targetNode],
          relationships: [rel],
          length: 1
        });
      }
    });

    return paths;
  }

  // Get graph statistics
  public getGraphStats(): {
    totalNodes: number;
    totalRelationships: number;
    nodesByType: { [key in NodeType]: number };
    relationshipsByType: { [key in RelationshipType]: number };
  } {
    const nodesByType: { [key in NodeType]: number } = {} as any;
    const relationshipsByType: { [key in RelationshipType]: number } = {} as any;

    // Count nodes by type
    Array.from(this.nodeIndex.entries()).forEach(([type, nodeIds]) => {
      nodesByType[type] = nodeIds.size;
    });

    // Count relationships by type
    Array.from(this.relationships.values()).forEach(rel => {
      relationshipsByType[rel.type] = (relationshipsByType[rel.type] || 0) + 1;
    });

    return {
      totalNodes: this.nodes.size,
      totalRelationships: this.relationships.size,
      nodesByType,
      relationshipsByType
    };
  }

  // Clear graph data
  public clearGraph(): void {
    this.nodes.clear();
    this.relationships.clear();
    this.initializeNodeIndex();
  }
}

// Export singleton instance
export const knowledgeGraphService = KnowledgeGraphService.getInstance();
