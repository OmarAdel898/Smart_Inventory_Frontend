import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  PencilLine,
  RefreshCw,
  Shield,
  User,
  UserRound,
  UserSquare2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { profileApi, type ProfileResponse } from '@/api/profile.api';
import { useAuthStore } from '@/store/authStore';

type ProfileFormState = {
  name: string;
  phone: string;
  location: string;
  bio: string;
  avatarUrl: string;
};

function formatDate(value?: string): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatRole(role: string): string {
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getInitials(name: string | null, email: string): string {
  const source = (name || email).trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function fieldValue(value: string | null | undefined): string {
  return value && value.trim() ? value : 'Not set';
}

function toNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function ProfileField({
  label,
  value,
  editable = false,
  icon,
  children,
}: {
  label: string;
  value?: string;
  editable?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/60 bg-surface/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-on-surface-variant">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-2 ${editable ? 'text-sm' : 'text-base font-medium'} text-on-surface`}>{children ?? value}</div>
    </div>
  );
}

export default function Profile() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const updateAuthUser = useAuthStore((s) => s.updateUser);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    name: '',
    phone: '',
    location: '',
    bio: '',
    avatarUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const loadProfile = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const data = await profileApi.getMe();
      if (signal?.aborted) return;

      setProfile(data);
      updateAuthUser({
        name: data.name,
        avatarUrl: data.avatarUrl,
      });
      setForm({
        name: data.name || '',
        phone: data.phone || '',
        location: data.location || '',
        bio: data.bio || '',
        avatarUrl: data.avatarUrl || '',
      });
      setPreviewUrl(data.avatarUrl || null);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : 'Unable to load profile.');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadProfile(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const isDirty = useMemo(() => {
    if (!profile) return false;
    return (
      form.name.trim() !== (profile.name || '').trim() ||
      form.phone.trim() !== (profile.phone || '').trim() ||
      form.location.trim() !== (profile.location || '').trim() ||
      form.bio.trim() !== (profile.bio || '').trim() ||
      form.avatarUrl.trim() !== (profile.avatarUrl || '').trim()
    );
  }, [form, profile]);

  const displayedAvatarUrl = previewUrl || form.avatarUrl || profile?.avatarUrl || null;
  const displayedName = form.name || profile?.name || profile?.username || 'Profile';
  const initials = getInitials(form.name || profile?.name || null, profile?.email || 'SS');

  const handleAvatarPick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarError(null);
    setSaveMessage(null);
    setUploadingAvatar(true);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current?.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }
      return objectUrl;
    });

    try {
      const avatarUrl = await profileApi.uploadAvatar(file);

      if (avatarUrl) {
        setForm((current) => ({
          ...current,
          avatarUrl,
        }));

        setProfile((current) =>
          current
            ? {
                ...current,
                avatarUrl,
              }
            : current,
        );
        updateAuthUser({ avatarUrl });

        setPreviewUrl(avatarUrl);
      }

      setSaveMessage('Avatar uploaded successfully.');
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(profile?.avatarUrl || null);
      setAvatarError(err instanceof Error ? err.message : 'Unable to upload avatar.');
    } finally {
      event.target.value = '';
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const updated = await profileApi.updateMe({
        name: toNullable(form.name),
        phone: toNullable(form.phone),
        location: toNullable(form.location),
        bio: toNullable(form.bio),
        avatarUrl: toNullable(form.avatarUrl),
      });

      setProfile(updated);
      updateAuthUser({
        name: updated.name,
        avatarUrl: updated.avatarUrl,
      });
      setForm({
        name: updated.name || '',
        phone: updated.phone || '',
        location: updated.location || '',
        bio: updated.bio || '',
        avatarUrl: updated.avatarUrl || '',
      });
      setPreviewUrl(updated.avatarUrl || null);
      setSaveMessage('Profile saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <p className="font-medium text-on-surface">Loading profile...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <div className="text-center max-w-md">
          <p className="font-medium text-on-surface">Unable to load profile</p>
          <p className="text-sm">{error}</p>
        </div>
        <Button variant="outline" onClick={() => loadProfile()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-20 right-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-24 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-accent">Account Settings</p>
            <h1 className="text-3xl font-semibold tracking-tight text-on-surface">Profile</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Update your account details, avatar, and personal information.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-outline-variant/70 bg-surface/80 px-4 py-3 shadow-sm backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Shield className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                  Signed in as
                </p>
                <p className="text-base font-semibold text-on-surface">{profile?.username}</p>
              </div>
            </div>
          </div>
        </div>

        {(saveMessage || avatarError || error) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
              error
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {error || avatarError || saveMessage}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] gap-6 items-start">
          <Card className="overflow-hidden border-outline-variant/60 shadow-sm bg-surface/85 backdrop-blur-xl">
            <CardHeader className="border-b border-outline-variant/50 bg-gradient-to-r from-surface via-surface-container-lowest to-surface">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-xl text-on-surface">Profile details</CardTitle>
                  <CardDescription>Keep your public and contact details up to date.</CardDescription>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-outline-variant/60 bg-white/70 px-3 py-1.5 text-xs font-medium text-on-surface-variant shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {isDirty ? 'Unsaved changes' : 'All changes saved'}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="rounded-[28px] border border-white/50 bg-gradient-to-br from-slate-50 via-white to-accent/5 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative">
                        <div className="h-28 w-28 overflow-hidden rounded-full border border-outline-variant/60 bg-surface shadow-lg">
                          {displayedAvatarUrl ? (
                            <img
                              src={displayedAvatarUrl}
                              alt="Profile avatar"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy to-accent text-2xl font-semibold text-white">
                              {initials}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleAvatarPick}
                          disabled={uploadingAvatar}
                          className="absolute -bottom-1 -right-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white bg-surface text-on-surface shadow-lg transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        </button>
                      </div>

                      <div className="mt-4">
                        <p className="text-lg font-semibold text-on-surface">{displayedName}</p>
                        <p className="text-sm text-on-surface-variant">{profile?.email}</p>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />

                      <div className="mt-5 flex w-full flex-col gap-2">
                        <Button type="button" variant="outline" onClick={handleAvatarPick} disabled={uploadingAvatar} className="gap-2">
                          <PencilLine className="h-4 w-4" />
                          {uploadingAvatar ? 'Uploading...' : 'Change avatar'}
                        </Button>
                        <p className="text-[11px] leading-5 text-on-surface-variant">
                          JPG, PNG, or WebP. The image is uploaded directly to the backend.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                        placeholder="Enter your name"
                        className="mt-2 h-11 rounded-xl border-outline-variant/70 bg-surface/80"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
                        placeholder="Enter phone number"
                        className="mt-2 h-11 rounded-xl border-outline-variant/70 bg-surface/80"
                      />
                    </div>

                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={form.location}
                        onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))}
                        placeholder="Enter location"
                        className="mt-2 h-11 rounded-xl border-outline-variant/70 bg-surface/80"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label htmlFor="bio">Bio</Label>
                      <textarea
                        id="bio"
                        value={form.bio}
                        onChange={(e) => setForm((current) => ({ ...current, bio: e.target.value }))}
                        placeholder="Write a short bio about yourself"
                        rows={5}
                        className="mt-2 flex w-full rounded-xl border border-outline-variant/70 bg-surface/80 px-3 py-2 text-sm text-on-surface shadow-sm outline-none transition-colors placeholder:text-on-surface-variant focus:border-accent focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-on-surface-variant">
                    Changes are saved to your user profile and synced with the backend.
                  </p>
                  <Button type="submit" className="gap-2 bg-navy hover:bg-navy/90" disabled={saving || uploadingAvatar || !isDirty}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
                    {saving ? 'Saving...' : 'Save changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="overflow-hidden border-outline-variant/60 shadow-sm bg-white/70 backdrop-blur-xl">
              <CardHeader className="border-b border-outline-variant/50 bg-surface">
                <CardTitle className="text-xl text-on-surface">Account summary</CardTitle>
                <CardDescription>Read-only details from your account record.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <ProfileField label="Role" icon={<Shield className="h-4 w-4" />} value={formatRole(profile?.role || '')} />
                <ProfileField label="Email" icon={<Mail className="h-4 w-4" />} value={profile?.email || ''} />
                <ProfileField label="Username" icon={<UserSquare2 className="h-4 w-4" />} value={profile?.username || ''} />
                <ProfileField label="Location" icon={<MapPin className="h-4 w-4" />} value={fieldValue(profile?.location)} />
                <ProfileField label="Phone" icon={<User className="h-4 w-4" />} value={fieldValue(profile?.phone)} />
              </CardContent>
            </Card>

            <Card className="border-outline-variant/60 shadow-sm bg-gradient-to-br from-accent/10 via-surface to-surface-container-lowest backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent shadow-sm">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-on-surface">Profile activity</h3>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Created {formatDate(profile?.createdAt)} and last updated {formatDate(profile?.updatedAt)}.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
