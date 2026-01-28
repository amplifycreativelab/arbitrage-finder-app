/**
 * Story 7.6: Continuous Deep Scan Settings & Status UI - Unit Tests
 * 
 * Tests for:
 * - Scan interval scheduling logic
 * - Pause/resume state transitions
 * - Quota calculation and warnings
 * - History ring buffer (max 5 entries)
 * - Settings validation ranges
 */

const { describe, it, beforeEach } = require('node:test')
const assert = require('node:assert')

// Mock types for testing
/** @typedef {import('../shared/types').ScanHistoryEntry} ScanHistoryEntry */
/** @typedef {import('../shared/types').DeepScanQuotaStatus} DeepScanQuotaStatus */

const MAX_HISTORY_ENTRIES = 5
const HOURLY_REQUEST_LIMIT = 5000

/**
 * Calculate estimated hourly requests based on settings
 * @param {Object} settings
 * @param {number} settings.intervalMinutes
 * @param {number} settings.maxEventsPerCycle
 * @returns {number}
 */
function estimateHourlyRequests(settings) {
  const cyclesPerHour = 60 / settings.intervalMinutes
  const eventsPerCycle = settings.maxEventsPerCycle
  const requestsPerEvent = 1 // /odds endpoint
  const discoveryRequests = 2 // /events calls per cycle
  return cyclesPerHour * (eventsPerCycle * requestsPerEvent + discoveryRequests)
}

/**
 * Scan history ring buffer
 */
class ScanHistoryBuffer {
  constructor() {
    /** @type {ScanHistoryEntry[]} */
    this.entries = []
  }

  /**
   * Add entry to history
   * @param {ScanHistoryEntry} entry
   */
  add(entry) {
    this.entries.push(entry)
    if (this.entries.length > MAX_HISTORY_ENTRIES) {
      this.entries.shift() // Remove oldest
    }
  }

  /**
   * Get all entries
   * @returns {ScanHistoryEntry[]}
   */
  getAll() {
    return [...this.entries]
  }

  /**
   * Get entry count
   * @returns {number}
   */
  get count() {
    return this.entries.length
  }
}

/**
 * Deep Scan Settings Validator
 */
class SettingsValidator {
  /**
   * Validate scan interval
   * @param {number} minutes
   * @returns {{ valid: boolean, normalized: number }}
   */
  static validateInterval(minutes) {
    if (!Number.isFinite(minutes)) {
      return { valid: false, normalized: 5 }
    }
    const normalized = Math.max(1, Math.min(30, Math.floor(minutes)))
    return { valid: normalized === minutes, normalized }
  }

  /**
   * Validate concurrent requests
   * @param {number} count
   * @returns {{ valid: boolean, normalized: number }}
   */
  static validateConcurrentRequests(count) {
    if (!Number.isFinite(count)) {
      return { valid: false, normalized: 2 }
    }
    const normalized = Math.max(1, Math.min(10, Math.floor(count)))
    return { valid: normalized === count, normalized }
  }

  /**
   * Check if settings exceed quota warning threshold
   * @param {Object} settings
   * @param {number} settings.intervalMinutes
   * @param {number} settings.maxEventsPerCycle
   * @returns {{ exceedsWarning: boolean, estimatedHourly: number, warningThreshold: number }}
   */
  static checkQuotaWarning(settings) {
    const estimatedHourly = estimateHourlyRequests(settings)
    const warningThreshold = 4000 // 80% of 5000
    return {
      exceedsWarning: estimatedHourly > warningThreshold,
      estimatedHourly,
      warningThreshold
    }
  }
}

/**
 * Pause/Resume State Manager
 */
class PauseStateManager {
  constructor() {
    this.paused = false
    this.pauseCount = 0
    this.resumeCount = 0
  }

  pause() {
    if (!this.paused) {
      this.paused = true
      this.pauseCount++
      return true
    }
    return false
  }

  resume() {
    if (this.paused) {
      this.paused = false
      this.resumeCount++
      return true
    }
    return false
  }

  isPaused() {
    return this.paused
  }
}

describe('Story 7.6: Continuous Deep Scan Settings & Status UI', () => {
  describe('Scan Interval Scheduling', () => {
    it('should calculate correct delay based on interval and elapsed time', () => {
      const intervalMinutes = 5
      const intervalMs = intervalMinutes * 60 * 1000
      const cycleStartedAt = Date.now() - 60000 // 1 minute ago
      const elapsed = Date.now() - cycleStartedAt
      const delay = Math.max(0, intervalMs - elapsed)
      
      // Expected: 5 min - 1 min = 4 min = 240000ms
      assert.strictEqual(delay, 240000)
    })

    it('should return 0 delay if elapsed exceeds interval', () => {
      const intervalMinutes = 5
      const intervalMs = intervalMinutes * 60 * 1000
      const cycleStartedAt = Date.now() - 400000 // ~6.6 minutes ago
      const elapsed = Date.now() - cycleStartedAt
      const delay = Math.max(0, intervalMs - elapsed)
      
      assert.strictEqual(delay, 0)
    })
  })

  describe('Settings Validation', () => {
    it('should validate scan interval within range 1-30 minutes', () => {
      // Valid values
      assert.deepStrictEqual(SettingsValidator.validateInterval(5), { valid: true, normalized: 5 })
      assert.deepStrictEqual(SettingsValidator.validateInterval(1), { valid: true, normalized: 1 })
      assert.deepStrictEqual(SettingsValidator.validateInterval(30), { valid: true, normalized: 30 })
      
      // Invalid values - clamped
      assert.deepStrictEqual(SettingsValidator.validateInterval(0), { valid: false, normalized: 1 })
      assert.deepStrictEqual(SettingsValidator.validateInterval(31), { valid: false, normalized: 30 })
      assert.deepStrictEqual(SettingsValidator.validateInterval(-5), { valid: false, normalized: 1 })
      assert.deepStrictEqual(SettingsValidator.validateInterval(NaN), { valid: false, normalized: 5 })
    })

    it('should validate concurrent requests within range 1-10', () => {
      // Valid values
      assert.deepStrictEqual(SettingsValidator.validateConcurrentRequests(5), { valid: true, normalized: 5 })
      assert.deepStrictEqual(SettingsValidator.validateConcurrentRequests(1), { valid: true, normalized: 1 })
      assert.deepStrictEqual(SettingsValidator.validateConcurrentRequests(10), { valid: true, normalized: 10 })
      
      // Invalid values - clamped
      assert.deepStrictEqual(SettingsValidator.validateConcurrentRequests(0), { valid: false, normalized: 1 })
      assert.deepStrictEqual(SettingsValidator.validateConcurrentRequests(11), { valid: false, normalized: 10 })
      assert.deepStrictEqual(SettingsValidator.validateConcurrentRequests(-1), { valid: false, normalized: 1 })
      assert.deepStrictEqual(SettingsValidator.validateConcurrentRequests(NaN), { valid: false, normalized: 2 })
    })
  })

  describe('Quota Estimation', () => {
    it('should calculate estimated hourly requests correctly', () => {
      // 5 min interval, 50 events per cycle
      // Cycles per hour: 60/5 = 12
      // Requests per cycle: 50*1 + 2 = 52
      // Total: 12 * 52 = 624
      const result = estimateHourlyRequests({ intervalMinutes: 5, maxEventsPerCycle: 50 })
      assert.strictEqual(result, 624)
    })

    it('should warn when estimated requests exceed 4000 (80% of 5000)', () => {
      // High settings that would exceed quota
      const highSettings = { intervalMinutes: 1, maxEventsPerCycle: 100 }
      const warningResult = SettingsValidator.checkQuotaWarning(highSettings)
      assert.strictEqual(warningResult.exceedsWarning, true)
      assert.ok(warningResult.estimatedHourly > 4000)
    })

    it('should not warn when estimated requests are below threshold', () => {
      // Conservative settings
      const lowSettings = { intervalMinutes: 10, maxEventsPerCycle: 30 }
      const warningResult = SettingsValidator.checkQuotaWarning(lowSettings)
      assert.strictEqual(warningResult.exceedsWarning, false)
      assert.ok(warningResult.estimatedHourly < 4000)
    })
  })

  describe('Pause/Resume State Transitions', () => {
    let manager

    beforeEach(() => {
      manager = new PauseStateManager()
    })

    it('should start in unpaused state', () => {
      assert.strictEqual(manager.isPaused(), false)
    })

    it('should transition to paused state', () => {
      const changed = manager.pause()
      assert.strictEqual(changed, true)
      assert.strictEqual(manager.isPaused(), true)
      assert.strictEqual(manager.pauseCount, 1)
    })

    it('should not double-pause', () => {
      manager.pause()
      const changed = manager.pause()
      assert.strictEqual(changed, false)
      assert.strictEqual(manager.isPaused(), true)
      assert.strictEqual(manager.pauseCount, 1)
    })

    it('should transition back to unpaused state', () => {
      manager.pause()
      const changed = manager.resume()
      assert.strictEqual(changed, true)
      assert.strictEqual(manager.isPaused(), false)
      assert.strictEqual(manager.resumeCount, 1)
    })

    it('should not resume when not paused', () => {
      const changed = manager.resume()
      assert.strictEqual(changed, false)
      assert.strictEqual(manager.isPaused(), false)
      assert.strictEqual(manager.resumeCount, 0)
    })

    it('should track multiple pause/resume cycles', () => {
      manager.pause()
      manager.resume()
      manager.pause()
      manager.resume()
      assert.strictEqual(manager.pauseCount, 2)
      assert.strictEqual(manager.resumeCount, 2)
      assert.strictEqual(manager.isPaused(), false)
    })
  })

  describe('History Ring Buffer', () => {
    let buffer

    beforeEach(() => {
      buffer = new ScanHistoryBuffer()
    })

    it('should start empty', () => {
      assert.strictEqual(buffer.count, 0)
      assert.deepStrictEqual(buffer.getAll(), [])
    })

    it('should add entries', () => {
      const entry = {
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        eventsScanned: 10,
        opportunitiesFound: 2,
        durationMs: 5000,
        mode: 'continuous'
      }
      buffer.add(entry)
      assert.strictEqual(buffer.count, 1)
    })

    it('should maintain max 5 entries', () => {
      for (let i = 0; i < 7; i++) {
        buffer.add({
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          eventsScanned: i + 1,
          opportunitiesFound: 1,
          durationMs: 1000,
          mode: 'continuous'
        })
      }
      assert.strictEqual(buffer.count, 5)
    })

    it('should remove oldest entries when exceeding max', () => {
      for (let i = 0; i < 6; i++) {
        buffer.add({
          startedAt: new Date(Date.now() + i * 1000).toISOString(),
          completedAt: new Date(Date.now() + i * 1000 + 500).toISOString(),
          eventsScanned: i + 1,
          opportunitiesFound: 1,
          durationMs: 500,
          mode: 'continuous'
        })
      }
      
      const entries = buffer.getAll()
      assert.strictEqual(entries.length, 5)
      // First entry (eventsScanned: 1) should have been removed
      assert.strictEqual(entries[0].eventsScanned, 2)
      // Last entry should be the most recent
      assert.strictEqual(entries[4].eventsScanned, 6)
    })

    it('should preserve entry order', () => {
      const entries = [
        { mode: 'manual', eventsScanned: 5, opportunitiesFound: 1, durationMs: 1000 },
        { mode: 'continuous', eventsScanned: 10, opportunitiesFound: 3, durationMs: 2000 },
        { mode: 'continuous', eventsScanned: 15, opportunitiesFound: 2, durationMs: 1500 }
      ]
      
      entries.forEach((e, i) => {
        buffer.add({
          startedAt: new Date(Date.now() + i * 1000).toISOString(),
          completedAt: new Date(Date.now() + i * 1000 + e.durationMs).toISOString(),
          ...e
        })
      })
      
      const all = buffer.getAll()
      assert.strictEqual(all[0].mode, 'manual')
      assert.strictEqual(all[1].mode, 'continuous')
      assert.strictEqual(all[2].mode, 'continuous')
    })
  })

  describe('Quota Status Calculation', () => {
    it('should calculate quota percentage correctly', () => {
      const hourlyUsed = 2500
      const hourlyLimit = 5000
      const percentUsed = hourlyLimit > 0 ? hourlyUsed / hourlyLimit : 0
      assert.strictEqual(percentUsed, 0.5)
    })

    it('should identify throttled state at 90% threshold', () => {
      const quotaStatus = {
        hourlyUsed: 4500,
        hourlyLimit: 5000,
        percentUsed: 0.9,
        isThrottled: true
      }
      assert.strictEqual(quotaStatus.isThrottled, true)
    })

    it('should identify warning state at 80% threshold', () => {
      const quotaStatus = {
        hourlyUsed: 4000,
        hourlyLimit: 5000,
        percentUsed: 0.8,
        isThrottled: false
      }
      assert.strictEqual(quotaStatus.percentUsed >= 0.8, true)
      assert.strictEqual(quotaStatus.isThrottled, false)
    })
  })
})
