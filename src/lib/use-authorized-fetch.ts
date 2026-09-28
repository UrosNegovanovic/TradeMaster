'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback } from 'react'
import { authorizedFetch, type SessionFetch } from '@/lib/authorized-fetch'

/** Clerk `getToken` bound to `authorizedFetch` for same-origin mutations. */
export function useAuthorizedFetch(): SessionFetch {
  const { getToken } = useAuth()
  return useCallback(
    (input: RequestInfo | URL, init?: RequestInit) => authorizedFetch(input, init ?? {}, getToken),
    [getToken]
  )
}
