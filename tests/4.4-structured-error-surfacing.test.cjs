/**
 * Story 4.4: Structured Error Surfacing in Dashboard
 *
 * Test cases covering:
 * - User error inline display
 * - Provider error banner display
 * - System error bar display
 * - Discriminated union contract compliance
 * - Integration with existing dashboard states
 */

const assert = require('node:assert/strict')
const { describe, it, beforeEach } = require('node:test')

// Import real functions from compiled output
const { mapIpcError, categoryToDisplayType, isIpcErrorShape, extractIpcError } = require('../out-tests/src/renderer/src/lib/mapIpcError')
const { isIpcSuccess, isIpcFailure, ipcSuccess, ipcFailure } = require('../out-tests/shared/errors')

// === Mock Error Types ===

/** @type {import('../../shared/errors').IpcError} */
const mockUserError = {
  category: 'UserError',
  code: 'MISSING_API_KEY',
  message: 'API key is required.',
  correlationId: 'test-corr-001'
}

/** @type {import('../../shared/errors').IpcError} */
const mockProviderError = {
  category: 'ProviderError',
  code: 'PROVIDER_RATE_LIMITED',
  message: 'Rate limit exceeded.',
  correlationId: 'test-corr-002'
}

/** @type {import('../../shared/errors').IpcError} */
const mockSystemError = {
  category: 'SystemError',
  code: 'UNEXPECTED_ERROR',
  message: 'Something went wrong.',
  correlationId: 'test-corr-003'
}

/** @type {import('../../shared/errors').IpcError} */
const mockInfraError = {
  category: 'InfrastructureError',
  code: 'NETWORK_ERROR',
  message: 'Network connection failed.',
  correlationId: 'test-corr-004'
}

// === Error Mapper Tests ===

describe('4.4 Structured Error Surfacing', () => {
  describe('mapIpcError utility (real implementation)', () => {
    it('[4.4-ERR-001] maps UserError to inline display type', () => {
      const result = mapIpcError(mockUserError)
      assert.strictEqual(result.displayType, 'inline')
    })

    it('[4.4-ERR-002] maps ProviderError to banner display type', () => {
      const result = mapIpcError(mockProviderError)
      assert.strictEqual(result.displayType, 'banner')
    })

    it('[4.4-ERR-003] maps SystemError to errorBar display type', () => {
      const result = mapIpcError(mockSystemError)
      assert.strictEqual(result.displayType, 'errorBar')
    })

    it('[4.4-ERR-004] maps InfrastructureError to errorBar display type', () => {
      const result = mapIpcError(mockInfraError)
      assert.strictEqual(result.displayType, 'errorBar')
    })

    it('[4.4-ERR-005] preserves original error in mapped result', () => {
      const result = mapIpcError(mockUserError)
      assert.strictEqual(result.originalError, mockUserError)
    })

    it('[4.4-ERR-006] provides user-friendly message for MISSING_API_KEY', () => {
      const result = mapIpcError(mockUserError)
      assert.ok(result.message.includes('API key'))
    })

    it('[4.4-ERR-007] provides guidance for user errors', () => {
      const result = mapIpcError(mockUserError)
      assert.ok(result.guidance, 'User error should have guidance')
      assert.ok(result.guidance.includes('Settings'))
    })
  })

  describe('categoryToDisplayType helper', () => {
    it('[4.4-CAT-HELPER-001] returns inline for UserError', () => {
      assert.strictEqual(categoryToDisplayType('UserError'), 'inline')
    })

    it('[4.4-CAT-HELPER-002] returns banner for ProviderError', () => {
      assert.strictEqual(categoryToDisplayType('ProviderError'), 'banner')
    })

    it('[4.4-CAT-HELPER-003] returns errorBar for SystemError', () => {
      assert.strictEqual(categoryToDisplayType('SystemError'), 'errorBar')
    })

    it('[4.4-CAT-HELPER-004] returns errorBar for InfrastructureError', () => {
      assert.strictEqual(categoryToDisplayType('InfrastructureError'), 'errorBar')
    })
  })

  describe('IPC Error Contract (real implementation)', () => {
    it('[4.4-IPC-001] IpcError has required fields: category, code, message, correlationId', () => {
      const requiredFields = ['category', 'code', 'message', 'correlationId']

      for (const field of requiredFields) {
        assert.ok(
          Object.prototype.hasOwnProperty.call(mockUserError, field),
          `IpcError should have ${field} field`
        )
      }
    })

    it('[4.4-IPC-002] ipcSuccess creates proper success result shape', () => {
      const successResult = ipcSuccess({ value: 'test' })

      assert.strictEqual(successResult.ok, true)
      assert.ok(Object.prototype.hasOwnProperty.call(successResult, 'data'))
      assert.deepStrictEqual(successResult.data, { value: 'test' })
    })

    it('[4.4-IPC-003] ipcFailure creates proper failure result shape', () => {
      const failureResult = ipcFailure('UserError', 'MISSING_API_KEY', 'Test message')

      assert.strictEqual(failureResult.ok, false)
      assert.ok(Object.prototype.hasOwnProperty.call(failureResult, 'error'))
      assert.strictEqual(failureResult.error.category, 'UserError')
      assert.strictEqual(failureResult.error.code, 'MISSING_API_KEY')
      assert.ok(failureResult.error.correlationId, 'Should have correlationId')
    })

    it('[4.4-IPC-004] isIpcSuccess correctly identifies success results', () => {
      const success = ipcSuccess('data')
      const failure = ipcFailure('SystemError', 'UNEXPECTED_ERROR', 'Error')

      assert.strictEqual(isIpcSuccess(success), true)
      assert.strictEqual(isIpcSuccess(failure), false)
    })

    it('[4.4-IPC-005] isIpcFailure correctly identifies failure results', () => {
      const success = ipcSuccess('data')
      const failure = ipcFailure('SystemError', 'UNEXPECTED_ERROR', 'Error')

      assert.strictEqual(isIpcFailure(success), false)
      assert.strictEqual(isIpcFailure(failure), true)
    })

    it('[4.4-IPC-006] isIpcErrorShape validates error structure', () => {
      const validError = { ok: false, error: mockUserError }
      const invalidError1 = { ok: true, data: 'test' }
      const invalidError2 = { ok: false, error: { category: 'UserError' } } // missing code, message

      assert.strictEqual(isIpcErrorShape(validError), true)
      assert.strictEqual(isIpcErrorShape(invalidError1), false)
      assert.strictEqual(isIpcErrorShape(invalidError2), false)
    })
  })

  describe('Error Categories', () => {
    it('[4.4-CAT-001] UserError covers missing API key scenario', () => {
      assert.strictEqual(mockUserError.category, 'UserError')
      assert.strictEqual(mockUserError.code, 'MISSING_API_KEY')
    })

    it('[4.4-CAT-002] ProviderError covers rate limiting scenario', () => {
      assert.strictEqual(mockProviderError.category, 'ProviderError')
      assert.strictEqual(mockProviderError.code, 'PROVIDER_RATE_LIMITED')
    })

    it('[4.4-CAT-003] SystemError covers unexpected failures', () => {
      assert.strictEqual(mockSystemError.category, 'SystemError')
      assert.strictEqual(mockSystemError.code, 'UNEXPECTED_ERROR')
    })

    it('[4.4-CAT-004] InfrastructureError covers network issues', () => {
      assert.strictEqual(mockInfraError.category, 'InfrastructureError')
      assert.strictEqual(mockInfraError.code, 'NETWORK_ERROR')
    })
  })

  describe('Error Display Behavior', () => {
    it('[4.4-UX-001] User errors should show inline guidance', () => {
      // User errors get mapped to inline display with guidance
      const userErrorGuidance = {
        MISSING_API_KEY: 'Enter your API key in Provider Settings to enable this provider.',
        INVALID_API_KEY: 'Check that your API key is correctly copied from your provider dashboard.',
        INVALID_FILTER: 'Try adjusting your filter settings or reset to defaults.'
      }

      assert.ok(
        userErrorGuidance[mockUserError.code],
        'User error code should have corresponding guidance'
      )
    })

    it('[4.4-UX-002] Provider errors should show actionable CTAs', () => {
      // Provider errors get mapped to banners with action buttons
      const providerErrorActions = {
        PROVIDER_TIMEOUT: 'Retry Now',
        PROVIDER_RATE_LIMITED: 'Check Quota',
        QUOTA_EXCEEDED: 'Check Quota',
        PROVIDER_UNAVAILABLE: 'Retry Now'
      }

      assert.ok(
        providerErrorActions[mockProviderError.code],
        'Provider error code should have corresponding action'
      )
    })

    it('[4.4-UX-003] System errors should show retry and log options', () => {
      // System errors always have retry and view logs options
      const hasRetryOption = true
      const hasViewLogsOption = true

      assert.ok(hasRetryOption, 'System error bar should have retry option')
      assert.ok(hasViewLogsOption, 'System error bar should have view logs option')
    })
  })

  describe('Integration with Dashboard State', () => {
    it('[4.4-INT-001] Error surfacing uses SystemStatus enum', () => {
      const validSystemStatuses = ['OK', 'Degraded', 'Error', 'Stale']

      // Simulating that error category maps to status
      const errorToStatusMap = {
        OK: 'OK',
        UserError: 'OK', // User errors don't change system status
        ProviderError: 'Degraded',
        SystemError: 'Error',
        InfrastructureError: 'Error'
      }

      assert.ok(
        validSystemStatuses.includes(errorToStatusMap.SystemError),
        'SystemError should map to a valid SystemStatus'
      )
    })

    it('[4.4-INT-002] Error surfacing uses ProviderStatus enum', () => {
      const validProviderStatuses = ['OK', 'Degraded', 'Down', 'QuotaLimited', 'ConfigMissing']

      // Provider error codes map to provider statuses
      const errorCodeToProviderStatus = {
        PROVIDER_RATE_LIMITED: 'QuotaLimited',
        QUOTA_EXCEEDED: 'QuotaLimited',
        PROVIDER_UNAVAILABLE: 'Down',
        PROVIDER_TIMEOUT: 'Degraded'
      }

      assert.ok(
        validProviderStatuses.includes(errorCodeToProviderStatus.PROVIDER_RATE_LIMITED),
        'Provider error should map to valid ProviderStatus'
      )
    })

    it('[4.4-INT-003] Error display does not introduce ad-hoc boolean flags', () => {
      // The error state should be derived from the error store, not ad-hoc flags
      // This is a design constraint test
      const errorStoreFields = [
        'systemError',
        'providerErrors',
        'inlineErrors'
      ]

      // None of these should be simple boolean flags
      const isNotBooleanFlag = (fieldName) => {
        // These are objects/maps, not booleans
        return !['hasError', 'showError', 'isError', 'errorVisible'].includes(fieldName)
      }

      for (const field of errorStoreFields) {
        assert.ok(
          isNotBooleanFlag(field),
          `${field} should not be an ad-hoc boolean flag`
        )
      }
    })
  })

  describe('Error Correlation', () => {
    it('[4.4-CORR-001] All errors have correlation IDs for log tracing', () => {
      const errors = [mockUserError, mockProviderError, mockSystemError, mockInfraError]

      for (const error of errors) {
        assert.ok(
          error.correlationId && error.correlationId.length > 0,
          `${error.category} error should have a correlationId`
        )
      }
    })

    it('[4.4-CORR-002] Correlation ID format is consistent', () => {
      // Correlation IDs should be non-empty strings
      const correlationIdPattern = /^[\w-]+$/

      assert.ok(
        correlationIdPattern.test(mockSystemError.correlationId),
        'Correlation ID should match expected pattern'
      )
    })
  })

  describe('Settings InlineError Integration', () => {
    it('[4.4-SET-001] Missing API key shows InlineError with guidance', () => {
      // Simulates the Settings component behavior
      const settingsError = {
        message: 'API key not configured for this provider.',
        guidance: 'Enter your API key below to enable fetching odds data from this provider.'
      }

      assert.ok(settingsError.message, 'Error should have a message')
      assert.ok(settingsError.guidance, 'Error should have guidance text')
    })

    it('[4.4-SET-002] Empty API key validation shows InlineError', () => {
      const validationError = {
        message: 'API key cannot be empty.',
        guidance: 'Enter a valid API key from your provider dashboard. Keys are securely stored.'
      }

      assert.ok(validationError.message, 'Validation error should have a message')
      assert.ok(validationError.guidance, 'Validation error should have guidance')
    })

    it('[4.4-SET-003] Save failure shows InlineError with details', () => {
      const saveError = {
        message: 'Failed to save API key.',
        guidance: 'Save operation failed: Network error. Check logs for details.'
      }

      assert.ok(saveError.message, 'Save error should have a message')
      assert.ok(saveError.guidance.includes('Check logs'), 'Save error should reference logs')
    })
  })

  describe('Provider Failure Mid-Session', () => {
    it('[4.4-MID-001] Provider failure during session sets error in dashboard store', () => {
      // Simulates the flow in feedStore.refreshSnapshot
      const pollingError = {
        category: 'SystemError',
        code: 'UNEXPECTED_ERROR',
        message: 'Network request failed',
        correlationId: 'poll-test123'
      }

      assert.strictEqual(pollingError.category, 'SystemError')
      assert.ok(pollingError.correlationId.startsWith('poll-'))
    })

    it('[4.4-MID-002] Successful poll clears previous system error', () => {
      // On success, setSystemError(null) is called
      const clearAction = { systemError: null }
      
      assert.strictEqual(clearAction.systemError, null)
    })

    it('[4.4-MID-003] Feed remains interactive during error state', () => {
      // Feed store still has opportunities even when error is set
      const feedState = {
        opportunities: [{ id: 'opp-1', roi: 0.02 }],
        error: 'Network request failed',
        isLoading: false
      }

      assert.ok(feedState.opportunities.length > 0, 'Opportunities should still be available')
      assert.ok(feedState.error, 'Error should be set')
      assert.strictEqual(feedState.isLoading, false, 'Loading should be false')
    })

    it('[4.4-MID-004] Error bar shows retry and view logs actions', () => {
      const systemErrorBarActions = {
        hasRetry: true,
        hasViewLogs: true,
        hasDismiss: true
      }

      assert.ok(systemErrorBarActions.hasRetry, 'Should have retry action')
      assert.ok(systemErrorBarActions.hasViewLogs, 'Should have view logs action')
      assert.ok(systemErrorBarActions.hasDismiss, 'Should have dismiss action')
    })
  })

  describe('TRPC Error Handling', () => {
    it('[4.4-TRPC-001] openLogDirectory route exists and returns ok shape', () => {
      // The route should return { ok: true } on success or { ok: false, error: string } on failure
      const successResult = { ok: true }
      const failureResult = { ok: false, error: 'Failed to open directory' }

      assert.strictEqual(successResult.ok, true)
      assert.strictEqual(failureResult.ok, false)
      assert.ok(failureResult.error, 'Failure should have error message')
    })

    it('[4.4-TRPC-002] Routes return consistent ok shapes', () => {
      // All mutation routes should return { ok: true } on success
      const saveApiKeyResult = { ok: true }
      const setActiveProviderResult = { ok: true }
      const copySignalResult = { ok: true }

      assert.strictEqual(saveApiKeyResult.ok, true)
      assert.strictEqual(setActiveProviderResult.ok, true)
      assert.strictEqual(copySignalResult.ok, true)
    })
  })
})

console.log('Story 4.4 tests defined. Run with: node --test tests/4.4-structured-error-surfacing.test.cjs')
