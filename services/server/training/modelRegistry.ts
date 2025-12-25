/**
 * Model Registry
 * Manages trained model versions and deployment
 */

import { getDatabase } from '../../../backend/src/config/database';

export interface ModelVersion {
  modelId: string;
  version: string;
  baseModel: string;
  trainingData: string; // Path or reference to training data
  metrics: {
    accuracy: number;
    latency: number;
    cost: number;
    trainLoss: number;
    valLoss: number;
  };
  status: 'training' | 'ready' | 'deployed' | 'archived';
  createdAt: Date;
  deployedAt?: Date;
  modelPath: string; // Path to model files
  metadata?: Record<string, any>;
}

export class ModelRegistry {
  private static instance: ModelRegistry;

  private constructor() {}

  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  /**
   * Register a new model version
   */
  public async registerModel(model: Omit<ModelVersion, 'createdAt'>): Promise<void> {
    const db = getDatabase();
    
    const modelDoc: ModelVersion = {
      ...model,
      createdAt: new Date()
    };

    await db.collection('model_registry').insertOne(modelDoc);
  }

  /**
   * Get model by ID and version
   */
  public async getModel(modelId: string, version?: string): Promise<ModelVersion | null> {
    const db = getDatabase();
    
    const query: any = { modelId };
    
    if (version) {
      query.version = version;
    } else {
      // Get latest version
      query.status = { $in: ['ready', 'deployed'] };
    }

    const model = await db.collection('model_registry')
      .findOne(query, { sort: { createdAt: -1 } });

    return model as ModelVersion | null;
  }

  /**
   * List all models
   */
  public async listModels(
    status?: ModelVersion['status']
  ): Promise<ModelVersion[]> {
    const db = getDatabase();
    
    const query: any = {};
    if (status) {
      query.status = status;
    }

    const models = await db.collection('model_registry')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return models as ModelVersion[];
  }

  /**
   * Deploy a model version
   */
  public async deployModel(modelId: string, version: string): Promise<void> {
    const db = getDatabase();
    
    // Archive currently deployed version
    await db.collection('model_registry').updateMany(
      { modelId, status: 'deployed' },
      { $set: { status: 'archived' } }
    );

    // Deploy new version
    await db.collection('model_registry').updateOne(
      { modelId, version },
      {
        $set: {
          status: 'deployed',
          deployedAt: new Date()
        }
      }
    );
  }

  /**
   * Get currently deployed model
   */
  public async getDeployedModel(modelId: string): Promise<ModelVersion | null> {
    const db = getDatabase();
    
    const model = await db.collection('model_registry')
      .findOne({
        modelId,
        status: 'deployed'
      }, { sort: { deployedAt: -1 } });

    return model as ModelVersion | null;
  }

  /**
   * Update model metrics
   */
  public async updateMetrics(
    modelId: string,
    version: string,
    metrics: Partial<ModelVersion['metrics']>
  ): Promise<void> {
    const db = getDatabase();
    
    await db.collection('model_registry').updateOne(
      { modelId, version },
      { $set: { metrics } }
    );
  }

  /**
   * Archive a model version
   */
  public async archiveModel(modelId: string, version: string): Promise<void> {
    const db = getDatabase();
    
    await db.collection('model_registry').updateOne(
      { modelId, version },
      { $set: { status: 'archived' } }
    );
  }

  /**
   * Compare model versions
   */
  public async compareModels(
    modelId: string,
    version1: string,
    version2: string
  ): Promise<{
    version1: ModelVersion;
    version2: ModelVersion;
    comparison: {
      accuracy: { diff: number; better: string };
      latency: { diff: number; better: string };
      cost: { diff: number; better: string };
    };
  }> {
    const model1 = await this.getModel(modelId, version1);
    const model2 = await this.getModel(modelId, version2);

    if (!model1 || !model2) {
      throw new Error('One or both models not found');
    }

    const comparison = {
      accuracy: {
        diff: model2.metrics.accuracy - model1.metrics.accuracy,
        better: model2.metrics.accuracy > model1.metrics.accuracy ? version2 : version1
      },
      latency: {
        diff: model2.metrics.latency - model1.metrics.latency,
        better: model2.metrics.latency < model1.metrics.latency ? version2 : version1
      },
      cost: {
        diff: model2.metrics.cost - model1.metrics.cost,
        better: model2.metrics.cost < model1.metrics.cost ? version2 : version1
      }
    };

    return {
      version1: model1,
      version2: model2,
      comparison
    };
  }
}

// Export singleton instance
export const modelRegistry = ModelRegistry.getInstance();

