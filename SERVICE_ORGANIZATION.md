# Service Organization - Q-Sci

## 🎯 **Overview**

The services have been reorganized for better efficiency, maintainability, and clear separation of concerns between frontend and backend services.

## 📁 **New Service Structure**

```
/services/
├── client/           # Frontend-only services
│   ├── apiService.ts      # HTTP API client
│   ├── geminiService.ts   # AI/Gemini API client
│   └── userService.ts     # User session management
├── server/           # Backend-only services
│   ├── projectService.ts      # Project management
│   ├── documentService.ts     # Document operations
│   ├── mongodbService.ts      # Database operations
│   ├── knowledgeBaseService.ts # Knowledge base
│   ├── knowledgeGraphService.ts # Knowledge graph
│   ├── vectorService.ts       # Vector operations
│   └── databaseInit.ts        # Database initialization
├── shared/           # Shared utilities and types
│   └── types.ts              # TypeScript type definitions
└── index.ts          # Service exports and re-exports
```

## 🔄 **Migration Summary**

### **Before (Inefficient)**
- ❌ Mixed service locations (`/services/` and `/backend/src/services/`)
- ❌ Unclear service boundaries
- ❌ Duplicate imports across components
- ❌ Inconsistent import paths
- ❌ Types scattered across files

### **After (Optimized)**
- ✅ Clear separation: `client/`, `server/`, `shared/`
- ✅ Consistent import patterns
- ✅ Centralized type definitions
- ✅ Clean service exports via `index.ts`
- ✅ Better maintainability and scalability

## 📋 **Service Categories**

### **Client Services** (`/services/client/`)
- **Purpose**: Frontend-only services that run in the browser
- **Examples**: API calls, user session management, AI client
- **Import Pattern**: `import { service } from '../../services/client/serviceName'`

### **Server Services** (`/services/server/`)
- **Purpose**: Backend services that handle business logic and data
- **Examples**: Database operations, project management, knowledge base
- **Import Pattern**: `import { service } from '../../services/server/serviceName'`

### **Shared Services** (`/services/shared/`)
- **Purpose**: Common utilities, types, and constants
- **Examples**: TypeScript types, utility functions, constants
- **Import Pattern**: `import { Type } from '../../services/shared/types'`

## 🚀 **Benefits**

### **1. Clear Separation of Concerns**
- Frontend services are clearly separated from backend services
- No confusion about where services should be located
- Easier to maintain and debug

### **2. Better Import Management**
- Consistent import paths across the application
- Centralized exports via `services/index.ts`
- Reduced import path complexity

### **3. Improved Scalability**
- Easy to add new services in the appropriate category
- Clear patterns for service organization
- Better code organization for team development

### **4. Enhanced Maintainability**
- Services are logically grouped by their purpose
- Easier to find and modify specific functionality
- Reduced coupling between frontend and backend code

## 📝 **Usage Examples**

### **Importing Client Services**
```typescript
// In components
import { analysisApi } from '../../services/client/apiService';
import { analyzeFloorPlan } from '../../services/client/geminiService';
import { userService } from '../../services/client/userService';
```

### **Importing Server Services**
```typescript
// In hooks or server-side code
import { projectService } from '../../services/server/projectService';
import { vectorService } from '../../services/server/vectorService';
import { knowledgeBaseService } from '../../services/server/knowledgeBaseService';
```

### **Importing Shared Types**
```typescript
// Anywhere in the application
import type { Project, Document, UploadedFile } from '../../services/shared/types';
```

### **Using Service Index (Optional)**
```typescript
// Clean imports via index
import { 
  analysisApi, 
  projectService, 
  type Project, 
  type Document 
} from '../../services';
```

## 🔧 **Migration Checklist**

- ✅ Moved client services to `/services/client/`
- ✅ Moved server services to `/services/server/`
- ✅ Moved types to `/services/shared/types.ts`
- ✅ Updated all import statements in components
- ✅ Updated all import statements in hooks
- ✅ Updated main App.tsx imports
- ✅ Created service index for clean exports
- ✅ Fixed all TypeScript compilation errors
- ✅ Verified build success

## 🎉 **Result**

The service organization is now **highly efficient** with:
- **Clear boundaries** between frontend and backend services
- **Consistent patterns** for imports and exports
- **Better maintainability** and scalability
- **Reduced complexity** in import management
- **Professional structure** suitable for enterprise development

This organization follows industry best practices and makes the codebase much more maintainable and scalable for future development.
