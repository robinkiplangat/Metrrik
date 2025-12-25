# 📁 File Storage & Hosting Guide for Q-Sci

## Overview

Q-Sci handles various types of construction files including:
- **Construction Plans**: PDFs, CAD files (DWG, DXF)
- **Images**: Photos, blueprints, site images (JPEG, PNG, TIFF)
- **Documents**: Specifications, contracts, reports (DOC, DOCX, XLS, XLSX)
- **Archives**: Project bundles (ZIP, RAR)

## 🏗️ Storage Options

### 1. **Local Storage (Development)**
```bash
# Current setup - files stored locally
FILE_STORAGE_TYPE=local
UPLOAD_DIR=uploads
```

**Pros:**
- Simple setup
- No external dependencies
- Good for development/testing

**Cons:**
- Not scalable
- Files lost on server restart
- No CDN/global access
- Limited backup options

### 2. **AWS S3 + CloudFront (Recommended for Production)**

#### Setup Steps:
1. **Create S3 Bucket:**
```bash
aws s3 mb s3://q-sci-construction-files
```

2. **Configure CORS:**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": []
  }
]
```

3. **Set up CloudFront Distribution:**
- Origin: S3 bucket
- Caching: Optimized for large files
- Security: Signed URLs for private files

4. **Environment Configuration:**
```bash
FILE_STORAGE_TYPE=s3
AWS_S3_BUCKET=q-sci-construction-files
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

**Benefits:**
- ✅ Scalable (unlimited storage)
- ✅ Global CDN (fast access worldwide)
- ✅ Versioning & lifecycle policies
- ✅ Security & access controls
- ✅ Cost-effective ($0.023/GB/month)
- ✅ Integration with AWS services

### 3. **Google Cloud Storage (Alternative)**

```bash
FILE_STORAGE_TYPE=gcs
GCS_BUCKET=q-sci-files
GCS_PROJECT_ID=your-project-id
GCS_KEY_FILENAME=path/to/service-account.json
```

**Benefits:**
- Good integration with Google AI services
- Competitive pricing
- Global edge locations

### 4. **Azure Blob Storage (Enterprise)**

```bash
FILE_STORAGE_TYPE=azure
AZURE_STORAGE_ACCOUNT=qsci
AZURE_STORAGE_KEY=your-key
AZURE_CONTAINER_NAME=construction-files
```

## 📊 File Organization Structure

```
construction-files/
├── projects/
│   ├── {projectId}/
│   │   ├── plans/
│   │   │   ├── architectural/
│   │   │   ├── structural/
│   │   │   ├── electrical/
│   │   │   └── plumbing/
│   │   ├── images/
│   │   │   ├── site-photos/
│   │   │   ├── progress/
│   │   │   └── inspections/
│   │   ├── documents/
│   │   │   ├── contracts/
│   │   │   ├── specifications/
│   │   │   └── reports/
│   │   └── archives/
│   └── shared/
│       ├── templates/
│       └── standards/
```

## 🔒 Security & Access Control

### File Access Levels:
1. **Public**: Publicly accessible files (templates, standards)
2. **Project**: Accessible by project team members
3. **Private**: Accessible only by file owner
4. **Confidential**: Encrypted, audit-logged access

### Implementation:
```typescript
// Signed URLs for secure access
const signedUrl = await fileStorage.getSignedUrl(filePath, 3600); // 1 hour expiry

// Access control based on user roles
if (user.role === 'admin' || user.projectId === file.projectId) {
  // Allow access
}
```

## 💰 Cost Estimation

### AWS S3 Pricing (US East):
- **Storage**: $0.023/GB/month
- **Requests**: $0.0004 per 1,000 GET requests
- **Data Transfer**: $0.09/GB (first 1GB free)

### Example for 1000 projects:
- **Average file size**: 5MB per file
- **Files per project**: 50 files
- **Total storage**: 250GB
- **Monthly cost**: ~$6 + transfer costs

## 🚀 Migration Strategy

### Phase 1: Development (Current)
- Use local storage
- Test file upload/download functionality
- Implement file organization

### Phase 2: Staging
- Set up S3 bucket
- Test cloud storage integration
- Implement signed URLs

### Phase 3: Production
- Migrate existing files to S3
- Set up CloudFront CDN
- Implement advanced security

## 📋 Implementation Checklist

### Backend Setup:
- [ ] Install AWS SDK: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
- [ ] Configure environment variables
- [ ] Update file routes to use new storage service
- [ ] Implement signed URL generation
- [ ] Add file access controls

### Frontend Integration:
- [ ] Update file upload components
- [ ] Implement progress indicators for large files
- [ ] Add file preview functionality
- [ ] Implement drag-and-drop upload

### Security:
- [ ] Set up IAM roles and policies
- [ ] Configure bucket policies
- [ ] Implement file encryption
- [ ] Add audit logging

### Monitoring:
- [ ] Set up CloudWatch metrics
- [ ] Monitor storage costs
- [ ] Track file access patterns
- [ ] Implement alerts for unusual activity

## 🔧 Configuration Examples

### Development (.env):
```bash
FILE_STORAGE_TYPE=local
UPLOAD_DIR=uploads
MAX_FILE_SIZE=52428800
```

### Production (.env):
```bash
FILE_STORAGE_TYPE=s3
AWS_S3_BUCKET=q-sci-production-files
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
MAX_FILE_SIZE=104857600  # 100MB for production
```

## 📞 Support & Troubleshooting

### Common Issues:
1. **File upload fails**: Check file size limits and permissions
2. **Slow downloads**: Consider CloudFront CDN setup
3. **Access denied**: Verify IAM policies and bucket permissions
4. **High costs**: Review lifecycle policies and storage classes

### Monitoring Commands:
```bash
# Check S3 bucket usage
aws s3 ls s3://your-bucket --recursive --human-readable --summarize

# Monitor costs
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics BlendedCost
```

## 🎯 Recommendations

### For Q-Sci Construction Management:

1. **Start with AWS S3** - Most mature ecosystem
2. **Use CloudFront CDN** - Essential for global access
3. **Implement file versioning** - Critical for construction plans
4. **Set up automated backups** - Protect against data loss
5. **Monitor costs closely** - Large files can be expensive
6. **Use appropriate storage classes** - IA for infrequently accessed files

### File Size Recommendations:
- **Images**: Compress to <2MB
- **PDFs**: Optimize for web viewing
- **CAD files**: Consider conversion to PDF for viewing
- **Archives**: Use compression

This setup will provide a robust, scalable file storage solution for your construction management application!
