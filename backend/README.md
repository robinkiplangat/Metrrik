# Metrrik Backend API

A robust Express.js backend API for the Metrrik construction management platform, built with TypeScript, MongoDB, and modern best practices.

## 🚀 Features

- **RESTful API** with comprehensive endpoints
- **MongoDB Atlas** integration with proper indexing
- **Authentication** using Clerk integration
- **File Upload** with multer and sharp
- **Vector Search** for semantic document search
- **Knowledge Graph** for entity relationships
- **AI Integration** with Gemini and OpenAI
- **Real-time** features with Socket.IO
- **Security** with helmet, CORS, and rate limiting
- **Logging** with Winston
- **Error Handling** with custom middleware
- **Validation** with express-validator

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # MongoDB connection and configuration
│   ├── middleware/
│   │   ├── auth.ts              # Authentication middleware
│   │   ├── errorHandler.ts      # Error handling middleware
│   │   └── notFound.ts          # 404 handler
│   ├── routes/
│   │   ├── auth.ts              # User authentication routes
│   │   ├── users.ts             # User management routes
│   │   ├── projects.ts          # Project management routes
│   │   ├── documents.ts         # Document CRUD routes
│   │   ├── files.ts             # File upload/download routes
│   │   ├── chat.ts              # AI chat routes
│   │   ├── vector.ts            # Vector search routes
│   │   └── knowledge.ts         # Knowledge graph routes
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   ├── utils/
│   │   └── logger.ts            # Winston logger configuration
│   └── server.ts                # Main server file
├── logs/                        # Log files directory
├── uploads/                     # File uploads directory
├── package.json                 # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
└── README.md                   # This file
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your actual values
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 🔧 Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=cluster

# AI Services
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Authentication
JWT_SECRET=your_jwt_secret_here
CLERK_SECRET_KEY=your_clerk_secret_key_here

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR=uploads

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:5173

# Security
HELMET_CSP_ENABLED=true
HELMET_HSTS_ENABLED=true
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register/update user
- `GET /api/auth/profile/:clerkUserId` - Get user profile
- `PATCH /api/auth/preferences/:clerkUserId` - Update user preferences
- `GET /api/auth/stats/:clerkUserId` - Get user statistics

### Users
- `GET /api/users` - Get all users (admin)
- `GET /api/users/:userId` - Get user by ID
- `PATCH /api/users/:userId` - Update user profile
- `GET /api/users/:userId/activity` - Get user activity
- `GET /api/users/:userId/dashboard` - Get user dashboard data

### Projects
- `GET /api/projects` - Get user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:projectId` - Get project by ID
- `PATCH /api/projects/:projectId` - Update project
- `DELETE /api/projects/:projectId` - Delete project
- `GET /api/projects/:projectId/stats` - Get project statistics
- `GET /api/projects/:projectId/timeline` - Get project timeline

### Documents
- `GET /api/documents/project/:projectId` - Get project documents
- `POST /api/documents` - Create new document
- `GET /api/documents/:documentId` - Get document by ID
- `PATCH /api/documents/:documentId` - Update document
- `DELETE /api/documents/:documentId` - Delete document
- `GET /api/documents/:documentId/versions` - Get document versions
- `GET /api/documents/search/:projectId` - Search documents

### Files
- `GET /api/files/project/:projectId` - Get project files
- `POST /api/files/upload/:projectId` - Upload file
- `GET /api/files/:fileId` - Get file info
- `GET /api/files/download/:fileId` - Download file
- `PATCH /api/files/:fileId` - Update file metadata
- `DELETE /api/files/:fileId` - Delete file
- `GET /api/files/stats/:projectId` - Get file statistics

### Chat
- `GET /api/chat/project/:projectId` - Get chat messages
- `POST /api/chat/send/:projectId` - Send message to AI
- `GET /api/chat/history/:projectId` - Get chat history
- `DELETE /api/chat/history/:projectId` - Clear chat history
- `GET /api/chat/stats/:projectId` - Get chat statistics

### Vector Search
- `POST /api/vector/embed` - Create vector embedding
- `POST /api/vector/search` - Search vectors
- `GET /api/vector/project/:projectId` - Get project embeddings
- `DELETE /api/vector/:embeddingId` - Delete embedding
- `GET /api/vector/stats/:projectId` - Get vector statistics

### Knowledge Graph
- `POST /api/knowledge/entity` - Create knowledge entity
- `GET /api/knowledge/entities/:projectId` - Get project entities
- `GET /api/knowledge/entity/:entityId` - Get entity by ID
- `PATCH /api/knowledge/entity/:entityId` - Update entity
- `DELETE /api/knowledge/entity/:entityId` - Delete entity
- `POST /api/knowledge/relationship` - Add entity relationship
- `GET /api/knowledge/visualization/:projectId` - Get visualization data
- `GET /api/knowledge/stats/:projectId` - Get knowledge graph statistics

## 🔒 Authentication

The API uses Clerk for authentication. Include the user's Clerk token in the Authorization header:

```
Authorization: Bearer <clerk_user_id>
```

## 📊 Database Schema

### Collections
- **users** - User profiles and preferences
- **sessions** - User sessions with TTL
- **projects** - Construction projects
- **documents** - Project documents with versioning
- **chat_messages** - AI chat history
- **uploaded_files** - File metadata and storage
- **reports** - Generated reports
- **vector_embeddings** - Document embeddings
- **document_vectors** - Vector search data
- **knowledge_graph** - Entity relationships

### Indexes
All collections have appropriate indexes for optimal performance:
- User lookups by Clerk ID
- Project queries by user and status
- Document searches by project and content
- Vector similarity searches
- Knowledge graph entity relationships

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["npm", "start"]
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📝 Logging

Logs are written to:
- Console (development)
- `logs/error.log` (errors only)
- `logs/combined.log` (all logs)

Log levels: `error`, `warn`, `info`, `http`, `debug`

## 🔧 Configuration

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable via environment variables

### File Uploads
- Maximum file size: 50MB
- Allowed types: PDF, images, documents, archives
- Storage: Local filesystem (configurable)

### CORS
- Configurable origins
- Credentials enabled
- Preflight handling

## 🛡️ Security

- **Helmet** for security headers
- **CORS** for cross-origin requests
- **Rate limiting** for DDoS protection
- **Input validation** with express-validator
- **File type validation** for uploads
- **Authentication** required for all endpoints

## 📈 Performance

- **Compression** middleware for response compression
- **Database indexing** for fast queries
- **Connection pooling** for MongoDB
- **Efficient pagination** for large datasets
- **Vector search** optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔄 Updates

The backend is designed to be easily extensible. New features can be added by:
1. Creating new route files
2. Adding new database collections
3. Implementing new middleware
4. Updating the type definitions

---

**Built with ❤️ for the construction industry**
