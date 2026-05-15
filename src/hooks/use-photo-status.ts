'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type PhotoStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'

interface Photo {
  id: string
  status: PhotoStatus
  [key: string]: unknown
}

interface UsePhotoStatusReturn {
  photo: Photo | null
  loading: boolean
  error: string | null
}

const POLL_INTERVAL = 3000
const TERMINAL_STATUSES: PhotoStatus[] = ['READY', 'FAILED']

export function usePhotoStatus(coupleId: string, photoId: string): UsePhotoStatusReturn {
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const fetchStatus = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`/api/couples/${coupleId}/photos/${photoId}`, {
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`请求失败: ${res.status}`)

      const data: Photo = await res.json()
      setPhoto(data)
      setError(null)

      if (TERMINAL_STATUSES.includes(data.status)) {
        clearTimer()
        return
      }

      timerRef.current = setTimeout(fetchStatus, POLL_INTERVAL)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError((err as Error).message)
      timerRef.current = setTimeout(fetchStatus, POLL_INTERVAL)
    }
  }, [coupleId, photoId, clearTimer])

  useEffect(() => {
    if (!coupleId || !photoId) {
      setPhoto(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    fetchStatus().finally(() => setLoading(false))

    return () => {
      clearTimer()
      abortRef.current?.abort()
    }
  }, [coupleId, photoId, fetchStatus, clearTimer])

  return { photo, loading, error }
}
