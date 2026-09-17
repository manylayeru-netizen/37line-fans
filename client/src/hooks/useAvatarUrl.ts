import { useAuthStore } from '@client/src/store/auth.store';

export function getAvatarUrl(
  avatarUrl: string | undefined | null,
  version?: number,
): string | undefined {
  if (!avatarUrl) return undefined;
  if (!version) return avatarUrl;
  const separator = avatarUrl.includes('?') ? '&' : '?';
  return `${avatarUrl}${separator}v=${version}`;
}

export function useAvatarUrl(avatarUrl?: string | null): string | undefined {
  const avatarVersion = useAuthStore((s) => s.avatarVersion);
  return getAvatarUrl(avatarUrl ?? undefined, avatarVersion);
}
