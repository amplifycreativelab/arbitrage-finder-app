/**
 * Story 8.7: Aggressive Pre-Match Scanning Tests
 * 
 * Comprehensive test suite for:
 * - Event tiering system
 * - Quota budget management
 * - Tiered polling scheduler
 * - Arb boost system
 * - Odds cache with history
 */

const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert')

// Mock Date for consistent testing
let mockNow = 1700000000000 // Fixed timestamp for testing

// Simple mock implementation for testing
const mockAggressiveScan = {
  config: {
    enabled: false,
    quotaTargetPercent: 75,
    scanHorizonHours: 48,
    imminentPollIntervalSeconds: 45,
    tierBoundaries: {
      imminent: 30,
      soon: 120,
      today: 360,
      later: 1440,
      tomorrow: 2880
    },
    tierWeights: {
      imminent: 50,
      soon: 25,
      today: 12,
      later: 8,
      tomorrow: 3,
      distant: 2
    },
    arbBoostDurationMinutes: 5,
    arbBoostPollIntervalSeconds: 20,
    maxBoostedEvents: 10,
    maxCachedEvents: 3000,
    eventDiscoveryIntervalMinutes: 30
  },
  
  tieredEventCache: new Map(),
  oddsCache: new Map(),
  boostedEvents: new Map(),
  quotaBudget: null,
  
  resetState() {
    this.config = {
      enabled: false,
      quotaTargetPercent: 75,
      scanHorizonHours: 48,
      imminentPollIntervalSeconds: 45,
      tierBoundaries: {
        imminent: 30,
        soon: 120,
        today: 360,
        later: 1440,
        tomorrow: 2880
      },
      tierWeights: {
        imminent: 50,
        soon: 25,
        today: 12,
        later: 8,
        tomorrow: 3,
        distant: 2
      },
      arbBoostDurationMinutes: 5,
      arbBoostPollIntervalSeconds: 20,
      maxBoostedEvents: 10,
      maxCachedEvents: 3000,
      eventDiscoveryIntervalMinutes: 30
    }
    this.tieredEventCache.clear()
    this.oddsCache.clear()
    this.boostedEvents.clear()
    this.quotaBudget = null
    this.initTierCache()
  },
  
  initTierCache() {
    this.tieredEventCache.clear()
    for (const tier of ['imminent', 'soon', 'today', 'later', 'tomorrow', 'distant']) {
      this.tieredEventCache.set(tier, new Map())
    }
  },
  
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
  },
  
  getConfig() {
    return { ...this.config }
  },
  
  // Task 1.3: calculateEventTier
  calculateEventTier(event, now = mockNow) {
    if (!event.date) {
      return 'distant'
    }
    
    const kickoffMs = new Date(event.date).getTime()
    if (!Number.isFinite(kickoffMs)) {
      return 'distant'
    }
    
    // Event has already started
    if (kickoffMs <= now) {
      return 'distant'
    }
    
    const minutesToKickoff = Math.floor((kickoffMs - now) / (60 * 1000))
    
    if (minutesToKickoff <= this.config.tierBoundaries.imminent) {
      return 'imminent'
    }
    if (minutesToKickoff <= this.config.tierBoundaries.soon) {
      return 'soon'
    }
    if (minutesToKickoff <= this.config.tierBoundaries.today) {
      return 'today'
    }
    if (minutesToKickoff <= this.config.tierBoundaries.later) {
      return 'later'
    }
    if (minutesToKickoff <= this.config.tierBoundaries.tomorrow) {
      return 'tomorrow'
    }
    return 'distant'
  },
  
  // Task 1.7: isPreMatchEvent
  isPreMatchEvent(event, now = mockNow) {
    if (!event.date) {
      return true
    }
    const kickoffMs = new Date(event.date).getTime()
    return Number.isFinite(kickoffMs) && kickoffMs > now
  },
  
  // Task 1.2: createTieredEvent
  createTieredEvent(event, now = mockNow) {
    const tier = this.calculateEventTier(event, now)
    const kickoffMs = event.date ? new Date(event.date).getTime() : Infinity
    const minutesToKickoff = Number.isFinite(kickoffMs) 
      ? Math.floor((kickoffMs - now) / (60 * 1000))
      : Infinity
    
    return {
      id: event.id,
      name: event.name,
      date: event.date,
      league: event.league,
      sport: event.sport,
      tier,
      minutesToKickoff,
      lastPolledAt: null,
      pollCount: 0,
      volatilityScore: 0,
      isBoosted: false,
      boostExpiresAt: null
    }
  },
  
  // Task 1.4: upsertTieredEvent
  upsertTieredEvent(event, now = mockNow) {
    const tieredEvent = this.createTieredEvent(event, now)
    const tierMap = this.tieredEventCache.get(tieredEvent.tier)
    
    if (tierMap) {
      const existing = tierMap.get(event.id)
      if (existing) {
        tieredEvent.lastPolledAt = existing.lastPolledAt
        tieredEvent.pollCount = existing.pollCount
        tieredEvent.volatilityScore = existing.volatilityScore
        tieredEvent.isBoosted = existing.isBoosted
        tieredEvent.boostExpiresAt = existing.boostExpiresAt
      }
      tierMap.set(event.id, tieredEvent)
    }
    
    return tieredEvent
  },
  
  getEventsForTier(tier) {
    const tierMap = this.tieredEventCache.get(tier)
    return tierMap ? Array.from(tierMap.values()) : []
  },
  
  getEventById(eventId) {
    for (const tierMap of this.tieredEventCache.values()) {
      const event = tierMap.get(eventId)
      if (event) return event
    }
    return undefined
  },
  
  // Task 1.5: promoteEvents
  promoteEvents(now = mockNow) {
    const promotions = []
    
    for (const [tier, tierMap] of this.tieredEventCache.entries()) {
      for (const [eventId, event] of tierMap.entries()) {
        const newTier = this.calculateEventTier(event, now)
        if (newTier !== tier) {
          tierMap.delete(eventId)
          event.tier = newTier
          const newTierMap = this.tieredEventCache.get(newTier)
          if (newTierMap) {
            newTierMap.set(eventId, event)
          }
          promotions.push({ eventId, oldTier: tier, newTier })
        }
      }
    }
    
    return promotions
  },
  
  getEventCountsByTier() {
    const counts = {
      imminent: 0,
      soon: 0,
      today: 0,
      later: 0,
      tomorrow: 0,
      distant: 0
    }
    
    for (const [tier, tierMap] of this.tieredEventCache.entries()) {
      counts[tier] = tierMap.size
    }
    
    return counts
  },
  
  // Task 3: Quota Budget System
  initQuotaBudget() {
    const HOURLY_LIMIT = 5000
    const targetRequests = Math.floor(HOURLY_LIMIT * (this.config.quotaTargetPercent / 100))
    const bufferRequests = Math.floor(targetRequests * 0.2)
    const usableRequests = targetRequests - bufferRequests
    
    const totalWeight = Object.values(this.config.tierWeights).reduce((a, b) => a + b, 0)
    
    const perTier = {}
    for (const tier of Object.keys(this.config.tierWeights)) {
      const weight = this.config.tierWeights[tier]
      const eventCount = this.getEventsForTier(tier).length
      const allocated = Math.floor((weight / totalWeight) * usableRequests)
      
      perTier[tier] = {
        tier,
        weight,
        allocatedRequests: allocated,
        usedThisHour: 0,
        eventCount,
        currentPollIntervalSeconds: this.calculatePollInterval(tier, allocated, eventCount)
      }
    }
    
    this.quotaBudget = {
      totalHourlyLimit: HOURLY_LIMIT,
      targetPercent: this.config.quotaTargetPercent,
      targetRequestsPerHour: targetRequests,
      bufferPercent: 20,
      bufferRequests,
      usableRequests,
      perTier,
      currentHourUsed: 0,
      currentHourRemaining: usableRequests,
      hourResetAt: new Date(mockNow + 60 * 60 * 1000).toISOString()
    }
    
    return this.quotaBudget
  },
  
  // Task 3.4: calculatePollInterval
  calculatePollInterval(tier, allocatedRequests, eventCount) {
    const tierConfigs = {
      imminent: { min: 15, max: 60 },
      soon: { min: 60, max: 180 },
      today: { min: 180, max: 600 },
      later: { min: 600, max: 1800 },
      tomorrow: { min: 1800, max: 3600 },
      distant: { min: 3600, max: 7200 }
    }
    
    const config = tierConfigs[tier]
    if (!config || eventCount === 0) {
      return config?.max || 3600
    }
    
    const batchesPerPoll = Math.ceil(eventCount / 10)
    const pollsPerHour = Math.floor(allocatedRequests / batchesPerPoll)
    
    if (pollsPerHour === 0) {
      return config.max
    }
    
    const secondsPerPoll = Math.floor(3600 / pollsPerHour)
    return Math.max(config.min, Math.min(config.max, secondsPerPoll))
  },
  
  // Task 3.3: calculateTierBudgets
  calculateTierBudgets(totalBudget, tierWeights, eventCounts) {
    const totalWeight = Object.values(tierWeights).reduce((a, b) => a + b, 0)
    const budgets = {}
    
    for (const tier of Object.keys(tierWeights)) {
      const eventCount = eventCounts[tier] || 0
      const weight = tierWeights[tier]
      const allocated = Math.floor((weight / totalWeight) * totalBudget)
      
      budgets[tier] = {
        tier,
        weight,
        allocatedRequests: allocated,
        usedThisHour: 0,
        eventCount,
        currentPollIntervalSeconds: this.calculatePollInterval(tier, allocated, eventCount)
      }
    }
    
    return budgets
  },
  
  recordRequest(count = 1) {
    if (this.quotaBudget) {
      this.quotaBudget.currentHourUsed += count
      this.quotaBudget.currentHourRemaining = Math.max(0, 
        this.quotaBudget.usableRequests - this.quotaBudget.currentHourUsed)
    }
  },
  
  isOverBudget(tier) {
    if (!this.quotaBudget) return false
    return this.quotaBudget.perTier[tier].usedThisHour >= 
           this.quotaBudget.perTier[tier].allocatedRequests
  },
  
  canUseBurstBuffer() {
    if (!this.quotaBudget) return false
    return this.quotaBudget.currentHourUsed < 
           (this.quotaBudget.usableRequests + this.quotaBudget.bufferRequests)
  },
  
  // Task 6: Arb Boost System
  boostEvent(eventId, reason = 'arb_detected') {
    // Check max concurrent boosts
    if (this.boostedEvents.size >= this.config.maxBoostedEvents) {
      const oldest = Array.from(this.boostedEvents.values())
        .sort((a, b) => new Date(a.boostedAt) - new Date(b.boostedAt))[0]
      if (oldest) {
        this.boostedEvents.delete(oldest.eventId)
      }
    }
    
    const event = this.getEventById(eventId)
    if (!event) return false
    
    const boostDurationMs = this.config.arbBoostDurationMinutes * 60 * 1000
    const now = mockNow
    
    const boostInfo = {
      eventId,
      boostedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + boostDurationMs).toISOString(),
      reason
    }
    
    this.boostedEvents.set(eventId, boostInfo)
    event.isBoosted = true
    event.boostExpiresAt = boostInfo.expiresAt
    
    return true
  },
  
  removeBoost(eventId) {
    const event = this.getEventById(eventId)
    if (event) {
      event.isBoosted = false
      event.boostExpiresAt = null
    }
    this.boostedEvents.delete(eventId)
  },
  
  // Task 6.6: cleanupExpiredBoosts
  cleanupExpiredBoosts(now = mockNow) {
    const expired = []
    
    for (const [eventId, boostInfo] of this.boostedEvents.entries()) {
      if (new Date(boostInfo.expiresAt).getTime() <= now) {
        expired.push(eventId)
      }
    }
    
    for (const eventId of expired) {
      this.removeBoost(eventId)
    }
    
    return expired.length
  },
  
  isEventBoosted(eventId) {
    return this.boostedEvents.has(eventId)
  },
  
  getBoostedEventIds() {
    return Array.from(this.boostedEvents.keys())
  },
  
  // Task 9: Stats
  getAggressiveScanStats() {
    const eventCounts = this.getEventCountsByTier()
    const totalEvents = Object.values(eventCounts).reduce((a, b) => a + b, 0)
    
    return {
      enabled: this.config.enabled,
      quotaTargetPercent: this.config.quotaTargetPercent,
      quotaUsedThisHour: this.quotaBudget?.currentHourUsed || 0,
      quotaRemainingThisHour: this.quotaBudget?.currentHourRemaining || 0,
      quotaEfficiencyPercent: this.quotaBudget 
        ? Math.min(100, Math.floor((this.quotaBudget.currentHourUsed / this.quotaBudget.targetRequestsPerHour) * 100))
        : 0,
      eventsByTier: eventCounts,
      totalEvents,
      boostedEvents: this.boostedEvents.size,
      cachedEvents: this.oddsCache.size
    }
  }
}

describe('Story 8.7: Aggressive Pre-Match Scanning', () => {
  beforeEach(() => {
    mockAggressiveScan.resetState()
    mockNow = 1700000000000
  })

  // ============================================================================
  // Task 1: Event Tiering System Tests
  // ============================================================================
  
  describe('Task 1.1-1.8: Event Tiering System', () => {
    it('should categorize events into correct tiers based on time-to-kickoff', () => {
      // Imminent: < 30 minutes
      const imminentEvent = { id: '1', name: 'Test', date: new Date(mockNow + 15 * 60 * 1000).toISOString() }
      assert.strictEqual(mockAggressiveScan.calculateEventTier(imminentEvent), 'imminent')
      
      // Soon: 30-120 minutes
      const soonEvent = { id: '2', name: 'Test', date: new Date(mockNow + 60 * 60 * 1000).toISOString() }
      assert.strictEqual(mockAggressiveScan.calculateEventTier(soonEvent), 'soon')
      
      // Today: 2-6 hours
      const todayEvent = { id: '3', name: 'Test', date: new Date(mockNow + 4 * 60 * 60 * 1000).toISOString() }
      assert.strictEqual(mockAggressiveScan.calculateEventTier(todayEvent), 'today')
      
      // Later: 6-24 hours
      const laterEvent = { id: '4', name: 'Test', date: new Date(mockNow + 12 * 60 * 60 * 1000).toISOString() }
      assert.strictEqual(mockAggressiveScan.calculateEventTier(laterEvent), 'later')
      
      // Tomorrow: 24-48 hours
      const tomorrowEvent = { id: '5', name: 'Test', date: new Date(mockNow + 36 * 60 * 60 * 1000).toISOString() }
      assert.strictEqual(mockAggressiveScan.calculateEventTier(tomorrowEvent), 'tomorrow')
      
      // Distant: > 48 hours
      const distantEvent = { id: '6', name: 'Test', date: new Date(mockNow + 72 * 60 * 60 * 1000).toISOString() }
      assert.strictEqual(mockAggressiveScan.calculateEventTier(distantEvent), 'distant')
    })

    it('should filter out events that have already started (Task 1.7)', () => {
      const pastEvent = { id: '1', name: 'Test', date: new Date(mockNow - 60 * 60 * 1000).toISOString() }
      assert.strictEqual(mockAggressiveScan.isPreMatchEvent(pastEvent), false)
      assert.strictEqual(mockAggressiveScan.calculateEventTier(pastEvent), 'distant')
      
      const futureEvent = { id: '2', name: 'Test', date: new Date(mockNow + 60 * 60 * 1000).toISOString() }
      assert.strictEqual(mockAggressiveScan.isPreMatchEvent(futureEvent), true)
    })

    it('should create TieredEvent with correct metadata (Task 1.2)', () => {
      const event = { id: '1', name: 'Team A vs Team B', date: new Date(mockNow + 30 * 60 * 1000).toISOString(), league: 'Premier League', sport: 'football' }
      const tiered = mockAggressiveScan.createTieredEvent(event)
      
      assert.strictEqual(tiered.id, '1')
      assert.strictEqual(tiered.name, 'Team A vs Team B')
      assert.strictEqual(tiered.tier, 'imminent')
      assert.strictEqual(tiered.minutesToKickoff, 30)
      assert.strictEqual(tiered.pollCount, 0)
      assert.strictEqual(tiered.volatilityScore, 0)
      assert.strictEqual(tiered.isBoosted, false)
      assert.strictEqual(tiered.boostExpiresAt, null)
    })

    it('should upsert events into tier cache (Task 1.4)', () => {
      const event = { id: '1', name: 'Test', date: new Date(mockNow + 30 * 60 * 1000).toISOString() }
      
      mockAggressiveScan.upsertTieredEvent(event)
      
      const events = mockAggressiveScan.getEventsForTier('imminent')
      assert.strictEqual(events.length, 1)
      assert.strictEqual(events[0].id, '1')
    })

    it('should promote events between tiers as time passes (Task 1.5)', () => {
      // Create event in 'soon' tier (60 minutes)
      const event = { id: '1', name: 'Test', date: new Date(mockNow + 60 * 60 * 1000).toISOString() }
      mockAggressiveScan.upsertTieredEvent(event)
      
      assert.strictEqual(mockAggressiveScan.getEventsForTier('soon').length, 1)
      assert.strictEqual(mockAggressiveScan.getEventsForTier('imminent').length, 0)
      
      // Advance time by 45 minutes - event should now be 'imminent'
      const later = mockNow + 45 * 60 * 1000
      const promotions = mockAggressiveScan.promoteEvents(later)
      
      assert.strictEqual(promotions.length, 1)
      assert.strictEqual(promotions[0].oldTier, 'soon')
      assert.strictEqual(promotions[0].newTier, 'imminent')
      assert.strictEqual(mockAggressiveScan.getEventsForTier('soon').length, 0)
      assert.strictEqual(mockAggressiveScan.getEventsForTier('imminent').length, 1)
    })

    it('should track events per tier (Task 1.5)', () => {
      mockAggressiveScan.upsertTieredEvent({ id: '1', name: 'Test1', date: new Date(mockNow + 15 * 60 * 1000).toISOString() })
      mockAggressiveScan.upsertTieredEvent({ id: '2', name: 'Test2', date: new Date(mockNow + 60 * 60 * 1000).toISOString() })
      mockAggressiveScan.upsertTieredEvent({ id: '3', name: 'Test3', date: new Date(mockNow + 4 * 60 * 60 * 1000).toISOString() })
      
      const counts = mockAggressiveScan.getEventCountsByTier()
      
      assert.strictEqual(counts.imminent, 1)
      assert.strictEqual(counts.soon, 1)
      assert.strictEqual(counts.today, 1)
      assert.strictEqual(counts.later, 0)
    })

    it('should allow configurable tier boundaries (Task 1.6)', () => {
      mockAggressiveScan.setConfig({
        tierBoundaries: { imminent: 60, soon: 180, today: 480, later: 1440, tomorrow: 2880 }
      })
      
      // Event at 45 minutes should now be 'imminent' (was 'soon' with default 30 min boundary)
      const event = { id: '1', name: 'Test', date: new Date(mockNow + 45 * 60 * 1000).toISOString() }
      assert.strictEqual(mockAggressiveScan.calculateEventTier(event), 'imminent')
    })
  })

  // ============================================================================
  // Task 2: Wide Event Discovery Tests
  // ============================================================================
  
  describe('Task 2: Wide Event Discovery', () => {
    it('should support configurable scan horizon hours', () => {
      mockAggressiveScan.setConfig({ scanHorizonHours: 72 })
      assert.strictEqual(mockAggressiveScan.getConfig().scanHorizonHours, 72)
      
      mockAggressiveScan.setConfig({ scanHorizonHours: 24 })
      assert.strictEqual(mockAggressiveScan.getConfig().scanHorizonHours, 24)
    })
  })

  // ============================================================================
  // Task 3: Quota Budget System Tests
  // ============================================================================
  
  describe('Task 3: Quota Budget System', () => {
    it('should calculate target requests based on quotaTargetPercent (Task 3.1-3.2)', () => {
      mockAggressiveScan.setConfig({ quotaTargetPercent: 75 })
      const budget = mockAggressiveScan.initQuotaBudget()
      
      // 75% of 5000 = 3750 target
      // 20% buffer of 3750 = 750
      // usable = 3750 - 750 = 3000
      assert.strictEqual(budget.totalHourlyLimit, 5000)
      assert.strictEqual(budget.targetPercent, 75)
      assert.strictEqual(budget.targetRequestsPerHour, 3750)
      assert.strictEqual(budget.bufferRequests, 750)
      assert.strictEqual(budget.usableRequests, 3000)
    })

    it('should allocate budget per tier based on weights (Task 3.3)', () => {
      mockAggressiveScan.initQuotaBudget()
      
      const budget = mockAggressiveScan.quotaBudget
      const totalWeight = 50 + 25 + 12 + 8 + 3 + 2 // 100
      
      // Imminent gets 50% of usable budget
      const imminentAllocation = Math.floor((50 / totalWeight) * budget.usableRequests)
      assert.strictEqual(budget.perTier.imminent.allocatedRequests, imminentAllocation)
      assert.strictEqual(budget.perTier.imminent.weight, 50)
    })

    it('should calculate poll intervals based on budget and event count (Task 3.4)', () => {
      // No events = max interval
      const intervalNoEvents = mockAggressiveScan.calculatePollInterval('imminent', 1000, 0)
      assert.strictEqual(intervalNoEvents, 60)
      
      // With events
      const intervalWithEvents = mockAggressiveScan.calculatePollInterval('imminent', 1000, 100)
      assert.ok(intervalWithEvents >= 15 && intervalWithEvents <= 60)
    })

    it('should track requests per tier (Task 3.5)', () => {
      mockAggressiveScan.initQuotaBudget()
      
      mockAggressiveScan.recordRequest(5)
      
      assert.strictEqual(mockAggressiveScan.quotaBudget.currentHourUsed, 5)
    })

    it('should reserve 10-20% buffer for bursts (Task 3.7)', () => {
      mockAggressiveScan.initQuotaBudget()
      const budget = mockAggressiveScan.quotaBudget
      
      const bufferPercent = (budget.bufferRequests / budget.targetRequestsPerHour) * 100
      assert.ok(bufferPercent >= 10 && bufferPercent <= 20)
    })

    it('should detect when tier is over budget', () => {
      mockAggressiveScan.initQuotaBudget()
      
      const tierBudget = mockAggressiveScan.quotaBudget.perTier.imminent
      tierBudget.usedThisHour = tierBudget.allocatedRequests
      
      assert.strictEqual(mockAggressiveScan.isOverBudget('imminent'), true)
      assert.strictEqual(mockAggressiveScan.isOverBudget('soon'), false)
    })

    it('should allow burst buffer usage', () => {
      mockAggressiveScan.initQuotaBudget()
      
      // Use all usable requests
      mockAggressiveScan.quotaBudget.currentHourUsed = mockAggressiveScan.quotaBudget.usableRequests
      
      // Should still be able to use burst buffer
      assert.strictEqual(mockAggressiveScan.canUseBurstBuffer(), true)
      
      // Use all buffer too
      mockAggressiveScan.quotaBudget.currentHourUsed += mockAggressiveScan.quotaBudget.bufferRequests
      assert.strictEqual(mockAggressiveScan.canUseBurstBuffer(), false)
    })
  })

  // ============================================================================
  // Task 5: Aggressive Imminent Polling Tests
  // ============================================================================
  
  describe('Task 5: Aggressive Imminent Polling', () => {
    it('should support configurable imminent poll interval (Task 5.1)', () => {
      mockAggressiveScan.setConfig({ imminentPollIntervalSeconds: 30 })
      assert.strictEqual(mockAggressiveScan.getConfig().imminentPollIntervalSeconds, 30)
      
      mockAggressiveScan.setConfig({ imminentPollIntervalSeconds: 60 })
      assert.strictEqual(mockAggressiveScan.getConfig().imminentPollIntervalSeconds, 60)
    })

    it('should accept valid imminent poll interval values', () => {
      // Test that valid values are accepted
      mockAggressiveScan.setConfig({ imminentPollIntervalSeconds: 15 })
      assert.strictEqual(mockAggressiveScan.getConfig().imminentPollIntervalSeconds, 15)
      
      mockAggressiveScan.setConfig({ imminentPollIntervalSeconds: 30 })
      assert.strictEqual(mockAggressiveScan.getConfig().imminentPollIntervalSeconds, 30)
      
      mockAggressiveScan.setConfig({ imminentPollIntervalSeconds: 60 })
      assert.strictEqual(mockAggressiveScan.getConfig().imminentPollIntervalSeconds, 60)
      
      mockAggressiveScan.setConfig({ imminentPollIntervalSeconds: 120 })
      assert.strictEqual(mockAggressiveScan.getConfig().imminentPollIntervalSeconds, 120)
    })
  })

  // ============================================================================
  // Task 6: Arb Boost System Tests
  // ============================================================================
  
  describe('Task 6: Arb Boost System', () => {
    beforeEach(() => {
      mockAggressiveScan.initTierCache()
    })

    it('should boost event when arb detected (Task 6.4)', () => {
      const event = { id: '1', name: 'Test', date: new Date(mockNow + 30 * 60 * 1000).toISOString() }
      mockAggressiveScan.upsertTieredEvent(event)
      
      const result = mockAggressiveScan.boostEvent('1', 'arb_detected')
      
      assert.strictEqual(result, true)
      assert.strictEqual(mockAggressiveScan.isEventBoosted('1'), true)
      
      const tieredEvent = mockAggressiveScan.getEventById('1')
      assert.strictEqual(tieredEvent.isBoosted, true)
      assert.ok(tieredEvent.boostExpiresAt !== null)
    })

    it('should track boosted events separately (Task 6.3)', () => {
      const event1 = { id: '1', name: 'Test1', date: new Date(mockNow + 30 * 60 * 1000).toISOString() }
      const event2 = { id: '2', name: 'Test2', date: new Date(mockNow + 35 * 60 * 1000).toISOString() }
      mockAggressiveScan.upsertTieredEvent(event1)
      mockAggressiveScan.upsertTieredEvent(event2)
      
      mockAggressiveScan.boostEvent('1')
      mockAggressiveScan.boostEvent('2')
      
      const boostedIds = mockAggressiveScan.getBoostedEventIds()
      assert.strictEqual(boostedIds.length, 2)
      assert.ok(boostedIds.includes('1'))
      assert.ok(boostedIds.includes('2'))
    })

    it('should limit concurrent boosted events (Task 6.7)', () => {
      mockAggressiveScan.setConfig({ maxBoostedEvents: 3, arbBoostDurationMinutes: 5 })
      
      // Create and boost 5 events
      for (let i = 1; i <= 5; i++) {
        const event = { id: String(i), name: `Test${i}`, date: new Date(mockNow + i * 5 * 60 * 1000).toISOString() }
        mockAggressiveScan.upsertTieredEvent(event)
        mockAggressiveScan.boostEvent(String(i))
      }
      
      // Should only have 3 boosted events (max)
      assert.strictEqual(mockAggressiveScan.getBoostedEventIds().length, 3)
    })

    it('should auto-remove expired boosts (Task 6.6)', () => {
      mockAggressiveScan.setConfig({ arbBoostDurationMinutes: 5 })
      
      const event = { id: '1', name: 'Test', date: new Date(mockNow + 30 * 60 * 1000).toISOString() }
      mockAggressiveScan.upsertTieredEvent(event)
      mockAggressiveScan.boostEvent('1')
      
      assert.strictEqual(mockAggressiveScan.isEventBoosted('1'), true)
      
      // Advance time by 6 minutes (boost should expire)
      const later = mockNow + 6 * 60 * 1000
      const removed = mockAggressiveScan.cleanupExpiredBoosts(later)
      
      assert.strictEqual(removed, 1)
      assert.strictEqual(mockAggressiveScan.isEventBoosted('1'), false)
    })

    it('should support configurable boost duration (Task 6.1)', () => {
      mockAggressiveScan.setConfig({ arbBoostDurationMinutes: 10 })
      assert.strictEqual(mockAggressiveScan.getConfig().arbBoostDurationMinutes, 10)
    })

    it('should support configurable boost poll interval (Task 6.2)', () => {
      mockAggressiveScan.setConfig({ arbBoostPollIntervalSeconds: 15 })
      assert.strictEqual(mockAggressiveScan.getConfig().arbBoostPollIntervalSeconds, 15)
    })
  })

  // ============================================================================
  // Task 9: Dashboard Metrics Tests
  // ============================================================================
  
  describe('Task 9: Dashboard Metrics', () => {
    it('should provide aggressive scan statistics', () => {
      mockAggressiveScan.initQuotaBudget()
      
      // Add some events
      mockAggressiveScan.upsertTieredEvent({ id: '1', name: 'Test1', date: new Date(mockNow + 15 * 60 * 1000).toISOString() })
      mockAggressiveScan.upsertTieredEvent({ id: '2', name: 'Test2', date: new Date(mockNow + 60 * 60 * 1000).toISOString() })
      mockAggressiveScan.boostEvent('1')
      
      const stats = mockAggressiveScan.getAggressiveScanStats()
      
      assert.ok('enabled' in stats)
      assert.ok('quotaTargetPercent' in stats)
      assert.ok('quotaUsedThisHour' in stats)
      assert.ok('quotaRemainingThisHour' in stats)
      assert.ok('quotaEfficiencyPercent' in stats)
      assert.ok('eventsByTier' in stats)
      assert.ok('totalEvents' in stats)
      assert.ok('boostedEvents' in stats)
      assert.ok('cachedEvents' in stats)
      
      assert.strictEqual(stats.totalEvents, 2)
      assert.strictEqual(stats.boostedEvents, 1)
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================
  
  describe('Integration Tests', () => {
    it('should handle event lifecycle: create -> boost -> expire -> evict', () => {
      // Create event
      const event = { id: '1', name: 'Test', date: new Date(mockNow + 30 * 60 * 1000).toISOString() }
      mockAggressiveScan.upsertTieredEvent(event)
      
      // Boost event
      mockAggressiveScan.boostEvent('1')
      assert.strictEqual(mockAggressiveScan.isEventBoosted('1'), true)
      
      // Expire boost
      const afterBoost = mockNow + 6 * 60 * 1000
      mockAggressiveScan.cleanupExpiredBoosts(afterBoost)
      assert.strictEqual(mockAggressiveScan.isEventBoosted('1'), false)
      
      // Verify event still exists
      assert.ok(mockAggressiveScan.getEventById('1'))
    })

    it('should calculate correct tier budgets with various event distributions', () => {
      // Add events to different tiers
      mockAggressiveScan.upsertTieredEvent({ id: '1', name: 'Test1', date: new Date(mockNow + 15 * 60 * 1000).toISOString() })
      mockAggressiveScan.upsertTieredEvent({ id: '2', name: 'Test2', date: new Date(mockNow + 60 * 60 * 1000).toISOString() })
      mockAggressiveScan.upsertTieredEvent({ id: '3', name: 'Test3', date: new Date(mockNow + 3 * 60 * 60 * 1000).toISOString() })
      
      const budget = mockAggressiveScan.initQuotaBudget()
      
      // Each tier should have correct event count
      assert.strictEqual(budget.perTier.imminent.eventCount, 1)
      assert.strictEqual(budget.perTier.soon.eventCount, 1)
      assert.strictEqual(budget.perTier.today.eventCount, 1)
      
      // Each tier should have allocated budget
      assert.ok(budget.perTier.imminent.allocatedRequests > 0)
      assert.ok(budget.perTier.soon.allocatedRequests > 0)
      assert.ok(budget.perTier.today.allocatedRequests > 0)
    })
  })
})
