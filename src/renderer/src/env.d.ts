/// <reference types="vite/client" />
import type { BuhoStudioApi } from '@shared/types'

declare global {
  interface Window {
    buho: BuhoStudioApi
  }
}
