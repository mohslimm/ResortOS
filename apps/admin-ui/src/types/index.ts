export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading'; message?: string }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string; retry?: () => void }
  | { status: 'empty'; cta?: string };
