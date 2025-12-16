# Q-Sci Backend API Documentation

## Overview

The Q-Sci Backend API provides a comprehensive RESTful interface for construction project management, document handling, AI-powered chat, vector search, and knowledge graph functionality.

## Base URL

```
Development: http://localhost:3001
Production: https://api.q-sci.com
```

## Authentication

All API endpoints (except health check and user registration) require authentication. Include the user's Clerk token in the Authorization header:

```
Authorization: Bearer <clerk_user_id>
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

## Endpoints

### Health Check

#### GET /health

Check server health status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

### Authentication

#### POST /api/auth/register

Register or update a user.

**Request Body:**
```json
{
  "clerkUserId": "user_123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "User registered successfully",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "clerkUserId": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "isActive": true
    }
  }
}
```

#### GET /api/auth/profile/:clerkUserId

Get user profile by Clerk user ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "clerkUserId": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "preferences": {
        "theme": "light",
        "notifications": true
      }
    }
  }
}
```

### Projects

#### GET /api/projects

Get all projects for the authenticated user.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status
- `type` (optional): Filter by project type
- `search` (optional): Search in project name/description

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Residential Complex",
        "type": "residential",
        "status": "active",
        "description": "A modern residential complex",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

#### POST /api/projects

Create a new project.

**Request Body:**
```json
{
  "name": "New Project",
  "description": "Project description",
  "type": "residential",
  "status": "planning",
  "location": {
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001"
  },
  "budget": {
    "estimated": 1000000,
    "currency": "USD"
  }
}
```

#### GET /api/projects/:projectId

Get project by ID.

#### PATCH /api/projects/:projectId

Update project.

#### DELETE /api/projects/:projectId

Delete project and all related data.

### Documents

#### GET /api/documents/project/:projectId

Get all documents for a project.

**Query Parameters:**
- `page`, `limit`: Pagination
- `type`: Filter by document type
- `status`: Filter by document status
- `search`: Search in title/content

#### POST /api/documents

Create a new document.

**Request Body:**
```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "title": "Project Plan",
  "content": "Document content...",
  "type": "plan",
  "status": "draft",
  "tags": ["planning", "architecture"]
}
```

#### GET /api/documents/:documentId

Get document by ID.

#### PATCH /api/documents/:documentId

Update document (creates new version if content changes).

#### DELETE /api/documents/:documentId

Delete document.

### Files

#### GET /api/files/project/:projectId

Get all files for a project.

#### POST /api/files/upload/:projectId

Upload a file.

**Request:** Multipart form data with `file` field.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "File uploaded successfully",
    "file": {
      "_id": "507f1f77bcf86cd799439011",
      "filename": "file-1234567890.pdf",
      "originalName": "document.pdf",
      "fileType": "application/pdf",
      "fileSize": 1024000,
      "uploadedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### GET /api/files/download/:fileId

Download a file.

#### DELETE /api/files/:fileId

Delete a file.

### Chat

#### GET /api/chat/project/:projectId

Get chat messages for a project.

#### POST /api/chat/send/:projectId

Send a message to the AI assistant.

**Request Body:**
```json
{
  "message": "What are the building requirements for this project?",
  "context": ["document1", "document2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userMessage": {
      "_id": "507f1f77bcf86cd799439011",
      "message": "What are the building requirements?",
      "messageType": "user",
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    "aiMessage": {
      "_id": "507f1f77bcf86cd799439012",
      "message": "Based on your project documents...",
      "messageType": "assistant",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "metadata": {
        "model": "gemini-pro",
        "responseTime": 1500
      }
    }
  }
}
```

### Vector Search

#### POST /api/vector/embed

Create a vector embedding for content.

**Request Body:**
```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "content": "Document content to embed",
  "embeddingType": "document",
  "documentId": "507f1f77bcf86cd799439012"
}
```

#### POST /api/vector/search

Search for similar content using vector similarity.

**Request Body:**
```json
{
  "query": "building requirements",
  "projectId": "507f1f77bcf86cd799439011",
  "limit": 10,
  "threshold": 0.7
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "documentId": "507f1f77bcf86cd799439012",
        "content": "Building requirements include...",
        "score": 0.85,
        "metadata": {
          "embeddingType": "document",
          "createdAt": "2024-01-01T00:00:00.000Z"
        }
      }
    ],
    "query": "building requirements",
    "totalResults": 5,
    "threshold": 0.7
  }
}
```

### Knowledge Graph

#### POST /api/knowledge/entity

Create a knowledge graph entity.

**Request Body:**
```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "entityType": "material",
  "entityId": "concrete-001",
  "entityName": "High-Strength Concrete",
  "properties": {
    "strength": "4000 PSI",
    "type": "ready-mix",
    "supplier": "ABC Concrete"
  }
}
```

#### GET /api/knowledge/entities/:projectId

Get all knowledge graph entities for a project.

#### POST /api/knowledge/relationship

Add a relationship between entities.

**Request Body:**
```json
{
  "sourceEntityId": "507f1f77bcf86cd799439011",
  "targetEntityId": "507f1f77bcf86cd799439012",
  "relationshipType": "uses",
  "strength": 0.9,
  "metadata": {
    "quantity": "100 cubic yards"
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Duplicate resource |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## Rate Limiting

- 100 requests per 15 minutes per IP address
- Configurable via environment variables

## File Upload Limits

- Maximum file size: 50MB
- Allowed file types: PDF, images, documents, archives
- Files are stored locally (configurable)

## WebSocket Events

The API supports real-time features via Socket.IO:

### Connection Events

- `join-project`: Join a project room
- `leave-project`: Leave a project room
- `disconnect`: User disconnected

### Usage

```javascript
const socket = io('http://localhost:3001');

// Join a project
socket.emit('join-project', 'project-id');

// Listen for project updates
socket.on('project-updated', (data) => {
  console.log('Project updated:', data);
});
```

## SDK Examples

### JavaScript/TypeScript

```typescript
class QSciAPI {
  private baseURL: string;
  private authToken: string;

  constructor(baseURL: string, authToken: string) {
    this.baseURL = baseURL;
    this.authToken = authToken;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async getProjects() {
    return this.request('/api/projects');
  }

  async createProject(projectData: any) {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }
}

// Usage
const api = new QSciAPI('http://localhost:3001', 'user-token');
const projects = await api.getProjects();
```

### Python

```python
import requests

class QSciAPI:
    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }

    def get_projects(self):
        response = requests.get(
            f'{self.base_url}/api/projects',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def create_project(self, project_data: dict):
        response = requests.post(
            f'{self.base_url}/api/projects',
            json=project_data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Usage
api = QSciAPI('http://localhost:3001', 'user-token')
projects = api.get_projects()
```

## Testing

The API includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=projects.test.ts
```

## Support

For API support and questions:
- Check the health endpoint: `GET /health`
- Review error responses for detailed error information
- Check server logs for debugging information
- Create an issue in the repository for bugs or feature requests
