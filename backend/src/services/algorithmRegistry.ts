import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import {
  AlgorithmDefinition,
  AlgorithmCategory,
  AlgorithmPriority,
  AlgorithmMetrics
} from './algorithmOrchestrator';

// Algorithm version information
export interface AlgorithmVersion {
  id: string;
  algorithmId: string;
  version: string;
  description: string;
  releaseNotes: string;
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
  isDefault: boolean;
  performanceBaseline: AlgorithmMetrics;
  dependencies: AlgorithmDependency[];
  configuration: Record<string, any>;
  tags: string[];
  metadata: Record<string, any>;
}

// Algorithm dependency
export interface AlgorithmDependency {
  algorithmId: string;
  version: string;
  required: boolean;
  description: string;
}

// Algorithm deployment status
export interface AlgorithmDeployment {
  id: string;
  algorithmId: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  status: 'pending' | 'deploying' | 'active' | 'failed' | 'rolled_back';
  deployedAt: Date;
  deployedBy: string;
  rollbackVersion?: string;
  healthChecks: HealthCheck[];
  metrics: DeploymentMetrics;
}

// Health check result
export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  timestamp: Date;
  responseTime: number;
}

// Deployment metrics
export interface DeploymentMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
  lastUpdated: Date;
}

// Algorithm configuration schema
export interface AlgorithmConfigSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description: string;
    default?: any;
    required?: boolean;
    validation?: any;
  }>;
  required: string[];
}

// World-class Algorithm Registry
export class AlgorithmRegistry {
  private algorithms: Map<string, AlgorithmDefinition> = new Map();
  private versions: Map<string, AlgorithmVersion[]> = new Map();
  private deployments: Map<string, AlgorithmDeployment[]> = new Map();
  private configurations: Map<string, AlgorithmConfigSchema> = new Map();
  private performanceBaselines: Map<string, AlgorithmMetrics> = new Map();

  // Register a new algorithm with versioning
  async registerAlgorithm(
    definition: AlgorithmDefinition,
    version: AlgorithmVersion,
    configSchema?: AlgorithmConfigSchema
  ): Promise<void> {
    try {
      // Validate algorithm definition
      await this.validateAlgorithmDefinition(definition);
      await this.validateAlgorithmVersion(version);

      // Store algorithm definition
      this.algorithms.set(definition.id, definition);

      // Store version information
      const versions = this.versions.get(definition.id) || [];
      versions.push(version);
      this.versions.set(definition.id, versions);

      // Store configuration schema if provided
      if (configSchema) {
        this.configurations.set(definition.id, configSchema);
      }

      // Initialize performance baseline
      this.performanceBaselines.set(definition.id, version.performanceBaseline);

      // Create initial deployment record
      const deployment: AlgorithmDeployment = {
        id: uuidv4(),
        algorithmId: definition.id,
        version: version.version,
        environment: 'development',
        status: 'pending',
        deployedAt: new Date(),
        deployedBy: version.createdBy,
        healthChecks: [],
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          errorRate: 0,
          throughput: 0,
          lastUpdated: new Date(),
        },
      };

      const deployments = this.deployments.get(definition.id) || [];
      deployments.push(deployment);
      this.deployments.set(definition.id, deployments);

      logger.info('Algorithm registered with versioning', {
        algorithmId: definition.id,
        version: version.version,
        category: definition.category,
        createdBy: version.createdBy,
      });

    } catch (error: any) {
      logger.error('Failed to register algorithm', {
        algorithmId: definition.id,
        version: version.version,
        error: error.message,
      });
      throw error;
    }
  }

  // Get algorithm by ID and version
  getAlgorithm(algorithmId: string, version?: string): AlgorithmDefinition | null {
    const algorithm = this.algorithms.get(algorithmId);
    if (!algorithm) return null;

    if (version) {
      const versions = this.versions.get(algorithmId);
      const specificVersion = versions?.find(v => v.version === version);
      if (!specificVersion || !specificVersion.isActive) {
        return null;
      }
    }

    return algorithm;
  }

  // Get all versions of an algorithm
  getAlgorithmVersions(algorithmId: string): AlgorithmVersion[] {
    return this.versions.get(algorithmId) || [];
  }

  // Get active version of an algorithm
  getActiveVersion(algorithmId: string): AlgorithmVersion | null {
    const versions = this.versions.get(algorithmId);
    if (!versions) return null;

    return versions.find(v => v.isActive && v.isDefault) ||
      versions.find(v => v.isActive) ||
      null;
  }

  // Deploy algorithm to environment
  async deployAlgorithm(
    algorithmId: string,
    version: string,
    environment: 'development' | 'staging' | 'production',
    deployedBy: string
  ): Promise<AlgorithmDeployment> {
    try {
      const algorithmVersion = this.getAlgorithmVersion(algorithmId, version);
      if (!algorithmVersion) {
        throw new Error(`Algorithm version ${algorithmId}:${version} not found`);
      }

      // Check if already deployed in this environment
      const existingDeployment = this.getDeployment(algorithmId, environment);
      if (existingDeployment && existingDeployment.status === 'active') {
        throw new Error(`Algorithm ${algorithmId} is already deployed in ${environment}`);
      }

      // Create deployment record
      const deployment: AlgorithmDeployment = {
        id: uuidv4(),
        algorithmId,
        version,
        environment,
        status: 'deploying',
        deployedAt: new Date(),
        deployedBy,
        healthChecks: [],
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          errorRate: 0,
          throughput: 0,
          lastUpdated: new Date(),
        },
      };

      // Add to deployments
      const deployments = this.deployments.get(algorithmId) || [];
      deployments.push(deployment);
      this.deployments.set(algorithmId, deployments);

      // Simulate deployment process
      await this.simulateDeployment(deployment);

      // Update deployment status
      deployment.status = 'active';

      logger.info('Algorithm deployed successfully', {
        algorithmId,
        version,
        environment,
        deployedBy,
        deploymentId: deployment.id,
      });

      return deployment;

    } catch (error: any) {
      logger.error('Algorithm deployment failed', {
        algorithmId,
        version,
        environment,
        error: error.message,
      });
      throw error;
    }
  }

  // Rollback algorithm deployment
  async rollbackDeployment(
    algorithmId: string,
    environment: 'development' | 'staging' | 'production',
    rollbackVersion: string,
    rolledBackBy: string
  ): Promise<AlgorithmDeployment> {
    try {
      const currentDeployment = this.getDeployment(algorithmId, environment);
      if (!currentDeployment) {
        throw new Error(`No active deployment found for ${algorithmId} in ${environment}`);
      }

      // Create rollback deployment
      const rollbackDeployment: AlgorithmDeployment = {
        id: uuidv4(),
        algorithmId,
        version: rollbackVersion,
        environment,
        status: 'deploying',
        deployedAt: new Date(),
        deployedBy: rolledBackBy,
        rollbackVersion: currentDeployment.version,
        healthChecks: [],
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          errorRate: 0,
          throughput: 0,
          lastUpdated: new Date(),
        },
      };

      // Mark current deployment as rolled back
      currentDeployment.status = 'rolled_back';

      // Add rollback deployment
      const deployments = this.deployments.get(algorithmId) || [];
      deployments.push(rollbackDeployment);
      this.deployments.set(algorithmId, deployments);

      // Simulate rollback process
      await this.simulateDeployment(rollbackDeployment);

      // Update deployment status
      rollbackDeployment.status = 'active';

      logger.info('Algorithm rolled back successfully', {
        algorithmId,
        fromVersion: currentDeployment.version,
        toVersion: rollbackVersion,
        environment,
        rolledBackBy,
      });

      return rollbackDeployment;

    } catch (error: any) {
      logger.error('Algorithm rollback failed', {
        algorithmId,
        environment,
        rollbackVersion,
        error: error.message,
      });
      throw error;
    }
  }

  // Get deployment status
  getDeployment(algorithmId: string, environment: string): AlgorithmDeployment | null {
    const deployments = this.deployments.get(algorithmId);
    if (!deployments) return null;

    return deployments.find(d =>
      d.environment === environment &&
      (d.status === 'active' || d.status === 'deploying')
    ) || null;
  }

  // Get all deployments for an algorithm
  getDeployments(algorithmId: string): AlgorithmDeployment[] {
    return this.deployments.get(algorithmId) || [];
  }

  // Update deployment metrics
  updateDeploymentMetrics(
    algorithmId: string,
    environment: string,
    metrics: Partial<DeploymentMetrics>
  ): void {
    const deployment = this.getDeployment(algorithmId, environment);
    if (!deployment) return;

    Object.assign(deployment.metrics, metrics);
    deployment.metrics.lastUpdated = new Date();
  }

  // Add health check result
  addHealthCheck(
    algorithmId: string,
    environment: string,
    healthCheck: HealthCheck
  ): void {
    const deployment = this.getDeployment(algorithmId, environment);
    if (!deployment) return;

    deployment.healthChecks.push(healthCheck);

    // Keep only last 100 health checks
    if (deployment.healthChecks.length > 100) {
      deployment.healthChecks = deployment.healthChecks.slice(-100);
    }
  }

  // Get algorithm configuration schema
  getConfigurationSchema(algorithmId: string): AlgorithmConfigSchema | null {
    return this.configurations.get(algorithmId) || null;
  }

  // Validate algorithm configuration
  validateConfiguration(algorithmId: string, config: any): boolean {
    const schema = this.getConfigurationSchema(algorithmId);
    if (!schema) return true; // No schema means no validation required

    // Basic validation (in production, use a proper JSON schema validator)
    for (const requiredField of schema.required) {
      if (!(requiredField in config)) {
        return false;
      }
    }

    return true;
  }

  // Get performance baseline
  getPerformanceBaseline(algorithmId: string): AlgorithmMetrics | null {
    return this.performanceBaselines.get(algorithmId) || null;
  }

  // Update performance baseline
  updatePerformanceBaseline(algorithmId: string, metrics: AlgorithmMetrics): void {
    this.performanceBaselines.set(algorithmId, metrics);
  }

  // Get algorithm by category
  getAlgorithmsByCategory(category: AlgorithmCategory): AlgorithmDefinition[] {
    return Array.from(this.algorithms.values()).filter(
      algorithm => algorithm.category === category
    );
  }

  // Search algorithms
  searchAlgorithms(query: string): AlgorithmDefinition[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.algorithms.values()).filter(algorithm =>
      algorithm.name.toLowerCase().includes(searchTerm) ||
      algorithm.description.toLowerCase().includes(searchTerm) ||
      algorithm.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  // Get algorithm statistics
  getAlgorithmStatistics(): {
    totalAlgorithms: number;
    totalVersions: number;
    totalDeployments: number;
    algorithmsByCategory: Record<string, number>;
    activeDeployments: number;
  } {
    const totalAlgorithms = this.algorithms.size;
    const totalVersions = Array.from(this.versions.values()).reduce(
      (sum, versions) => sum + versions.length, 0
    );
    const totalDeployments = Array.from(this.deployments.values()).reduce(
      (sum, deployments) => sum + deployments.length, 0
    );

    const algorithmsByCategory: Record<string, number> = {};
    Array.from(this.algorithms.values()).forEach(algorithm => {
      algorithmsByCategory[algorithm.category] =
        (algorithmsByCategory[algorithm.category] || 0) + 1;
    });

    const activeDeployments = Array.from(this.deployments.values()).reduce(
      (sum, deployments) => sum + deployments.filter(d => d.status === 'active').length, 0
    );

    return {
      totalAlgorithms,
      totalVersions,
      totalDeployments,
      algorithmsByCategory,
      activeDeployments,
    };
  }

  // Private helper methods
  private getAlgorithmVersion(algorithmId: string, version: string): AlgorithmVersion | null {
    const versions = this.versions.get(algorithmId);
    if (!versions) return null;

    return versions.find(v => v.version === version) || null;
  }

  private async validateAlgorithmDefinition(definition: AlgorithmDefinition): Promise<void> {
    if (!definition.id || !definition.name || !definition.version) {
      throw new Error('Algorithm definition must include id, name, and version');
    }

    if (!Object.values(AlgorithmCategory).includes(definition.category)) {
      throw new Error('Invalid algorithm category');
    }

    if (!Object.values(AlgorithmPriority).includes(definition.priority)) {
      throw new Error('Invalid algorithm priority');
    }
  }

  private async validateAlgorithmVersion(version: AlgorithmVersion): Promise<void> {
    if (!version.algorithmId || !version.version || !version.createdBy) {
      throw new Error('Algorithm version must include algorithmId, version, and createdBy');
    }

    // Check if algorithm exists
    if (!this.algorithms.has(version.algorithmId)) {
      throw new Error(`Algorithm ${version.algorithmId} not found`);
    }

    // Check for version conflicts
    const existingVersions = this.versions.get(version.algorithmId) || [];
    if (existingVersions.some(v => v.version === version.version)) {
      throw new Error(`Version ${version.version} already exists for algorithm ${version.algorithmId}`);
    }
  }

  private async simulateDeployment(deployment: AlgorithmDeployment): Promise<void> {
    // Simulate deployment time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate health checks
    const healthChecks: HealthCheck[] = [
      {
        name: 'Dependency Check',
        status: 'healthy',
        message: 'All dependencies resolved',
        timestamp: new Date(),
        responseTime: 50,
      },
      {
        name: 'Configuration Validation',
        status: 'healthy',
        message: 'Configuration is valid',
        timestamp: new Date(),
        responseTime: 25,
      },
      {
        name: 'Performance Test',
        status: 'healthy',
        message: 'Performance within acceptable limits',
        timestamp: new Date(),
        responseTime: 1000,
      },
    ];

    deployment.healthChecks = healthChecks;
  }
}

// Export singleton instance
export const algorithmRegistry = new AlgorithmRegistry();
