/**
 * LLM System Initialization
 * Initializes LLM providers and services on server startup
 */

import { LLMProviderManager } from '../../../services/server/llm/llmProviderManager';
import { llmService } from '../../../services/server/llm/llmService';
import { logger } from '../utils/logger';

/**
 * Initialize LLM system
 */
export async function initializeLLMSystem(): Promise<void> {
  try {
    logger.info('Initializing LLM system...');

    // Initialize provider manager
    const providerManager = LLMProviderManager.getInstance();
    providerManager.initializeFromEnv();

    // Check which providers are available
    const registeredProviders = providerManager.getRegisteredProviders();
    logger.info(`Registered LLM providers: ${registeredProviders.join(', ')}`);

    // Health check all providers
    const healthStatus = await providerManager.healthCheck();
    const availableProviders = Object.entries(healthStatus)
      .filter(([_, available]) => available)
      .map(([provider]) => provider);

    logger.info(`Available LLM providers: ${availableProviders.join(', ')}`);

    if (availableProviders.length === 0) {
      logger.warn('No LLM providers are available. Please check your API keys and configuration.');
    }

    // Ensure cache and cost tracker are set up
    // (They're already initialized in llmService constructor, but we can verify)
    logger.info('LLM system initialized successfully');
  } catch (error: any) {
    logger.error('Error initializing LLM system:', error);
    throw error;
  }
}

