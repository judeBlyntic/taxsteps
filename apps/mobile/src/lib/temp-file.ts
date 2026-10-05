/** Runs `fn` and always deletes the temporary photo afterwards — even if `fn` fails early. */
export async function withTempFile<T>(uri: string, discard: (uri: string) => void, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } finally {
    discard(uri)
  }
}
