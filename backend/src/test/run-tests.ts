#!/usr/bin/env ts-node

/**
 * Test Runner for Metrrik Backend API
 * 
 * This script provides a comprehensive test runner with the following features:
 * - Individual test execution
 * - Test coverage reporting
 * - Performance benchmarking
 * - API documentation validation
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

interface TestOptions {
  watch?: boolean;
  coverage?: boolean;
  verbose?: boolean;
  testName?: string;
  benchmark?: boolean;
  docs?: boolean;
}

class TestRunner {
  private projectRoot: string;
  private testDir: string;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.testDir = path.join(this.projectRoot, 'src/test');
  }

  /**
   * Run all tests with specified options
   */
  async runTests(options: TestOptions = {}): Promise<void> {
    console.log('🚀 Starting Metrrik Backend Test Suite...\n');

    try {
      // Run specific test if specified
      if (options.testName) {
        await this.runSpecificTest(options.testName, options);
        return;
      }

      // Run documentation tests if requested
      if (options.docs) {
        await this.validateApiDocumentation();
      }

      // Run performance benchmarks if requested
      if (options.benchmark) {
        await this.runBenchmarks();
      }

      // Run main test suite
      await this.runMainTests(options);

      console.log('\n✅ All tests completed successfully!');
    } catch (error) {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  /**
   * Run main test suite
   */
  private async runMainTests(options: TestOptions): Promise<void> {
    const jestArgs = ['jest'];

    if (options.watch) {
      jestArgs.push('--watch');
    }

    if (options.coverage) {
      jestArgs.push('--coverage');
    }

    if (options.verbose) {
      jestArgs.push('--verbose');
    }

    // Add test timeout for integration tests
    jestArgs.push('--testTimeout=30000');

    console.log('📋 Running main test suite...');
    console.log(`Command: ${jestArgs.join(' ')}\n`);

    execSync(jestArgs.join(' '), {
      stdio: 'inherit',
      cwd: this.projectRoot,
    });
  }

  /**
   * Run a specific test file
   */
  private async runSpecificTest(testName: string, options: TestOptions): Promise<void> {
    const testFile = path.join(this.testDir, `${testName}.test.ts`);

    if (!fs.existsSync(testFile)) {
      throw new Error(`Test file not found: ${testFile}`);
    }

    const jestArgs = ['jest', testFile];

    if (options.verbose) {
      jestArgs.push('--verbose');
    }

    console.log(`🎯 Running specific test: ${testName}`);
    console.log(`Command: ${jestArgs.join(' ')}\n`);

    execSync(jestArgs.join(' '), {
      stdio: 'inherit',
      cwd: this.projectRoot,
    });
  }

  /**
   * Validate API documentation
   */
  private async validateApiDocumentation(): Promise<void> {
    console.log('📚 Validating API documentation...\n');

    try {
      // Check if Swagger UI is accessible
      const { default: fetch } = await import('node-fetch');

      const response = await fetch('http://localhost:5050/api-docs');
      if (response.ok) {
        console.log('✅ Swagger UI is accessible');
      } else {
        console.log('⚠️  Swagger UI is not accessible (server may not be running)');
      }

      // Check if OpenAPI JSON is valid
      const openApiResponse = await fetch('http://localhost:5050/api-docs.json');
      if (openApiResponse.ok) {
        const openApiSpec = await openApiResponse.json() as any;

        // Basic validation
        if (openApiSpec.openapi && openApiSpec.info && openApiSpec.paths) {
          console.log('✅ OpenAPI specification is valid');
          console.log(`📊 Found ${Object.keys(openApiSpec.paths).length} API endpoints`);
        } else {
          console.log('❌ OpenAPI specification is invalid');
        }
      } else {
        console.log('⚠️  OpenAPI JSON is not accessible');
      }
    } catch (error) {
      console.log('⚠️  Could not validate API documentation (server may not be running)');
    }
  }

  /**
   * Run performance benchmarks
   */
  private async runBenchmarks(): Promise<void> {
    console.log('⚡ Running performance benchmarks...\n');

    const benchmarkTests = [
      'health.test.ts',
      'analysis.test.ts'
    ];

    for (const testFile of benchmarkTests) {
      const testPath = path.join(this.testDir, testFile);
      if (fs.existsSync(testPath)) {
        console.log(`🏃 Running benchmark for ${testFile}...`);

        const startTime = Date.now();

        try {
          execSync(`jest ${testPath} --verbose`, {
            stdio: 'pipe',
            cwd: this.projectRoot,
          });

          const endTime = Date.now();
          const duration = endTime - startTime;

          console.log(`✅ ${testFile} completed in ${duration}ms`);
        } catch (error) {
          console.log(`❌ ${testFile} failed during benchmark`);
        }
      }
    }
  }

  /**
   * Generate test report
   */
  private generateTestReport(): void {
    console.log('\n📊 Test Report Summary:');
    console.log('========================');

    // This would typically read from Jest's coverage reports
    console.log('• Total Tests: Run `npm test` to see detailed results');
    console.log('• Coverage: Run `npm test -- --coverage` for coverage report');
    console.log('• Performance: Run `npm run test:benchmark` for benchmarks');
    console.log('• Documentation: Run `npm run test:docs` for API validation');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: TestOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--watch':
        options.watch = true;
        break;
      case '--coverage':
        options.coverage = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--benchmark':
        options.benchmark = true;
        break;
      case '--docs':
        options.docs = true;
        break;
      case '--test':
        options.testName = args[++i];
        break;
      case '--help':
        console.log(`
Metrrik Backend Test Runner

Usage: npm run test:runner [options]

Options:
  --watch       Run tests in watch mode
  --coverage    Generate coverage report
  --verbose     Verbose output
  --benchmark   Run performance benchmarks
  --docs        Validate API documentation
  --test <name> Run specific test file
  --help        Show this help message

Examples:
  npm run test:runner                    # Run all tests
  npm run test:runner --coverage         # Run with coverage
  npm run test:runner --test analysis    # Run analysis tests only
  npm run test:runner --benchmark        # Run benchmarks
  npm run test:runner --docs             # Validate API docs
        `);
        process.exit(0);
    }
  }

  const runner = new TestRunner();
  await runner.runTests(options);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { TestRunner };
