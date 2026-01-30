import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { ArbitrageOpportunity } from '../../../../../../shared/types'

export type CalculatorMode = 'totalStake' | 'targetProfit'
export type CalculatorDisplayMode = 'inline' | 'modal'

export interface CalculationHistoryEntry {
  id: string
  timestamp: string
  eventName: string
  marketType: string
  bookmakerA: string
  bookmakerB: string
  oddsA: number
  oddsB: number
  stakeA: number
  stakeB: number
  totalStake: number
  profit: number
  roi: number
}

interface CalculatorState {
  // Visibility
  isOpen: boolean
  displayMode: CalculatorDisplayMode

  // Selected opportunity
  opportunity: ArbitrageOpportunity | null

  // Calculator mode
  mode: CalculatorMode

  // Inputs
  totalStake: string
  targetProfit: string
  stakeA: string
  stakeB: string

  // Calculated outputs
  calculatedStakeA: number
  calculatedStakeB: number
  totalInvestment: number
  profit: number
  roi: number

  // History (persisted)
  history: CalculationHistoryEntry[]

  // Actions
  openCalculator: (opportunity: ArbitrageOpportunity) => void
  closeCalculator: () => void
  setDisplayMode: (mode: CalculatorDisplayMode) => void
  setMode: (mode: CalculatorMode) => void
  setTotalStake: (value: string) => void
  setTargetProfit: (value: string) => void
  setStakeA: (value: string) => void
  setStakeB: (value: string) => void
  calculateFromTotalStake: () => void
  calculateFromTargetProfit: () => void
  calculateFromStakeA: () => void
  calculateFromStakeB: () => void
  addToHistory: () => void
  clearHistory: () => void
  loadFromHistory: (entry: CalculationHistoryEntry) => void
  removeHistoryEntry: (id: string) => void
}

const MAX_HISTORY_ENTRIES = 20

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function calculateStakesFromTotal(
  totalStake: number,
  oddsA: number,
  oddsB: number
): { stakeA: number; stakeB: number } {
  const probA = 1 / oddsA
  const probB = 1 / oddsB
  const totalProb = probA + probB

  return {
    stakeA: (totalStake * probA) / totalProb,
    stakeB: (totalStake * probB) / totalProb
  }
}

export function calculateStakesFromTargetProfit(
  targetProfit: number,
  oddsA: number,
  oddsB: number
): { stakeA: number; stakeB: number; totalStake: number } {
  // For pure arbitrage: stakeA * oddsA - totalStake = targetProfit
  // stakeA * oddsA - (stakeA + stakeB) = targetProfit
  // stakeA * (oddsA - 1) - stakeB = targetProfit
  // stakeB = stakeA * (oddsB - 1) - targetProfit
  //
  // Using proportional allocation:
  // stakeA / stakeB = (1/oddsA) / (1/oddsB) = oddsB / oddsA
  // stakeB = stakeA * oddsA / oddsB
  //
  // Substituting:
  // stakeA * (oddsA - 1) - stakeA * oddsA / oddsB = targetProfit
  // stakeA * [(oddsA - 1) - oddsA / oddsB] = targetProfit

  const termA = oddsA - 1 - oddsA / oddsB
  const stakeA = targetProfit / termA
  const stakeB = stakeA * (oddsA / oddsB)
  const totalStake = stakeA + stakeB

  return { stakeA, stakeB, totalStake }
}

export function calculateProfit(
  stakeA: number,
  stakeB: number,
  oddsA: number,
  oddsB: number
): number {
  const totalStake = stakeA + stakeB
  const returnA = stakeA * oddsA
  const returnB = stakeB * oddsB

  // Both should be equal in pure arbitrage, but take average for safety
  const profitA = returnA - totalStake
  const profitB = returnB - totalStake
  return (profitA + profitB) / 2
}

export function calculateRoi(profit: number, totalStake: number): number {
  if (totalStake === 0) return 0
  return profit / totalStake
}

export function isOpportunityStale(opportunity: ArbitrageOpportunity): boolean {
  const foundAt = new Date(opportunity.foundAt).getTime()
  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000
  return now - foundAt > fiveMinutes
}

export function getStalenessMinutes(opportunity: ArbitrageOpportunity): number {
  const foundAt = new Date(opportunity.foundAt).getTime()
  const now = Date.now()
  return Math.floor((now - foundAt) / (60 * 1000))
}

export const useCalculatorStore = create<CalculatorState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      displayMode: 'inline',
      opportunity: null,
      mode: 'totalStake',
      totalStake: '',
      targetProfit: '',
      stakeA: '',
      stakeB: '',
      calculatedStakeA: 0,
      calculatedStakeB: 0,
      totalInvestment: 0,
      profit: 0,
      roi: 0,
      history: [],

      openCalculator: (opportunity: ArbitrageOpportunity) => {
        set({
          isOpen: true,
          opportunity,
          totalStake: '',
          targetProfit: '',
          stakeA: '',
          stakeB: '',
          calculatedStakeA: 0,
          calculatedStakeB: 0,
          totalInvestment: 0,
          profit: 0,
          roi: opportunity.roi
        })
      },

      closeCalculator: () => {
        set({ isOpen: false })
      },

      setDisplayMode: (mode: CalculatorDisplayMode) => {
        set({ displayMode: mode })
      },

      setMode: (mode: CalculatorMode) => {
        set({ mode })
        // Recalculate based on new mode
        if (mode === 'totalStake') {
          get().calculateFromTotalStake()
        } else {
          get().calculateFromTargetProfit()
        }
      },

      setTotalStake: (value: string) => {
        set({ totalStake: value })
        get().calculateFromTotalStake()
      },

      setTargetProfit: (value: string) => {
        set({ targetProfit: value })
        get().calculateFromTargetProfit()
      },

      setStakeA: (value: string) => {
        set({ stakeA: value })
        get().calculateFromStakeA()
      },

      setStakeB: (value: string) => {
        set({ stakeB: value })
        get().calculateFromStakeB()
      },

      calculateFromTotalStake: () => {
        const { opportunity, totalStake, mode } = get()
        if (!opportunity || mode !== 'totalStake') return

        const total = parseFloat(totalStake)
        if (isNaN(total) || total <= 0) {
          set({
            calculatedStakeA: 0,
            calculatedStakeB: 0,
            totalInvestment: 0,
            profit: 0
          })
          return
        }

        const oddsA = opportunity.legs[0].odds
        const oddsB = opportunity.legs[1].odds

        const { stakeA, stakeB } = calculateStakesFromTotal(total, oddsA, oddsB)
        const profit = calculateProfit(stakeA, stakeB, oddsA, oddsB)
        const roi = calculateRoi(profit, total)

        set({
          calculatedStakeA: stakeA,
          calculatedStakeB: stakeB,
          totalInvestment: total,
          profit,
          roi
        })
      },

      calculateFromTargetProfit: () => {
        const { opportunity, targetProfit, mode } = get()
        if (!opportunity || mode !== 'targetProfit') return

        const target = parseFloat(targetProfit)
        if (isNaN(target) || target <= 0) {
          set({
            calculatedStakeA: 0,
            calculatedStakeB: 0,
            totalInvestment: 0,
            profit: 0
          })
          return
        }

        const oddsA = opportunity.legs[0].odds
        const oddsB = opportunity.legs[1].odds

        const { stakeA, stakeB, totalStake } = calculateStakesFromTargetProfit(
          target,
          oddsA,
          oddsB
        )
        const profit = calculateProfit(stakeA, stakeB, oddsA, oddsB)
        const roi = calculateRoi(profit, totalStake)

        set({
          calculatedStakeA: stakeA,
          calculatedStakeB: stakeB,
          totalInvestment: totalStake,
          profit,
          roi
        })
      },

      calculateFromStakeA: () => {
        const { opportunity, stakeA, mode } = get()
        if (!opportunity || mode !== 'totalStake') return

        const stakeAValue = parseFloat(stakeA)
        if (isNaN(stakeAValue) || stakeAValue <= 0) {
          set({
            calculatedStakeA: 0,
            calculatedStakeB: 0,
            totalInvestment: 0,
            profit: 0
          })
          return
        }

        const oddsA = opportunity.legs[0].odds
        const oddsB = opportunity.legs[1].odds

        // Calculate stakeB to ensure equal profit
        // stakeA * oddsA = stakeB * oddsB
        // stakeB = stakeA * oddsA / oddsB
        const stakeBValue = (stakeAValue * oddsA) / oddsB
        const totalStake = stakeAValue + stakeBValue
        const profit = calculateProfit(stakeAValue, stakeBValue, oddsA, oddsB)
        const roi = calculateRoi(profit, totalStake)

        set({
          calculatedStakeA: stakeAValue,
          calculatedStakeB: stakeBValue,
          totalInvestment: totalStake,
          profit,
          roi
        })
      },

      calculateFromStakeB: () => {
        const { opportunity, stakeB, mode } = get()
        if (!opportunity || mode !== 'totalStake') return

        const stakeBValue = parseFloat(stakeB)
        if (isNaN(stakeBValue) || stakeBValue <= 0) {
          set({
            calculatedStakeA: 0,
            calculatedStakeB: 0,
            totalInvestment: 0,
            profit: 0
          })
          return
        }

        const oddsA = opportunity.legs[0].odds
        const oddsB = opportunity.legs[1].odds

        // Calculate stakeA to ensure equal profit
        // stakeA * oddsA = stakeB * oddsB
        // stakeA = stakeB * oddsB / oddsA
        const stakeAValue = (stakeBValue * oddsB) / oddsA
        const totalStake = stakeAValue + stakeBValue
        const profit = calculateProfit(stakeAValue, stakeBValue, oddsA, oddsB)
        const roi = calculateRoi(profit, totalStake)

        set({
          calculatedStakeA: stakeAValue,
          calculatedStakeB: stakeBValue,
          totalInvestment: totalStake,
          profit,
          roi
        })
      },

      addToHistory: () => {
        const { opportunity, calculatedStakeA, calculatedStakeB, totalInvestment, profit, roi } =
          get()

        if (!opportunity || totalInvestment <= 0) return

        const entry: CalculationHistoryEntry = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          eventName: opportunity.event.name,
          marketType: opportunity.legs[0].market,
          bookmakerA: opportunity.legs[0].bookmaker,
          bookmakerB: opportunity.legs[1].bookmaker,
          oddsA: opportunity.legs[0].odds,
          oddsB: opportunity.legs[1].odds,
          stakeA: calculatedStakeA,
          stakeB: calculatedStakeB,
          totalStake: totalInvestment,
          profit,
          roi
        }

        set((state) => {
          const newHistory = [entry, ...state.history].slice(0, MAX_HISTORY_ENTRIES)
          return { history: newHistory }
        })
      },

      clearHistory: () => {
        set({ history: [] })
      },

      loadFromHistory: (entry: CalculationHistoryEntry) => {
        set({
          totalStake: entry.totalStake.toFixed(2),
          targetProfit: entry.profit.toFixed(2),
          calculatedStakeA: entry.stakeA,
          calculatedStakeB: entry.stakeB,
          totalInvestment: entry.totalStake,
          profit: entry.profit,
          roi: entry.roi
        })
      },

      removeHistoryEntry: (id: string) => {
        set((state) => ({
          history: state.history.filter((entry) => entry.id !== id)
        }))
      }
    }),
    {
      name: 'calculator-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        history: state.history,
        displayMode: state.displayMode
      })
    }
  )
)
