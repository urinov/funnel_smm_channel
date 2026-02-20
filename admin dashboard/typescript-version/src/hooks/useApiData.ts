'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

interface UseApiDataOptions<T> {
  initialData?: T
  autoFetch?: boolean
  refreshInterval?: number
}

interface UseApiDataResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useApiData<T>(
  fetchFn: () => Promise<{ data: T; error?: string }>,
  options: UseApiDataOptions<T> = {}
): UseApiDataResult<T> {
  const { initialData = null, autoFetch = true, refreshInterval } = options

  const [data, setData] = useState<T | null>(initialData)
  const [loading, setLoading] = useState(autoFetch)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetchFn()
      if (result.error) {
        setError(result.error)
      } else {
        setData(result.data)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [fetchFn])

  useEffect(() => {
    if (autoFetch) {
      fetch()
    }
  }, [autoFetch, fetch])

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetch, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval, fetch])

  return { data, loading, error, refetch: fetch }
}

// Specific hooks for common data

export function useStats() {
  return useApiData(() => api.getStats(), {
    refreshInterval: 30000, // Refresh every 30 seconds
  })
}

export function useUsers() {
  return useApiData(() => api.getUsers())
}

export function useUser(telegramId: string) {
  return useApiData(
    () => api.getUser(telegramId),
    { autoFetch: !!telegramId }
  )
}

export function useConversations() {
  return useApiData(() => api.getConversations(), {
    refreshInterval: 10000, // Refresh every 10 seconds for real-time feel
  })
}

export function useLessons() {
  return useApiData(() => api.getLessons())
}

export function useCustdevQuestions() {
  return useApiData(() => api.getCustdevQuestions())
}

export function usePitch() {
  return useApiData(() => api.getPitch())
}

export function useSubscriptionPlans() {
  return useApiData(() => api.getSubscriptionPlans())
}

export function usePromoCodes() {
  return useApiData(() => api.getPromoCodes())
}

export function useFunnels() {
  return useApiData(() => api.getFunnels())
}

export function useFunnel(id: number) {
  return useApiData(
    () => api.getFunnel(id),
    { autoFetch: id > 0 }
  )
}

export function useSettings() {
  return useApiData(() => api.getSettings())
}

export function useAnalytics(type: 'subscriptions' | 'buyers' | 'sources' | 'segments' | 'referrals') {
  return useApiData(() => api.getAnalytics(type))
}

export function useAuditLogs(limit = 50, offset = 0) {
  return useApiData(() => api.getAuditLogs({ limit, offset }))
}

// Mutation hooks

export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData; error?: string }>
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (variables: TVariables) => {
      setLoading(true)
      setError(null)

      try {
        const result = await mutationFn(variables)
        if (result.error) {
          setError(result.error)
          return { success: false, error: result.error }
        }
        return { success: true, data: result.data }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error'
        setError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setLoading(false)
      }
    },
    [mutationFn]
  )

  return { mutate, loading, error }
}

export default useApiData
