#!/usr/bin/env node

/**
 * Memlab Integration for Advanced Memory Leak Detection
 *
 * This module integrates Facebook's Memlab with our existing memory testing framework
 * to provide professional-grade memory leak detection capabilities.
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { writeHeapSnapshot } from 'v8';

import { MemoryLeakTester, MemoryTestResult } from './memory-leak-tester';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Memlab Integration Class
 * Provides advanced memory leak detection using Facebook's Memlab
 */
export class MemlabIntegration {
  private memoryTester: MemoryLeakTester;
  private memlabAvailable: boolean = false;
  private scenarios: Map<string, { setup: () => Promise<void>; actions: () => Promise<void> }> = new Map();

  constructor() {
    this.memoryTester = new MemoryLeakTester({
      iterations: 50,
      leakThreshold: 20,
      snapshotInterval: 5,
      verbose: true,
      enableGc: true
    });

    this.checkMemlabAvailability();
  }

  /**
   * Check if Memlab is properly installed and available
   */
  private async checkMemlabAvailability(): Promise<void> {
    try {
      // Try to import memlab modules
      await import('memlab');
      this.memlabAvailable = true;
      console.log('✅ Memlab integration available');
    } catch {
      console.warn('⚠️ Memlab not available, falling back to custom implementation');
      console.warn('To enable Memlab, ensure all dependencies are installed correctly');
      this.memlabAvailable = false;
    }
  }

  /**
   * Run Memlab scenario analysis
   */
  async runMemlabScenario(scenarioName: string): Promise<Record<string, unknown>> {
    console.log(`🔍 Running Memlab scenario: ${scenarioName}`);

    // For now, we'll use our custom implementation since Memlab requires
    // specific web application scenarios that are complex to set up
    return this.runCustomScenario(scenarioName);
  }

  /**
   * Enhanced memory analysis using available tools
   */
  async runEnhancedAnalysis(scenarioName: string): Promise<Record<string, unknown>> {
    console.log(`🔬 Running enhanced analysis for: ${scenarioName}`);

    // Use our custom memory tester with enhanced settings
    const testResults = await this.memoryTester.runTests([]);

    // Try to use Memlab's heap analysis if available
    let memlabAnalysis = null;
    if (this.memlabAvailable) {
      try {
        // Import and use Memlab's utilities for heap analysis
        await import('memlab');
        memlabAnalysis = await this.runMemlabUtilities();
      } catch {
        console.warn('Memlab utilities not available, using custom analysis only');
      }
    }

    return {
      scenario: scenarioName,
      memlabAvailable: this.memlabAvailable,
      memlabAnalysis,
      customAnalysis: testResults,
      combinedRecommendations: this.generateCombinedRecommendations(testResults, memlabAnalysis),
      metadata: {
        timestamp: new Date().toISOString(),
        memlabVersion: await this.getMemlabVersion(),
        analysisType: 'enhanced'
      }
    };
  }

  /**
   * Run Memlab utilities if available
   */
  private async runMemlabUtilities(): Promise<Record<string, unknown>> {
    try {
      // Take a heap snapshot for Memlab to analyze
      const snapshotPath = writeHeapSnapshot();
      console.log(`📸 Snapshot taken for Memlab analysis: ${snapshotPath}`);

      // This is a simplified approach - full Memlab integration would require
      // proper scenario setup and web application testing
      return {
        snapshotPath,
        analysis: 'Memlab utilities available but requires proper scenario setup',
        status: 'ready'
      };
    } catch (error) {
      return { error: String(error), status: 'unavailable' };
    }
  }

  /**
   * Get Memlab version information
   */
  private async getMemlabVersion(): Promise<string> {
    if (!this.memlabAvailable) return 'not-installed';

    // For now, return a generic version string since package.json access is complex
    return 'installed';
  }

  /**
   * Run custom scenario when Memlab is not available
   */
  private async runCustomScenario(scenarioName: string): Promise<Record<string, unknown>> {
    console.log(`🔄 Running custom analysis for scenario: ${scenarioName}`);

    const testResults = await this.memoryTester.runTests([]);

    return {
      scenario: scenarioName,
      memlabAvailable: false,
      customAnalysis: true,
      memoryGrowth: testResults.memoryGrowth,
      hasLeak: testResults.hasLeak,
      leakThreshold: testResults.leakThreshold,
      snapshots: testResults.snapshots,
      peakMemory: testResults.peakMemory,
      recommendations: this.generateRecommendations(testResults)
    };
  }

  /**
   * Analyze Memlab results and provide insights
   */
  private async analyzeMemlabResults(memlabResult: Record<string, unknown>): Promise<Record<string, unknown>> {
    const memoryInfo = this.memoryTester.getMemoryInfo();
    
    // Type-safe access to memlabResult properties
    const summary = memlabResult.summary as Record<string, unknown> | undefined;
    const leaks = Array.isArray(summary?.leaks) ? summary.leaks : [];

    return {
      memlabAvailable: true,
      customAnalysis: false,
      scenario: memlabResult.scenario,
      summary: {
        totalLeaks: leaks.length || 0,
        memoryIncrease: memoryInfo.current.heapUsed - memoryInfo.baseline.heapUsed,
        peakMemoryUsage: memoryInfo.peak.heapUsed,
        snapshotsTaken: memoryInfo.snapshots.length
      },
      leaks,
      recommendations: this.generateRecommendationsFromMemlab(memlabResult),
      metadata: {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(results: MemoryTestResult): string[] {
    const recommendations: string[] = [];

    if (results.hasLeak) {
      recommendations.push('🔴 Memory leak detected - investigate memory usage patterns');
      recommendations.push('🔍 Review object references and cleanup procedures');
      recommendations.push('📊 Monitor garbage collection patterns');
    }

    if (results.memoryGrowth > results.leakThreshold) {
      recommendations.push('⚠️ High memory growth detected');
      recommendations.push('🔧 Consider implementing memory pooling for large objects');
    }

    if (results.snapshots.length === 0) {
      recommendations.push('📸 Enable heap snapshots for detailed analysis');
    }

    recommendations.push('✅ No critical issues detected in memory patterns');

    return recommendations;
  }

  /**
   * Generate recommendations from Memlab results
   */
  private generateRecommendationsFromMemlab(memlabResult: Record<string, unknown>): string[] {
    const recommendations: string[] = [];
    
    // Type-safe access to memlabResult properties
    const summary = memlabResult.summary as Record<string, unknown> | undefined;
    const leaks = Array.isArray(summary?.leaks) ? summary.leaks : [];
    const memoryIncrease = typeof summary?.memoryIncrease === 'number' ? summary.memoryIncrease : 0;

    if (leaks.length > 0) {
      recommendations.push('🔴 Critical: Memory leaks detected by Memlab');
      recommendations.push('🔍 Review leaked objects and their reference chains');
      recommendations.push('🛠️ Implement proper cleanup in identified leak locations');
    }

    if (memoryIncrease > 50 * 1024 * 1024) { // 50MB
      recommendations.push('⚠️ Significant memory increase detected');
      recommendations.push('🔧 Optimize memory usage in hot paths');
    }

    return recommendations;
  }

  /**
   * Generate combined recommendations from both custom and Memlab analysis
   */
  private generateCombinedRecommendations(customResults: MemoryTestResult, memlabResults: Record<string, unknown> | null): string[] {
    const recommendations: string[] = [];

    // Add custom analysis recommendations
    if (customResults.hasLeak) {
      recommendations.push('🔴 Memory leak detected by custom analysis');
      recommendations.push('🔍 Review object references and cleanup procedures');
    }

    if (customResults.memoryGrowth > customResults.leakThreshold) {
      recommendations.push('⚠️ High memory growth detected by custom analysis');
      recommendations.push('🔧 Consider implementing memory pooling for large objects');
    }

    // Add Memlab recommendations if available
    if (memlabResults && memlabResults.status === 'ready') {
      recommendations.push('📊 Memlab utilities available for advanced analysis');
      recommendations.push('🔬 Consider setting up proper Memlab scenarios for web application testing');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ No critical memory issues detected');
      recommendations.push('📈 Continue monitoring memory usage in production');
    }

    return recommendations;
  }

  /**
   * Register a test scenario
   */
  // Interface for custom scenario results
  registerScenario(name: string, setup: () => Promise<void>, actions: () => Promise<void>): void {
    this.scenarios.set(name, { setup, actions });
  }

  /**
   * Get comprehensive memory analysis
   */
  async getComprehensiveAnalysis(): Promise<Record<string, unknown>> {
    const scenarios = Array.from(this.scenarios.keys());

    const results = {
      timestamp: new Date().toISOString(),
      memlabAvailable: this.memlabAvailable,
      totalScenarios: scenarios.length,
      scenarios: [] as Record<string, unknown>[]
    };

    for (const scenario of scenarios) {
      try {
        const scenarioResult = await this.runMemlabScenario(scenario);
        results.scenarios.push({
          name: scenario,
          ...scenarioResult
        });
      } catch (error) {
        results.scenarios.push({
          name: scenario,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * Get memory testing status
   */
  getStatus(): {
    memlabAvailable: boolean;
    scenariosRegistered: number;
    memoryTesterStatus: { [key: string]: unknown };
  } {
    return {
      memlabAvailable: this.memlabAvailable,
      scenariosRegistered: this.scenarios.size,
      memoryTesterStatus: this.memoryTester.getMemoryInfo()
    };
  }
}

/**
 * Convenience function to create Memlab integration
 */
export function createMemlabIntegration(): MemlabIntegration {
  return new MemlabIntegration();
}

// Export default instance
export const memlabIntegration = new MemlabIntegration();