import { API_BASE, requestJson } from './_shared';
import { createAuthHeaders, getAccessTokenFromCookie } from '@/lib/auth';

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

function normalizeAvatarUrl(value: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${API_BASE}${value}`;
  return `${API_BASE}/${value}`;
}

function normalizeProfile(profile: ProfileResponse): ProfileResponse {
  return {
    ...profile,
    avatarUrl: normalizeAvatarUrl(profile.avatarUrl),
  };
}

async function parseUploadBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => null);
}

export const profileApi = {
  getMe: async () => normalizeProfile(unwrapProfile(await requestJson<unknown>('/users/me'))),
  updateMe: async (payload: UpdateProfilePayload) =>
    normalizeProfile(
      unwrapProfile(
        await requestJson<unknown>('/users/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      ),
    ),
  uploadAvatar: async (file: File) => {
    const fieldNames = ['file', 'avatar', 'image'];
    let lastError = 'Unable to upload avatar.';

    for (const fieldName of fieldNames) {
      const formData = new FormData();
      formData.append(fieldName, file, file.name);

      const token = getAccessTokenFromCookie();
      const response = await fetch(`${API_BASE}/uploads/avatar`, {
        method: 'POST',
        headers: token ? createAuthHeaders(token) : {},
        body: formData,
      });

      const body = await parseUploadBody(response);

      if (response.ok) {
        return normalizeAvatarUrl(resolveAvatarUrl(body) ?? (typeof body === 'string' ? body : null));
      }

      const message =
        (typeof body === 'string' && body.trim()) ||
        (body && typeof body === 'object'
          ? (body as { meta?: { message?: string }; message?: string; error?: string }).meta?.message ||
            (body as { message?: string }).message ||
            (body as { error?: string }).error
          : null) ||
        `Request failed (${response.status})`;

      lastError = Array.isArray(message) ? message.join(', ') : message;

      if (response.status !== 400 && response.status !== 422) {
        break;
      }
    }

    throw new Error(lastError);
  },
};
