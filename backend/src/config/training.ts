/**
 * Training Configuration
 * Configuration for fine-tuning LLM models
 */

export interface TrainingConfig {
  baseModel: string;
  outputDir: string;
  numEpochs: number;
  batchSize: number;
  learningRate: number;
  useLoRA: boolean;
  loraRank?: number;
  loraAlpha?: number;
  useQLoRA?: boolean;
  maxSeqLength: number;
  gradientAccumulationSteps: number;
  warmupSteps: number;
  saveSteps: number;
  evalSteps: number;
  loggingSteps: number;
}

export const defaultTrainingConfig: TrainingConfig = {
  baseModel: process.env.TRAINING_BASE_MODEL || 'meta-llama/Llama-3-8b-Instruct',
  outputDir: process.env.MODEL_STORAGE_PATH || './models/finetuned',
  numEpochs: parseInt(process.env.TRAINING_NUM_EPOCHS || '3'),
  batchSize: parseInt(process.env.TRAINING_BATCH_SIZE || '4'),
  learningRate: parseFloat(process.env.TRAINING_LEARNING_RATE || '2e-4'),
  useLoRA: process.env.TRAINING_USE_LORA !== 'false',
  loraRank: parseInt(process.env.TRAINING_LORA_RANK || '16'),
  loraAlpha: parseInt(process.env.TRAINING_LORA_ALPHA || '32'),
  useQLoRA: process.env.TRAINING_USE_QLORA === 'true',
  maxSeqLength: parseInt(process.env.TRAINING_MAX_SEQ_LENGTH || '2048'),
  gradientAccumulationSteps: parseInt(process.env.TRAINING_GRADIENT_ACCUMULATION || '4'),
  warmupSteps: parseInt(process.env.TRAINING_WARMUP_STEPS || '100'),
  saveSteps: parseInt(process.env.TRAINING_SAVE_STEPS || '500'),
  evalSteps: parseInt(process.env.TRAINING_EVAL_STEPS || '500'),
  loggingSteps: parseInt(process.env.TRAINING_LOGGING_STEPS || '100')
};

/**
 * Get training configuration from environment
 */
export function getTrainingConfig(): TrainingConfig {
  return { ...defaultTrainingConfig };
}

/**
 * Validate training configuration
 */
export function validateTrainingConfig(config: TrainingConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.baseModel) {
    errors.push('Base model is required');
  }

  if (config.numEpochs < 1 || config.numEpochs > 100) {
    errors.push('Number of epochs must be between 1 and 100');
  }

  if (config.batchSize < 1) {
    errors.push('Batch size must be at least 1');
  }

  if (config.learningRate <= 0) {
    errors.push('Learning rate must be positive');
  }

  if (config.useLoRA && (!config.loraRank || !config.loraAlpha)) {
    errors.push('LoRA rank and alpha are required when using LoRA');
  }

  if (config.maxSeqLength < 128 || config.maxSeqLength > 8192) {
    errors.push('Max sequence length must be between 128 and 8192');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

