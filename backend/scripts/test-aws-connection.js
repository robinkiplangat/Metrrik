#!/usr/bin/env node

const { S3Client, ListBucketsCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { fromEnv } = require('@aws-sdk/credential-provider-env');
require('dotenv').config();

async function testAWSConnection() {
  console.log('🧪 Testing AWS S3 connection...\n');

  // Initialize S3 client
  const s3Client = new S3Client({
    region: process.env.AWS_S3_REGION || 'us-east-1',
    credentials: fromEnv()
  });

  try {
    // Test 1: Check credentials
    console.log('1️⃣ Testing AWS credentials...');
    const buckets = await s3Client.send(new ListBucketsCommand({}));
    console.log(`✅ Credentials valid - Found ${buckets.Buckets.length} buckets`);

    // Test 2: Check if our buckets exist
    const bucketNames = [
      process.env.AWS_S3_BUCKET || 'q-sci-uploads',
      process.env.AWS_S3_ANALYSIS_BUCKET || 'q-sci-analysis-results',
      process.env.AWS_S3_TEMP_BUCKET || 'q-sci-temp-files'
    ];

    console.log('\n2️⃣ Checking bucket existence...');
    for (const bucketName of bucketNames) {
      try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
        console.log(`✅ Bucket exists: ${bucketName}`);
      } catch (error) {
        if (error.name === 'NotFound') {
          console.log(`❌ Bucket not found: ${bucketName}`);
        } else {
          console.log(`⚠️  Error checking bucket ${bucketName}: ${error.message}`);
        }
      }
    }

    // Test 3: List all buckets
    console.log('\n3️⃣ Available buckets:');
    buckets.Buckets.forEach(bucket => {
      console.log(`   📦 ${bucket.Name} (created: ${bucket.CreationDate.toISOString().split('T')[0]})`);
    });

    console.log('\n🎉 AWS S3 connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ AWS connection test failed:', error.message);
    
    if (error.name === 'CredentialsProviderError') {
      console.log('\n🔧 Please set the following environment variables:');
      console.log('   AWS_ACCESS_KEY_ID=your_access_key');
      console.log('   AWS_SECRET_ACCESS_KEY=your_secret_key');
      console.log('   AWS_S3_REGION=your_region (optional)');
    }
    
    process.exit(1);
  }
}

testAWSConnection();
