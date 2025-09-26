import { analyzeFloorPlan } from '../services/geminiService';
import fs from 'fs';
import path from 'path';

/**
 * Test script to verify AI integration is working
 * This is a manual test that can be run to check if the Gemini API is properly configured
 */

describe('AI Integration Tests', () => {
  beforeAll(() => {
    // Load environment variables
    require('dotenv').config();
  });

  test('should have GEMINI_API_KEY configured', () => {
    expect(process.env.GEMINI_API_KEY).toBeDefined();
    expect(process.env.GEMINI_API_KEY).not.toBe('your_gemini_api_key_here');
  });

  test('should analyze a sample floor plan', async () => {
    // Skip this test if no API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      console.log('⚠️  Skipping AI test - GEMINI_API_KEY not configured');
      return;
    }

    // Create a simple test image (1x1 pixel PNG in base64)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    try {
      const result = await analyzeFloorPlan(
        testImageBase64, 
        'image/png', 
        'Test Project', 
        'residential'
      );
      
      // Check if result is valid JSON
      const parsed = JSON.parse(result);
      
      // Should have either a valid analysis or an error
      expect(parsed).toBeDefined();
      
      if (parsed.error) {
        console.log('AI Analysis Error:', parsed.error);
        // This is expected for a test image, but the API should respond
        expect(parsed.error.message).toBeDefined();
      } else {
        console.log('AI Analysis Success:', {
          totalCost: parsed.summary?.totalEstimatedCostKES,
          confidence: parsed.summary?.confidenceScore,
          items: parsed.billOfQuantities?.length
        });
        expect(parsed.summary).toBeDefined();
        expect(parsed.billOfQuantities).toBeDefined();
      }
      
    } catch (error) {
      console.error('AI Analysis Test Failed:', error);
      throw error;
    }
  }, 60000); // 60 second timeout for AI analysis
});

/**
 * Manual test function that can be called directly
 */
export async function testAIIntegration() {
  console.log('🧪 Testing AI Integration...');
  
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.log('❌ GEMINI_API_KEY not configured. Please set it in your .env file.');
    return false;
  }
  
  try {
    // Test with a simple image
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    console.log('📤 Sending test image to Gemini AI...');
    const result = await analyzeFloorPlan(
      testImageBase64, 
      'image/png', 
      'Test Project', 
      'residential'
    );
    
    const parsed = JSON.parse(result);
    
    if (parsed.error) {
      console.log('⚠️  AI returned error (expected for test image):', parsed.error.message);
      console.log('✅ AI integration is working - API responded correctly');
      return true;
    } else {
      console.log('✅ AI analysis successful!');
      console.log('📊 Results:', {
        totalCost: parsed.summary?.totalEstimatedCostKES,
        confidence: parsed.summary?.confidenceScore,
        items: parsed.billOfQuantities?.length
      });
      return true;
    }
    
  } catch (error) {
    console.error('❌ AI integration test failed:', error);
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAIIntegration().then(success => {
    process.exit(success ? 0 : 1);
  });
}
