#!/usr/bin/env node

const { S3Client, ListBucketsCommand, CreateBucketCommand, PutBucketCorsCommand, PutBucketPolicyCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { fromEnv } = require('@aws-sdk/credential-provider-env');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'us-east-1',
  credentials: fromEnv()
});

const BUCKET_NAMES = {
  main: process.env.AWS_S3_BUCKET || 'q-sci-uploads',
  analysis: process.env.AWS_S3_ANALYSIS_BUCKET || 'q-sci-analysis-results',
  temp: process.env.AWS_S3_TEMP_BUCKET || 'q-sci-temp-files'
  // main: process.env.AWS_S3_BUCKET || 'metrrik-uploads',
  // analysis: process.env.AWS_S3_ANALYSIS_BUCKET || 'metrrik-analysis-results',
  // temp: process.env.AWS_S3_TEMP_BUCKET || 'metrrik-temp-files'
};

async function checkAWSCredentials() {
  try {
    await s3Client.send(new ListBucketsCommand({}));
    console.log('✅ AWS credentials are valid');
    return true;
  } catch (error) {
    console.error('❌ AWS credentials are invalid or missing:', error.message);
    console.log('\n🔧 Please set the following environment variables:');
    console.log('   AWS_ACCESS_KEY_ID=your_access_key');
    console.log('   AWS_SECRET_ACCESS_KEY=your_secret_key');
    console.log('   AWS_S3_REGION=your_region (optional, defaults to us-east-1)');
    return false;
  }
}

async function createBucketIfNotExists(bucketName, region) {
  try {
    // Check if bucket exists
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`ℹ️  Bucket already exists: ${bucketName}`);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      // Create bucket
      try {
        const createBucketParams = {
          Bucket: bucketName,
          CreateBucketConfiguration: region === 'us-east-1' ? undefined : {
            LocationConstraint: region
          }
        };

        await s3Client.send(new CreateBucketCommand(createBucketParams));
        console.log(`✅ Created bucket: ${bucketName}`);
        return true;
      } catch (createError) {
        console.error(`❌ Failed to create bucket ${bucketName}:`, createError.message);
        return false;
      }
    } else {
      console.error(`❌ Error checking bucket ${bucketName}:`, error.message);
      return false;
    }
  }
}

async function configureBucketCors(bucketName) {
  const corsConfig = {
    CORSRules: [
      {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedOrigins: [
          'http://localhost:3000',
          'http://localhost:5173',
          'https://localhost:3000',
          'https://localhost:5173',
          process.env.FRONTEND_URL || 'http://localhost:3000'
        ],
        ExposeHeaders: ['ETag', 'Content-Length'],
        MaxAgeSeconds: 3600
      }
    ]
  };

  try {
    await s3Client.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfig
    }));
    console.log(`✅ Configured CORS for: ${bucketName}`);
  } catch (error) {
    console.error(`❌ Failed to configure CORS for ${bucketName}:`, error.message);
  }
}

async function configureBucketPolicy(bucketName) {
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadGetObject',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${bucketName}/*`
      },
      {
        Sid: 'AllowUploads',
        Effect: 'Allow',
        Principal: '*',
        Action: [
          's3:PutObject',
          's3:PutObjectAcl'
        ],
        Resource: `arn:aws:s3:::${bucketName}/*`
      }
    ]
  };

  try {
    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(policy)
    }));
    console.log(`✅ Configured policy for: ${bucketName}`);
  } catch (error) {
    console.error(`❌ Failed to configure policy for ${bucketName}:`, error.message);
  }
}

async function generateEnvFile() {
  const envContent = `# AWS S3 Configuration
AWS_S3_BUCKET=${BUCKET_NAMES.main}
AWS_S3_ANALYSIS_BUCKET=${BUCKET_NAMES.analysis}
AWS_S3_TEMP_BUCKET=${BUCKET_NAMES.temp}
AWS_S3_REGION=${process.env.AWS_S3_REGION || 'us-east-1'}
AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY}

# File Storage Configuration
FILE_STORAGE_TYPE=s3
UPLOAD_DIR=s3://${BUCKET_NAMES.main}
MAX_FILE_SIZE=52428800

# Server Configuration
PORT=5050
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=${process.env.MONGODB_URI || 'mongodb://localhost:27017/metrrik'}

# AI Services
GEMINI_API_KEY=${process.env.GEMINI_API_KEY || 'your_gemini_api_key_here'}

# Authentication
JWT_SECRET=${process.env.JWT_SECRET || 'your_jwt_secret_here'}
CLERK_SECRET_KEY=${process.env.CLERK_SECRET_KEY || 'your_clerk_secret_key_here'}

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000
`;

  const envPath = path.join(__dirname, '..', '.env');
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Generated .env file at: ${envPath}`);
}

async function setupAWSInfrastructure() {
  console.log('🚀 Setting up AWS S3 infrastructure for Metrrik...\n');

  // Check AWS credentials
  if (!(await checkAWSCredentials())) {
    process.exit(1);
  }

  const region = process.env.AWS_S3_REGION || 'us-east-1';
  console.log(`📍 Region: ${region}\n`);

  // Create buckets
  console.log('📦 Creating S3 buckets...');
  const buckets = [
    { name: BUCKET_NAMES.main, description: 'Main file uploads' },
    { name: BUCKET_NAMES.analysis, description: 'Analysis results' },
    { name: BUCKET_NAMES.temp, description: 'Temporary files' }
  ];

  for (const bucket of buckets) {
    console.log(`\n🔧 Setting up ${bucket.description} bucket...`);
    if (await createBucketIfNotExists(bucket.name, region)) {
      await configureBucketCors(bucket.name);
      await configureBucketPolicy(bucket.name);
    }
  }

  // Generate environment file
  console.log('\n📝 Generating environment configuration...');
  await generateEnvFile();

  console.log('\n🎉 AWS S3 setup completed successfully!');
  console.log('\n📋 Bucket Information:');
  console.log(`   Main Uploads: ${BUCKET_NAMES.main}`);
  console.log(`   Analysis Results: ${BUCKET_NAMES.analysis}`);
  console.log(`   Temporary Files: ${BUCKET_NAMES.temp}`);
  console.log(`   Region: ${region}`);

  console.log('\n🔧 Next Steps:');
  console.log('   1. Review the generated .env file');
  console.log('   2. Restart your backend server');
  console.log('   3. Test file uploads through the application');

  console.log('\n🌐 Bucket URLs:');
  console.log(`   Main: https://${BUCKET_NAMES.main}.s3.${region}.amazonaws.com/`);
  console.log(`   Analysis: https://${BUCKET_NAMES.analysis}.s3.${region}.amazonaws.com/`);
  console.log(`   Temp: https://${BUCKET_NAMES.temp}.s3.${region}.amazonaws.com/`);
}

// Run the setup
setupAWSInfrastructure().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
