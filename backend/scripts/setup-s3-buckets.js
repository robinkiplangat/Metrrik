#!/usr/bin/env node

const { S3Client, CreateBucketCommand, PutBucketCorsCommand, PutBucketPolicyCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { fromEnv } = require('@aws-sdk/credential-provider-env');
require('dotenv').config();

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'us-east-1',
  credentials: fromEnv()
});

// Bucket configuration
const BUCKET_CONFIG = {
  // Main bucket for file uploads
  main: {
    name: process.env.AWS_S3_BUCKET || 'q-sci-uploads',
    cors: {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
          AllowedOrigins: [
            'http://localhost:3000',
            'http://localhost:5173',
            process.env.FRONTEND_URL || 'http://localhost:3000'
          ],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3000
        }
      ]
    },
    policy: {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${process.env.AWS_S3_BUCKET || 'q-sci-uploads'}/*`
        }
      ]
    }
  },
  // Analysis results bucket
  analysis: {
    name: process.env.AWS_S3_ANALYSIS_BUCKET || 'q-sci-analysis-results',
    cors: {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
          AllowedOrigins: [
            'http://localhost:3000',
            'http://localhost:5173',
            process.env.FRONTEND_URL || 'http://localhost:3000'
          ],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3000
        }
      ]
    }
  }
};

async function checkBucketExists(bucketName) {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

async function createBucket(bucketName, region) {
  try {
    const createBucketParams = {
      Bucket: bucketName,
      CreateBucketConfiguration: {
        LocationConstraint: region === 'us-east-1' ? undefined : region
      }
    };

    await s3Client.send(new CreateBucketCommand(createBucketParams));
    console.log(`✅ Created bucket: ${bucketName}`);
    return true;
  } catch (error) {
    if (error.name === 'BucketAlreadyExists') {
      console.log(`ℹ️  Bucket already exists: ${bucketName}`);
      return true;
    }
    console.error(`❌ Failed to create bucket ${bucketName}:`, error.message);
    return false;
  }
}

async function configureBucketCors(bucketName, corsConfig) {
  try {
    await s3Client.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfig
    }));
    console.log(`✅ Configured CORS for bucket: ${bucketName}`);
  } catch (error) {
    console.error(`❌ Failed to configure CORS for ${bucketName}:`, error.message);
  }
}

async function configureBucketPolicy(bucketName, policy) {
  try {
    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(policy)
    }));
    console.log(`✅ Configured policy for bucket: ${bucketName}`);
  } catch (error) {
    console.error(`❌ Failed to configure policy for ${bucketName}:`, error.message);
  }
}

async function setupBuckets() {
  console.log('🚀 Setting up AWS S3 buckets for Q-Sci...\n');

  const region = process.env.AWS_S3_REGION || 'us-east-1';
  console.log(`📍 Region: ${region}\n`);

  // Check AWS credentials
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('❌ AWS credentials not found. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
    process.exit(1);
  }

  // Setup main bucket
  console.log('📦 Setting up main uploads bucket...');
  const mainBucketName = BUCKET_CONFIG.main.name;
  
  if (!(await checkBucketExists(mainBucketName))) {
    await createBucket(mainBucketName, region);
  }
  
  await configureBucketCors(mainBucketName, BUCKET_CONFIG.main.cors);
  await configureBucketPolicy(mainBucketName, BUCKET_CONFIG.main.policy);

  // Setup analysis results bucket
  console.log('\n📊 Setting up analysis results bucket...');
  const analysisBucketName = BUCKET_CONFIG.analysis.name;
  
  if (!(await checkBucketExists(analysisBucketName))) {
    await createBucket(analysisBucketName, region);
  }
  
  await configureBucketCors(analysisBucketName, BUCKET_CONFIG.analysis.cors);

  console.log('\n🎉 S3 bucket setup completed successfully!');
  console.log('\n📋 Bucket Information:');
  console.log(`   Main Uploads: ${mainBucketName}`);
  console.log(`   Analysis Results: ${analysisBucketName}`);
  console.log(`   Region: ${region}`);
  
  console.log('\n🔧 Next Steps:');
  console.log('   1. Update your .env file with the bucket names');
  console.log('   2. Set FILE_STORAGE_TYPE=s3 in your backend .env');
  console.log('   3. Restart your backend server');
}

// Run the setup
setupBuckets().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
