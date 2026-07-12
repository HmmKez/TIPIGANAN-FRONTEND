import { apiOrigin } from '../api/axios'

// A relative storage path ("avatars/xyz.jpg") resolves against the Vite dev
// server's own origin, not the Laravel backend — always build the full URL
// through apiOrigin, same as category cover images.
export function avatarUrl(user) {
  if (!user?.avatar_path) return null
  return `${apiOrigin}/storage/${user.avatar_path}`
}
