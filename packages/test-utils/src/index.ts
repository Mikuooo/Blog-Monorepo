export type Deferred<T> = {
  promise: Promise<T>
  reject: (reason?: unknown) => void
  resolve: (value: T | PromiseLike<T>) => void
}

export function deferred<T>(): Deferred<T> {
  let resolvePromise: Deferred<T>['resolve'] = () => undefined
  let rejectPromise: Deferred<T>['reject'] = () => undefined
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })
  return { promise, reject: rejectPromise, resolve: resolvePromise }
}
