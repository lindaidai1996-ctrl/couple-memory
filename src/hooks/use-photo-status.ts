'use client'

import { useReducer, useEffect, useRef } from 'react'

type PhotoStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'

interface Photo {
  id: string
  status: PhotoStatus
  [key: string]: unknown
}

export interface UsePhotoStatusReturn {
  photo: Photo | null
  loading: boolean
  error: string | null
}

const POLL_INTERVAL = 3000
const TERMINAL_STATUSES: PhotoStatus[] = ['READY', 'FAILED']

type State = UsePhotoStatusReturn

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; photo: Photo }
  | { type: 'FETCH_ERROR'; error: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { photo: null, loading: true, error: null }
    case 'FETCH_SUCCESS':
      return { photo: action.photo, loading: false, error: null }
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error }
  }
}

const INITIAL_STATE: State = { photo: null, loading: false, error: null }

export function usePhotoStatus(coupleId: string, photoId: string): UsePhotoStatusReturn {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!coupleId || !photoId) return

    const controller = new AbortController()
    dispatch({ type: 'FETCH_START' })

    const poll = async () => {
      try {
        const res = await fetch(`/api/couples/${coupleId}/photos/${photoId}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`请求失败: ${res.status}`)

        const data: Photo = await res.json()
        dispatch({ type: 'FETCH_SUCCESS', photo: data })

        if (!TERMINAL_STATUSES.includes(data.status)) {
          timerRef.current = setTimeout(poll, POLL_INTERVAL)
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        dispatch({ type: 'FETCH_ERROR', error: (err as Error).message })
        timerRef.current = setTimeout(poll, POLL_INTERVAL)
      }
    }

    poll()

    return () => {
      controller.abort()
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [coupleId, photoId])

  if (!coupleId || !photoId) {
    return INITIAL_STATE
  }

  return state
}
