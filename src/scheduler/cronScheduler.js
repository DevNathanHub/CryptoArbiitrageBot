// Cron Job Scheduler
// Manages scheduled tasks for arbitrage bot

import cron from 'node-cron';
import { config } from '../../config/config.js';

/**
 * Cron Scheduler for Arbitrage Bot
 * Manages periodic tasks with cron expressions
 */
export class CronScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Schedule a cron job
   * @param {string} name - Job name
   * @param {string} schedule - Cron expression
   * @param {Function} task - Task to execute
   * @param {Object} options - Optional settings
   */
  schedule(name, schedule, task, options = {}) {
    // Validate cron expression
    if (!cron.validate(schedule)) {
      console.error(`❌ Invalid cron expression for ${name}: ${schedule}`);
      return false;
    }

    // Stop existing job if it exists
    if (this.jobs.has(name)) {
      this.stop(name);
    }

    console.log(`⏰ Scheduling job "${name}" with pattern: ${schedule}`);

    const job = cron.schedule(schedule, async () => {
      const startTime = Date.now();
      
      // Update last run and run count
      const jobData = this.jobs.get(name);
      if (jobData) {
        jobData.lastRun = new Date();
        jobData.runCount++;
      }
      
      try {
        console.log(`\n🔄 Running scheduled job: ${name} (${new Date().toLocaleString()})`);
        await task();
        
        const duration = Date.now() - startTime;
        console.log(`✅ Job "${name}" completed in ${duration}ms`);
      } catch (error) {
        console.error(`❌ Job "${name}" failed:`, error.message);
        
        if (options.onError) {
          options.onError(error);
        }
      }
    }, {
      scheduled: false,
      timezone: options.timezone || 'UTC'
    });

    this.jobs.set(name, {
      job,
      schedule,
      task,
      options,
      createdAt: new Date(),
      lastRun: null,
      runCount: 0,
      isRunning: false
    });

    return true;
  }

  /**
   * Start a specific job or all jobs
   */
  start(name = null) {
    if (name) {
      const jobData = this.jobs.get(name);
      if (jobData) {
        jobData.job.start();
        jobData.isRunning = true;
        console.log(`▶️  Started job: ${name}`);
        return true;
      } else {
        console.error(`❌ Job not found: ${name}`);
        return false;
      }
    } else {
      // Start all jobs
      this.jobs.forEach((jobData, jobName) => {
        jobData.job.start();
        jobData.isRunning = true;
      });
      this.isRunning = true;
      console.log(`▶️  Started ${this.jobs.size} scheduled jobs`);
      return true;
    }
  }

  /**
   * Stop a specific job or all jobs
   */
  stop(name = null) {
    if (name) {
      const jobData = this.jobs.get(name);
      if (jobData) {
        jobData.job.stop();
        jobData.isRunning = false;
        console.log(`⏸️  Stopped job: ${name}`);
        return true;
      } else {
        console.error(`❌ Job not found: ${name}`);
        return false;
      }
    } else {
      // Stop all jobs
      this.jobs.forEach((jobData, jobName) => {
        jobData.job.stop();
        jobData.isRunning = false;
      });
      this.isRunning = false;
      console.log(`⏸️  Stopped all ${this.jobs.size} jobs`);
      return true;
    }
  }

  /**
   * Remove a job
   */
  remove(name) {
    const jobData = this.jobs.get(name);
    if (jobData) {
      jobData.job.stop();
      jobData.job.destroy();
      this.jobs.delete(name);
      console.log(`🗑️  Removed job: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Run a job immediately (outside of schedule)
   */
  async runNow(name) {
    const jobData = this.jobs.get(name);
    if (!jobData) {
      console.error(`❌ Job not found: ${name}`);
      return false;
    }

    console.log(`🚀 Running job "${name}" immediately...`);
    const startTime = Date.now();
    
    try {
      await jobData.task();
      jobData.lastRun = new Date();
      jobData.runCount++;
      
      const duration = Date.now() - startTime;
      console.log(`✅ Manual run of "${name}" completed in ${duration}ms`);
      return true;
    } catch (error) {
      console.error(`❌ Manual run of "${name}" failed:`, error.message);
      return false;
    }
  }

  /**
   * Get information about scheduled jobs
   */
  getJobInfo(name = null) {
    if (name) {
      const jobData = this.jobs.get(name);
      if (!jobData) return null;

      return {
        name,
        schedule: jobData.schedule,
        createdAt: jobData.createdAt,
        lastRun: jobData.lastRun,
        runCount: jobData.runCount,
        isRunning: jobData.job.options.scheduled
      };
    } else {
      // Return info for all jobs
      const allJobsInfo = {};
      this.jobs.forEach((jobData, jobName) => {
        allJobsInfo[jobName] = this.getJobInfo(jobName);
      });
      return allJobsInfo;
    }
  }

  /**
   * Print scheduler status
   */
  printStatus() {
    console.log('\n' + '='.repeat(80));
    console.log('⏰ CRON SCHEDULER STATUS');
    console.log('='.repeat(80));
    console.log(`Total Jobs: ${this.jobs.size}`);
    console.log(`Scheduler Running: ${this.isRunning ? 'YES ✅' : 'NO ⏸️'}`);
    console.log('-'.repeat(80));

    if (this.jobs.size === 0) {
      console.log('No jobs scheduled');
    } else {
      this.jobs.forEach((jobData, jobName) => {
        console.log(`\n📋 ${jobName}`);
        console.log(`   Schedule: ${jobData.schedule}`);
        console.log(`   Created: ${jobData.createdAt.toLocaleString()}`);
        console.log(`   Last Run: ${jobData.lastRun ? jobData.lastRun.toLocaleString() : 'Never'}`);
        console.log(`   Run Count: ${jobData.runCount}`);
        console.log(`   Status: ${jobData.isRunning ? '▶️  Running' : '⏸️  Stopped'}`);
      });
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Update a job's schedule
   */
  reschedule(name, newSchedule) {
    const jobData = this.jobs.get(name);
    if (!jobData) {
      console.error(`❌ Job not found: ${name}`);
      return false;
    }

    if (!cron.validate(newSchedule)) {
      console.error(`❌ Invalid cron expression: ${newSchedule}`);
      return false;
    }

    // Stop and remove old job
    this.remove(name);

    // Create new job with updated schedule
    this.schedule(name, newSchedule, jobData.task, jobData.options);
    this.start(name);

    console.log(`🔄 Rescheduled "${name}" to: ${newSchedule}`);
    return true;
  }
}

/**
 * Pre-configured cron schedules for common intervals
 */
export const CronSchedules = {
  // Every N seconds (using manual intervals, cron supports min=1 minute)
  EVERY_30_SECONDS: '*/30 * * * * *',
  EVERY_MINUTE: '* * * * *',
  
  // Every N minutes
  EVERY_2_MINUTES: '*/2 * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_10_MINUTES: '*/10 * * * *',
  EVERY_15_MINUTES: '*/15 * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',
  
  // Hourly
  EVERY_HOUR: '0 * * * *',
  EVERY_2_HOURS: '0 */2 * * *',
  EVERY_4_HOURS: '0 */4 * * *',
  EVERY_6_HOURS: '0 */6 * * *',
  
  // Daily
  DAILY_MIDNIGHT: '0 0 * * *',
  DAILY_NOON: '0 12 * * *',
  DAILY_9AM: '0 9 * * *',
  DAILY_5PM: '0 17 * * *',
  
  // Trading hours (example: 9 AM to 5 PM every hour)
  TRADING_HOURS: '0 9-17 * * *',
  
  // Market events
  MARKET_OPEN: '0 9 * * 1-5',      // 9 AM weekdays
  MARKET_CLOSE: '0 17 * * 1-5',    // 5 PM weekdays
  
  // Weekly
  WEEKLY_MONDAY: '0 0 * * 1',
  WEEKLY_FRIDAY: '0 0 * * 5',
  
  // Monthly
  MONTHLY_FIRST: '0 0 1 * *',
  MONTHLY_LAST: '0 0 L * *'
};

/**
 * Create default arbitrage bot schedule
 */
export function createDefaultSchedule(cronScheduler, callbacks) {
  const {
    onQuickScan,
    onDeepScan,
    onDailyReport,
    onCleanup,
    onHealthCheck,
    onMarketingUpdate,
    onNewsUpdate
  } = callbacks;

  // Quick scans every 2 minutes for fast opportunities
  if (onQuickScan) {
    cronScheduler.schedule(
      'quick-scan',
      CronSchedules.EVERY_2_MINUTES,
      onQuickScan,
      { timezone: 'UTC' }
    );
  }

  // Deep analysis every 15 minutes
  if (onDeepScan) {
    cronScheduler.schedule(
      'deep-scan',
      CronSchedules.EVERY_15_MINUTES,
      onDeepScan,
      { timezone: 'UTC' }
    );
  }

  // Daily performance report at midnight
  if (onDailyReport) {
    cronScheduler.schedule(
      'daily-report',
      CronSchedules.DAILY_MIDNIGHT,
      onDailyReport,
      { timezone: 'UTC' }
    );
  }

  // Weekly cleanup on Sundays at midnight
  if (onCleanup) {
    cronScheduler.schedule(
      'weekly-cleanup',
      '0 0 * * 0',
      onCleanup,
      { timezone: 'UTC' }
    );
  }

  // Health check every hour
  if (onHealthCheck) {
    cronScheduler.schedule(
      'health-check',
      CronSchedules.EVERY_HOUR,
      onHealthCheck,
      { timezone: 'UTC' }
    );
  }

  // Marketing updates every 5 minutes
  if (onMarketingUpdate) {
    cronScheduler.schedule(
      'marketing-update',
      CronSchedules.EVERY_5_MINUTES,
      onMarketingUpdate,
      { timezone: 'UTC' }
    );
  }

  // News updates every 3 minutes
  if (onNewsUpdate) {
    cronScheduler.schedule(
      'news-update',
      '*/3 * * * *', // Every 3 minutes
      onNewsUpdate,
      { timezone: 'UTC' }
    );
  }

  console.log('✅ Default schedule created');
  return cronScheduler;
}

// Create singleton instance
export const cronScheduler = new CronScheduler();

// If run directly (for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Testing Cron Scheduler...\n');
  
  const scheduler = new CronScheduler();

  // Test scheduling
  scheduler.schedule('test-job', '*/5 * * * * *', async () => {
    console.log('Test job executed!');
  });

  scheduler.schedule('another-job', '*/10 * * * * *', async () => {
    console.log('Another job executed!');
  });

  scheduler.start();
  scheduler.printStatus();

  // Run for 30 seconds then stop
  setTimeout(() => {
    scheduler.stop();
    scheduler.printStatus();
    process.exit(0);
  }, 30000);
}
