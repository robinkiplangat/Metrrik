import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ObjectId } from 'mongodb';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDatabase } from '../config/database';
import { CustomError, asyncHandler } from '../middleware/errorHandler';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import axios from 'axios';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'analysis');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'analysis-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common construction file types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/dwg',
      'application/x-dwg'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new CustomError('File type not allowed. Please upload PDF, JPG, PNG, or DWG files.', 400));
    }
  }
});

// Interface for analysis result
interface AnalysisResult {
  projectName: string;
  totalArea: string;
  totalCost: string;
  costPerSqm: string;
  breakdown: Array<{
    category: string;
    amount: string;
    percentage: string;
    description?: string;
  }>;
  metadata: {
    analysisDate: Date;
    fileType: string;
    fileName: string;
    confidence: number;
  };
}

// Analyze floor plan and generate BQ
router.post('/analyze', upload.single('floorPlan'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new CustomError('No floor plan file uploaded', 400);
  }

  const { projectName, projectType = 'residential' } = req.body;

  try {
    // Simulate analysis process (in real implementation, this would use AI/ML models)
    const analysisResult = await performFloorPlanAnalysis(req.file, projectName, projectType);

    // Save analysis result to database (optional - for tracking)
    const db = getDatabase();
    const analysisRecord = {
      fileName: req.file.originalname,
      filePath: req.file.path,
      projectName: analysisResult.projectName,
      analysisResult,
      createdAt: new Date(),
      metadata: {
        fileType: req.file.mimetype,
        fileSize: req.file.size
      }
    };

    await db.collection('analysis_results').insertOne(analysisRecord);

    logger.info(`Floor plan analysis completed for: ${req.file.originalname}`);

    res.json({
      success: true,
      data: {
        analysis: analysisResult,
        message: 'Floor plan analysis completed successfully'
      }
    });

  } catch (error) {
    logger.error('Analysis error:', error);
    
    // Clean up uploaded file on error
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    throw new CustomError('Failed to analyze floor plan', 500);
  }
}));

// Get analysis history (for authenticated users)
router.get('/history', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const db = getDatabase();
  
  const analyses = await db.collection('analysis_results')
    .find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  res.json({
    success: true,
    data: { analyses }
  });
}));

// Helper function to perform floor plan analysis
async function performFloorPlanAnalysis(file: Express.Multer.File, projectName: string, projectType: string): Promise<AnalysisResult> {
  // In a real implementation, this would:
  // 1. Use computer vision to analyze the floor plan
  // 2. Extract room dimensions, areas, and features
  // 3. Apply construction cost databases
  // 4. Generate detailed BQ breakdown
  
  // For now, we'll simulate this with realistic data based on file analysis
  const fileSize = file.size;
  const isLargeFile = fileSize > 5 * 1024 * 1024; // 5MB
  
  // Simulate different results based on file characteristics
  const baseArea = isLargeFile ? 200 : 120; // sqm
  const areaVariation = Math.random() * 50; // ±25 sqm variation
  const totalArea = Math.round(baseArea + areaVariation);
  
  // Base cost per sqm (Kenyan construction costs)
  const baseCostPerSqm = projectType === 'commercial' ? 35000 : 28000;
  const costVariation = Math.random() * 5000; // ±2,500 variation
  const costPerSqm = Math.round(baseCostPerSqm + costVariation);
  
  const totalCost = totalArea * costPerSqm;
  
  // Generate realistic breakdown based on Kenyan construction standards
  const breakdown = generateCostBreakdown(totalCost, projectType);
  
  return {
    projectName: projectName || `Analysis - ${new Date().toLocaleDateString()}`,
    totalArea: `${totalArea} sqm`,
    totalCost: `KSh ${totalCost.toLocaleString()}`,
    costPerSqm: `KSh ${costPerSqm.toLocaleString()}/sqm`,
    breakdown,
    metadata: {
      analysisDate: new Date(),
      fileType: file.mimetype,
      fileName: file.originalname,
      confidence: 0.85 + Math.random() * 0.1 // 85-95% confidence
    }
  };
}

// Generate realistic cost breakdown
function generateCostBreakdown(totalCost: number, projectType: string): Array<{
  category: string;
  amount: string;
  percentage: string;
  description?: string;
}> {
  const breakdowns = {
    residential: [
      { category: "Excavation & Earthworks", percentage: 4.2, description: "Site preparation and foundation excavation" },
      { category: "Foundation & Substructure", percentage: 10.0, description: "Concrete foundation, footings, and basement" },
      { category: "Superstructure (Walls)", percentage: 20.0, description: "Masonry walls, structural elements" },
      { category: "Roofing", percentage: 8.0, description: "Roof structure, tiles, and waterproofing" },
      { category: "Flooring", percentage: 6.0, description: "Floor finishes and subfloor preparation" },
      { category: "Electrical Installation", percentage: 4.0, description: "Wiring, fixtures, and electrical systems" },
      { category: "Plumbing & Sanitary", percentage: 3.0, description: "Water supply, drainage, and fixtures" },
      { category: "Finishing (Paint, Tiles)", percentage: 10.0, description: "Interior and exterior finishes" },
      { category: "Windows & Doors", percentage: 8.0, description: "All openings and hardware" },
      { category: "Labor & Supervision", percentage: 30.0, description: "Construction labor and project management" },
      { category: "Contingency (5%)", percentage: 5.0, description: "Unforeseen costs and variations" },
      { category: "Professional Fees", percentage: 6.0, description: "Architect, engineer, and consultant fees" }
    ],
    commercial: [
      { category: "Excavation & Earthworks", percentage: 3.5, description: "Site preparation and foundation excavation" },
      { category: "Foundation & Substructure", percentage: 12.0, description: "Reinforced concrete foundation and basement" },
      { category: "Superstructure (Walls)", percentage: 25.0, description: "Steel/concrete frame and cladding" },
      { category: "Roofing", percentage: 6.0, description: "Commercial roofing system" },
      { category: "Flooring", percentage: 8.0, description: "Commercial grade flooring" },
      { category: "Electrical Installation", percentage: 8.0, description: "Commercial electrical systems" },
      { category: "Plumbing & Sanitary", percentage: 4.0, description: "Commercial plumbing systems" },
      { category: "HVAC Systems", percentage: 10.0, description: "Heating, ventilation, and air conditioning" },
      { category: "Finishing", percentage: 8.0, description: "Interior and exterior finishes" },
      { category: "Windows & Doors", percentage: 6.0, description: "Commercial glazing and doors" },
      { category: "Labor & Supervision", percentage: 25.0, description: "Construction labor and management" },
      { category: "Contingency (5%)", percentage: 5.0, description: "Unforeseen costs and variations" },
      { category: "Professional Fees", percentage: 8.0, description: "Design and engineering fees" }
    ]
  };

  const breakdown = breakdowns[projectType as keyof typeof breakdowns] || breakdowns.residential;
  
  return breakdown.map(item => {
    const amount = Math.round(totalCost * (item.percentage / 100));
    return {
      category: item.category,
      amount: `KSh ${amount.toLocaleString()}`,
      percentage: `${item.percentage}%`,
      description: item.description
    };
  });
}

export default router;
