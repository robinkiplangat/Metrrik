import type { Document, Template, DocumentVersion } from '../types';

export interface NewDocumentData {
  name: string;
  type: Document['type'];
  client?: string;
  tags?: string[];
  template?: Template;
  description?: string;
}

export interface Client {
  id: string;
  name: string;
}

// Mock clients data - in a real app this would come from an API
const mockClients: Client[] = [
  { id: 'client-1', name: 'Mr. & Mrs. Omondi' },
  { id: 'client-2', name: 'Urban Developers' },
  { id: 'client-3', name: 'Corporate Holdings' },
  { id: 'client-4', name: 'Logistics Inc.' },
  { id: 'client-5', name: 'Private Investor' },
];

// Available document types
export const DOCUMENT_TYPES: Document['type'][] = [
  'Estimate',
  'Proposal', 
  'BQ Draft',
  'Documentation',
  'Request'
];

// Common tags for documents
export const COMMON_TAGS = [
  'Preliminary',
  'Final',
  'Draft',
  'Client Review',
  'Internal',
  'Cost Analysis',
  'Material List',
  'Labor Estimate',
  'Equipment',
  'Subcontractor'
];

// Document templates
export const DOCUMENT_TEMPLATES: Template[] = [
  {
    id: 'temp-1',
    name: 'Standard Tender Document',
    description: 'A formal document for inviting bids for projects.',
    type: 'Proposal',
    content: `# Tender Document

## Project Information
- **Project Name:** [Project Name]
- **Client:** [Client Name]
- **Location:** [Project Location]
- **Tender Reference:** [Reference Number]

## Scope of Work
[Detailed scope of work description]

## Terms and Conditions
[Standard terms and conditions]

## Submission Requirements
[Requirements for tender submission]

## Contact Information
[Contact details for queries]`
  },
  {
    id: 'temp-2',
    name: 'Site Inspection Report',
    description: 'Record observations and findings from a site visit.',
    type: 'Documentation',
    content: `# Site Inspection Report

## Site Details
- **Site Location:** [Address]
- **Inspection Date:** [Date]
- **Inspector:** [Name]
- **Weather Conditions:** [Conditions]

## Observations
### Structural Elements
[Observations about structural elements]

### Materials
[Observations about materials]

### Safety Issues
[Any safety concerns identified]

## Recommendations
[Recommendations based on inspection]

## Photographs
[Reference to attached photographs]`
  },
  {
    id: 'temp-3',
    name: 'Material Requisition Form',
    description: 'Formal request for construction materials.',
    type: 'Request',
    content: `# Material Requisition Form

## Project Information
- **Project:** [Project Name]
- **Requisition Date:** [Date]
- **Requested By:** [Name]
- **Approved By:** [Name]

## Materials Required
| Item | Description | Quantity | Unit | Estimated Cost |
|------|-------------|----------|------|----------------|
| [Item] | [Description] | [Qty] | [Unit] | [Cost] |

## Delivery Requirements
- **Required Date:** [Date]
- **Delivery Location:** [Address]
- **Special Instructions:** [Instructions]

## Approval
- **Project Manager:** [Signature]
- **Date:** [Date]`
  },
  {
    id: 'temp-4',
    name: 'Preliminary Estimate',
    description: 'Initial high-level cost estimation for a project.',
    type: 'Estimate',
    content: `# Preliminary Cost Estimate

## Project Summary
- **Project Name:** [Project Name]
- **Client:** [Client Name]
- **Location:** [Location]
- **Estimate Date:** [Date]
- **Valid Until:** [Date]

## Cost Breakdown
### Substructure
- Foundation works: KES [Amount]
- Excavation: KES [Amount]
- **Subtotal:** KES [Amount]

### Superstructure
- Structural frame: KES [Amount]
- Walls: KES [Amount]
- Roofing: KES [Amount]
- **Subtotal:** KES [Amount]

### Finishes
- Flooring: KES [Amount]
- Painting: KES [Amount]
- Fixtures: KES [Amount]
- **Subtotal:** KES [Amount]

## Summary
- **Total Estimated Cost:** KES [Total Amount]
- **Contingency (10%):** KES [Contingency]
- **Grand Total:** KES [Grand Total]

## Notes
[Additional notes and assumptions]`
  }
];

/**
 * Creates a new document with the provided metadata
 */
export const createNewDocument = (data: NewDocumentData): Document => {
  const now = new Date().toISOString();
  
  // Generate initial content based on template or create blank structure
  let initialContent = '';
  if (data.template && data.template.content) {
    initialContent = data.template.content;
  } else {
    // Create a basic document structure
    initialContent = `# ${data.name}

## Document Information
- **Type:** ${data.type}
- **Created:** ${new Date(now).toLocaleDateString()}
${data.client ? `- **Client:** ${data.client}` : ''}
${data.description ? `- **Description:** ${data.description}` : ''}

## Content
[Document content will be added here]

${data.tags && data.tags.length > 0 ? `
## Tags
${data.tags.map(tag => `- ${tag}`).join('\n')}
` : ''}`;
  }

  const newDocument: Document = {
    id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: data.name,
    type: data.type,
    createdAt: now,
    content: initialContent,
    versions: [
      {
        version: 1,
        createdAt: now,
        content: initialContent
      }
    ]
  };

  return newDocument;
};

/**
 * Gets all available clients
 */
export const getClients = (): Client[] => {
  return mockClients;
};

/**
 * Gets all available document templates
 */
export const getDocumentTemplates = (): Template[] => {
  return DOCUMENT_TEMPLATES;
};

/**
 * Gets templates filtered by type
 */
export const getTemplatesByType = (type: Document['type']): Template[] => {
  return DOCUMENT_TEMPLATES.filter(template => template.type === type);
};

/**
 * Creates a new client
 */
export const createClient = (name: string): Client => {
  const newClient: Client = {
    id: `client-${Date.now()}`,
    name: name.trim()
  };
  
  // In a real app, this would be saved to a database
  mockClients.push(newClient);
  
  return newClient;
};
