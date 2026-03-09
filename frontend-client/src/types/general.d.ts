type BaseModelType = {
  id: string
  date_created: string
  last_updated: string
}

type ApiListResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

type API_CALL_STATUS_TYPES = 'idle' | 'loading' | 'succeeded' | 'failed' | 'saving' | 'saved'
