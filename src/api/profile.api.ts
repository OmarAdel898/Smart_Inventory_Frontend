import { requestJson, requestMultipart } from './_shared';

export interface ProfileResponse {
  id: string;
  name: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: string;
  email: string;
  username: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfilePayload {
  name: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

function unwrapProfile(value: unknown): ProfileResponse {
  if (value && typeof value === 'object' && 'data' in value) {
    return ((value as { data?: ProfileResponse }).data ?? value) as ProfileResponse;
  }

  return value as ProfileResponse;
}

function resolveAvatarUrl(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const candidates = [record.avatarUrl, record.url, record.path, record.location];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate;
      }
    }

    if ('data' in record && record.data) {
      return resolveAvatarUrl(record.data);
    }
  }

  return null;
}

export const profileApi = {
  getMe: async () => unwrapProfile(await requestJson<unknown>('/users/me')),
  updateMe: async (payload: UpdateProfilePayload) =>
    unwrapProfile(
      await requestJson<unknown>('/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    ),
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await requestMultipart<unknown>('/uploads/avatar', formData);
    return resolveAvatarUrl(response);
  },
};
