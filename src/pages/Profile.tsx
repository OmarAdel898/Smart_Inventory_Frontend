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
  CreditCard,
  Zap,
  Download,
  Calendar,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { profileApi, type ProfileResponse } from '@/api/profile.api';
import { tenantApi, type TenantResponse } from '@/api/tenant.api';
import { billingApi, type BillingPortalData } from '@/api/billing.api';
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
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-2 ${editable ? 'text-[14px]' : 'text-[15px] font-bold'} text-gray-900`}>{children ?? value}</div>
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
  const handleCustomerPortal = async () => {
    if (!profile?.tenantId) return;
    setBillingLoading(true);
    try {
      const result = await api.post<any>('/stripe/customer-portal', {
        tenantId: profile.tenantId,
        returnUrl: window.location.origin + '/profile?tab=billing',
      });
      if (result && result.url) {
        window.location.href = result.url;
      }
    } catch (e) {
      console.error(e);
      alert('Failed to access customer portal.');
    } finally {
      setBillingLoading(false);
    }
  };
  const [activeTab, setActiveTab] = useState<'profile' | 'billing'>('profile');
  const [plans, setPlans] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [tenant, setTenant] = useState<TenantResponse | null>(null);
  const [billingData, setBillingData] = useState<BillingPortalData | null>(null);
  const [billingInfoLoading, setBillingInfoLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const loadPlans = async () => {
    try {
      const data = await api.get<any[]>('/public/plans');
      if (data && data.length > 0) setPlans(data);
    } catch (e) {
      console.error('Failed to load plans', e);
    }
  };

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

  const loadTenant = async (tenantId: string) => {
    try {
      const data = await tenantApi.getTenant(tenantId);
      setTenant(data);
    } catch (e) {
      console.error('Failed to load tenant', e);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadProfile(controller.signal);
    void loadPlans();
    
    // Check for checkout redirect
    const searchParams = new URLSearchParams(window.location.search);
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success') {
      setCheckoutSuccess(true);
      setActiveTab('billing');
      setSaveMessage('Subscription updated successfully. It may take a moment to reflect here.');
      // Remove query param from URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (checkoutStatus === 'cancel') {
      setActiveTab('billing');
      setError('Checkout was cancelled.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (profile?.role === 'tenant' && profile.tenantId) {
      let isSubscribed = true;

      const fetchTenant = async (retryCount = 0) => {
        try {
          const data = await tenantApi.getTenant(profile.tenantId!);
          if (!isSubscribed) return;
          
          setTenant(data);

          // If we just came from a successful checkout, and the status is not active yet, poll a few times
          if (checkoutSuccess && data.subscriptionStatus !== 'active' && retryCount < 5) {
            setTimeout(() => {
              if (isSubscribed) fetchTenant(retryCount + 1);
            }, 2000);
          }
        } catch (e) {
          console.error('Failed to load tenant', e);
        }
      };

      void fetchTenant();
      
      return () => {
        isSubscribed = false;
      };
    }
  }, [profile?.tenantId, profile?.role, checkoutSuccess]);

  useEffect(() => {
    const tenantId = profile?.tenantId;
    if (activeTab === 'billing' && tenantId) {
      const loadBillingInfo = async () => {
        setBillingInfoLoading(true);
        try {
          const data = await billingApi.getBillingInfo(tenantId);
          setBillingData(data);
        } catch (e) {
          console.error('Failed to load billing info', e);
        } finally {
          setBillingInfoLoading(false);
        }
      };
      void loadBillingInfo();
    }
  }, [activeTab, profile?.tenantId]);

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

  const handleUpgrade = async (planId: string) => {
    if (!profile?.tenantId) {
      alert("No tenant associated with your account.");
      return;
    }
    setBillingLoading(true);
    try {
      const result = await api.post<any>('/stripe/checkout-session', {
        tenantId: profile.tenantId,
        planId: planId,
        successUrl: window.location.origin + '/profile?checkout=success',
        cancelUrl: window.location.origin + '/profile?checkout=cancel',
      });
      if (result && result.url) {
        window.location.href = result.url;
      }
    } catch (e) {
      console.error(e);
      alert('Failed to start checkout session. Ensure Stripe is properly configured.');
    } finally {
      setBillingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin text-[#0066CC]" />
        <p className="font-medium text-gray-900">Loading profile...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-4 text-gray-500">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <div className="text-center max-w-md">
          <p className="font-medium text-gray-900">Unable to load profile</p>
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-2">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">Account Settings</p>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight tracking-tight">Profile</h1>
          <p className="mt-1 text-[15px] text-gray-500">
            Update your account details, avatar, and personal information.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full font-bold bg-[#E6F4FF] text-[#0066CC]">
              <Shield className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Signed in as
              </p>
              <p className="text-[15px] font-bold text-gray-900">{profile?.username}</p>
            </div>
          </div>
        </div>
      </div>

      {(saveMessage || avatarError || error) && (
        <div
          className={`rounded-xl border px-4 py-3 text-[14px] font-medium shadow-sm flex items-center gap-2 ${
            error || avatarError
              ? 'border-[#B30024]/20 bg-[#FFD9DF] text-[#B30024]'
              : 'border-[#008A00]/20 bg-[#E6FFE6] text-[#008A00]'
          }`}
        >
          {error || avatarError ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          {error || avatarError || saveMessage}
        </div>
      )}

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'profile' ? 'border-[#0066CC] text-[#0066CC]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Profile Details
        </button>
        {profile?.role === 'tenant' && (
          <button
            onClick={() => setActiveTab('billing')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'billing' ? 'border-[#0066CC] text-[#0066CC]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Billing & Plans
          </button>
        )}
      </div>

      {activeTab === 'profile' && (
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] gap-6 items-start">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-[18px] font-bold text-gray-900">Profile details</h2>
                <p className="text-[13px] text-gray-500 mt-1">Keep your public and contact details up to date.</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-bold text-gray-600 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-[#008A00]" />
                {isDirty ? 'Unsaved changes' : 'All changes saved'}
              </div>
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-gray-50 shadow-sm">
                      {displayedAvatarUrl ? (
                        <img
                          src={displayedAvatarUrl}
                          alt="Profile avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#E6F4FF] text-[#0066CC] text-3xl font-black">
                          {initials}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleAvatarPick}
                      disabled={uploadingAvatar}
                      className="absolute -bottom-1 -right-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="mt-4">
                    <p className="text-[18px] font-bold text-gray-900">{displayedName}</p>
                    <p className="text-[13px] font-medium text-gray-500">{profile?.email}</p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />

                  <div className="mt-6 flex w-full flex-col gap-2">
                    <button type="button" onClick={handleAvatarPick} disabled={uploadingAvatar} className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-all w-full">
                      <PencilLine className="h-4 w-4" />
                      {uploadingAvatar ? 'Uploading...' : 'Change avatar'}
                    </button>
                    <p className="text-[11px] font-medium text-gray-400 mt-2">
                      JPG, PNG, or WebP.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="name" className="block text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Name</label>
                    <input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                      placeholder="Enter your name"
                      className="w-full px-3 py-2 text-[14px] font-medium text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#E6F4FF] transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Phone</label>
                    <input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
                      placeholder="Enter phone number"
                      className="w-full px-3 py-2 text-[14px] font-medium text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#E6F4FF] transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Location</label>
                    <input
                      id="location"
                      value={form.location}
                      onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))}
                      placeholder="Enter location"
                      className="w-full px-3 py-2 text-[14px] font-medium text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#E6F4FF] transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="bio" className="block text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Bio</label>
                    <textarea
                      id="bio"
                      value={form.bio}
                      onChange={(e) => setForm((current) => ({ ...current, bio: e.target.value }))}
                      placeholder="Write a short bio about yourself"
                      rows={5}
                      className="w-full px-3 py-2 text-[14px] font-medium text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#0066CC] focus:ring-2 focus:ring-[#E6F4FF] transition-all resize-y"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-6 border-t border-gray-100">
                <p className="text-[13px] font-medium text-gray-500">
                  Changes are saved to your user profile and synced with the backend.
                </p>
                <button type="submit" disabled={saving || uploadingAvatar || !isDirty} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold text-[#0066CC] bg-[#E6F4FF] hover:bg-[#D0E9FF] shadow-sm transition-all disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserRound className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50/50 p-5">
              <h2 className="text-[16px] font-bold text-gray-900">Account summary</h2>
              <p className="text-[12px] font-medium text-gray-500 mt-0.5">Read-only details from your account record.</p>
            </div>
            <div className="p-5 space-y-4">
              <ProfileField label="Role" icon={<Shield className="h-4 w-4" />} value={formatRole(profile?.role || '')} />
              <ProfileField label="Email" icon={<Mail className="h-4 w-4" />} value={profile?.email || ''} />
              <ProfileField label="Username" icon={<UserSquare2 className="h-4 w-4" />} value={profile?.username || ''} />
              <ProfileField label="Location" icon={<MapPin className="h-4 w-4" />} value={fieldValue(profile?.location)} />
              <ProfileField label="Phone" icon={<User className="h-4 w-4" />} value={fieldValue(profile?.phone)} />
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full font-bold bg-[#E6F4FF] text-[#0066CC] shadow-sm shrink-0">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-gray-900">Profile activity</h3>
                <p className="mt-1 text-[13px] font-medium text-gray-500 leading-relaxed">
                  Created {formatDate(profile?.createdAt)} and last updated {formatDate(profile?.updatedAt)}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-6 max-w-4xl">
          {tenant?.subscriptionStatus === 'active' || (tenant?.subscriptionStatus === 'trialing' && tenant?.planId) ? (
            <>
              {/* Current Subscription Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Current subscription</h2>
                    <div className="flex gap-3">
                      <Button onClick={handleCustomerPortal} disabled={billingLoading} variant="outline" className="font-bold rounded-lg border-gray-200">Change</Button>
                    </div>
                  </div>
                  
                  {billingData?.nextPaymentDate && (
                    <p className="text-[14px] text-gray-600 mb-6">
                      Your account is billed monthly and the next payment is due to <span className="font-bold text-gray-900">{formatDate(billingData.nextPaymentDate)}</span>.
                    </p>
                  )}

                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                          <th className="px-6 py-4">Selected Plan</th>
                          <th className="px-6 py-4">Price</th>
                          <th className="px-6 py-4">Limits</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="px-6 py-5">
                            <span className="font-bold text-gray-900">{tenant?.plan?.name || 'Premium'}</span>
                          </td>
                          <td className="px-6 py-5 font-bold text-gray-900">
                            ${tenant?.plan?.price || 99}/month
                          </td>
                          <td className="px-6 py-5 text-gray-600 font-medium">
                            Based on Plan
                          </td>
                          <td className="px-6 py-5">
                            {tenant?.subscriptionStatus === 'trialing' ? (
                               <span className="bg-[#FFF5E6] text-[#CC7A00] px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase inline-flex items-center gap-1 border border-[#CC7A00]/20">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Trialing
                                </span>
                            ) : (
                               <span className="bg-[#E6FFE6] text-[#008A00] px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase inline-flex items-center gap-1 border border-[#008A00]/20">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Active
                                </span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Credit Card Details */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Credit card details</h2>
                    <Button onClick={handleCustomerPortal} disabled={billingLoading} variant="outline" className="font-bold rounded-lg border-gray-200">Update</Button>
                  </div>
                  
                  {billingInfoLoading ? (
                    <div className="py-4 flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading payment details...
                    </div>
                  ) : billingData?.paymentMethod ? (
                    <div className="space-y-4 max-w-md">
                      <div className="flex justify-between py-3 border-b border-gray-100">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500 w-40">Cardholder Name</span>
                        <span className="font-bold text-gray-900">{profile?.name || profile?.username}</span>
                      </div>
                      <div className="flex justify-between py-3 border-b border-gray-100">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500 w-40">Card Number</span>
                        <span className="font-bold text-gray-900 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <span className="capitalize">{billingData.paymentMethod.brand}</span> •••• {billingData.paymentMethod.last4}
                        </span>
                      </div>
                      <div className="flex justify-between py-3 border-b border-gray-100">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500 w-40">Expiration Date</span>
                        <span className="font-bold text-gray-900">{billingData.paymentMethod.expMonth}/{billingData.paymentMethod.expYear}</span>
                      </div>
                      <div className="flex justify-between py-3">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500 w-40">Billing Email</span>
                        <span className="font-bold text-gray-900">{profile?.email}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 py-4 font-medium">No payment method on file.</div>
                  )}
                </div>
              </div>

              {/* History */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">History</h2>
                  
                  {billingInfoLoading ? (
                    <div className="py-8 flex justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#0066CC]" />
                    </div>
                  ) : billingData?.history && billingData.history.length > 0 ? (
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Item</th>
                            <th className="px-6 py-4">Download</th>
                            <th className="px-6 py-4 text-right">Charge</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {billingData.history.map((invoice) => (
                            <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-gray-900">
                                {formatDate(invoice.date)}
                              </td>
                              <td className="px-6 py-4 text-gray-600 font-medium">
                                {tenant?.plan?.name || 'Premium'} - Monthly plan
                              </td>
                              <td className="px-6 py-4">
                                {invoice.invoicePdf && invoice.invoicePdf !== '#' ? (
                                  <a href={invoice.invoicePdf} target="_blank" rel="noreferrer" className="text-[#0066CC] hover:underline font-bold text-sm inline-flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" />
                                    Invoice.pdf
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-sm font-medium inline-flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" />
                                    Invoice.pdf
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-bold text-gray-900 text-right">
                                ${(invoice.amount / 100).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500 font-medium border border-dashed border-gray-200 rounded-xl">
                      No billing history available.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {tenant?.subscriptionStatus === 'trialing' && !tenant?.planId && (
                <div className="bg-gradient-to-r from-[#001A40] to-[#003380] text-white rounded-xl p-8 shadow-md mb-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-white/20 p-3 rounded-full">
                      <Zap className="w-6 h-6 text-[#FFD700]" />
                    </div>
                    <h2 className="text-2xl font-bold">14-Day Free Trial Active</h2>
                  </div>
                  <p className="text-white/80 text-lg mb-6 max-w-2xl">
                    You are currently enjoying full access to all features! Your trial expires on 
                    <span className="font-bold text-white ml-1">
                      {tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString() : 'soon'}
                    </span>. 
                    Please select a plan below to ensure uninterrupted access when your trial ends.
                  </p>
                </div>
              )}

              {/* Plans Section */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscription Plans</h2>
                  <p className="text-gray-500">Upgrade your plan to unlock more features and higher limits.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <div key={plan.id} className={`rounded-2xl p-6 flex flex-col relative border ${plan.isPopular ? 'border-[#0066CC] bg-[#F5FAFF]' : 'border-gray-200 bg-white'}`}>
                      {plan.isPopular && (
                        <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-[#0066CC] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          Most Popular
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                      <p className="text-sm text-gray-500 mb-6 flex-1">{plan.description}</p>
                      
                      <div className="mb-6">
                        {plan.price !== null ? (
                          <>
                            <span className="text-4xl font-extrabold text-gray-900">${plan.price}</span>
                            <span className="text-gray-500 font-medium">/mo</span>
                          </>
                        ) : (
                          <span className="text-4xl font-extrabold text-gray-900">Custom</span>
                        )}
                      </div>

                      <button 
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={billingLoading || plan.price === null}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
                          plan.isPopular 
                            ? 'bg-[#0066CC] hover:bg-[#0052a3] text-white' 
                            : (plan.price === null ? 'bg-gray-100 text-gray-500' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50')
                        }`}
                      >
                        {billingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        {plan.price === null ? 'Contact Sales' : 'Upgrade'}
                      </button>
                      
                      <div className="space-y-3 mt-6 pt-6 border-t border-gray-100">
                        {plan.features?.map((feature: string, i: number) => (
                          <div key={i} className="flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0066CC]" />
                            <span className="text-sm font-medium text-gray-600">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
