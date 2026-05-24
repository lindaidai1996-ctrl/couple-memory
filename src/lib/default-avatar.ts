const DEFAULT_AVATAR_PATHS = [
  '/avatars/default/avatar-01.svg',
  '/avatars/default/avatar-02.svg',
  '/avatars/default/avatar-03.svg',
] as const

function normalizeSeed(seed: string | null | undefined) {
  return (seed ?? '').trim().toLowerCase()
}

export function getDefaultAvatarPath(seed: string | null | undefined) {
  const normalized = normalizeSeed(seed)
  if (!normalized) return DEFAULT_AVATAR_PATHS[0]

  let total = 0
  for (const char of normalized) {
    total += char.charCodeAt(0)
  }

  return DEFAULT_AVATAR_PATHS[total % DEFAULT_AVATAR_PATHS.length]
}

export function resolveUserAvatarUrl(input: {
  avatar: string | null
  email: string | null | undefined
  name: string | null | undefined
}) {
  const avatar = input.avatar?.trim()
  if (avatar) return avatar

  return getDefaultAvatarPath(input.email || input.name || '')
}

export { DEFAULT_AVATAR_PATHS }
