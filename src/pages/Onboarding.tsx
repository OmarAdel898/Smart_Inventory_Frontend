import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/api/client';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Company Profile
  const [companyName, setCompanyName] = useState(user?.name ? `${user.name}'s Organization` : '');
  const [industry, setIndustry] = useState('');
  const [phonePrefix, setPhonePrefix] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState('');

  // Step 2: Warehouse Setup
  const [warehouseName, setWarehouseName] = useState('');
  const [warehouseLocation, setWarehouseLocation] = useState('');

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleFinalize = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Create Warehouse
      const warehouseRes = await api.post<{ id: string }>('/warehouses', {
        name: warehouseName,
        location: warehouseLocation,
        isMain: true,
      });

      const fullPhone = `${phonePrefix} ${phoneNumber}`;

      // 2a. Update profile fields (phone + location) via /users/me
      await api.patch('/users/me', {
        phone: fullPhone,
        location: location,
      });

      // 2b. Link the new warehouse to the user via /users/:id (admin update)
      await api.patch(`/users/${user?.id}`, {
        warehouseId: warehouseRes.id,
      });

      // 3. Update Tenant Name
      if (user?.tenantId) {
        await api.patch(`/tenants/${user.tenantId}`, {
          name: companyName,
        });
      }

      // Update local state
      updateUser({
        warehouseId: warehouseRes.id,
        phone: fullPhone,
        location,
      });

      // Redirect to dashboard
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to complete setup');
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 antialiased">
        <div className="w-full max-w-lg bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-[#0066CC] mb-2">StockSavvy</h1>
            <p className="text-sm text-gray-500 mb-6">Set up your enterprise workspace.</p>
            <div className="flex items-center justify-between gap-2 w-full max-w-[200px] mx-auto mb-2">
              <div className="h-1 flex-1 bg-[#0066CC] rounded-full"></div>
              <div className="h-1 flex-1 bg-gray-100 rounded-full"></div>
              <div className="h-1 flex-1 bg-gray-100 rounded-full"></div>
            </div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Step 1 of 3: Company Profile</p>
          </div>
          <hr className="border-t border-gray-200 mb-6" />
          <form onSubmit={handleStep1Submit} className="space-y-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-900" htmlFor="companyName">Company Name</label>
              <input
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-outline focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                id="companyName" placeholder="Acme Corp" type="text" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-900" htmlFor="industry">Industry</label>
              <div className="relative">
                <select
                  required
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full appearance-none rounded border border-gray-200 bg-white pl-4 pr-10 py-2 text-sm text-gray-900 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                  id="industry">
                  <option disabled value="">Select an industry</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="retail">Retail & E-commerce</option>
                  <option value="logistics">Logistics & Supply Chain</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="other">Other</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">expand_more</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-900" htmlFor="phone">Primary Phone</label>
              <div className="flex rounded border border-gray-200 bg-white focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-colors">
                <div className="relative border-r border-gray-200">
                  <select
                    value={phonePrefix}
                    onChange={(e) => setPhonePrefix(e.target.value)}
                    className="appearance-none bg-transparent pl-3 pr-8 py-2 text-sm text-gray-900 outline-none h-full min-w-[80px]">
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+49">🇩🇪 +49</option>
                    <option value="+20">🇪🇬 +20</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-[16px]">expand_more</span>
                </div>
                <input
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 bg-transparent px-4 py-2 text-sm text-gray-900 placeholder:text-outline outline-none border-none focus:ring-0"
                  id="phone" placeholder="(555) 000-0000" type="tel" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-900" htmlFor="location">Primary Location</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-gray-500">location_on</span>
                <input
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded border border-gray-200 bg-white pl-[36px] pr-4 py-2 text-sm text-gray-900 placeholder:text-outline focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                  id="location" placeholder="HQ Address" type="text" />
              </div>
            </div>
            <div className="pt-2">
              <button
                className="w-full bg-[#0066CC] text-on-primary font-medium text-xs py-2.5 px-6 rounded hover:bg-[#D0E9FF] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                type="submit">
                Continue
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center p-4 sm:p-6 antialiased">
        <div className="w-full max-w-lg bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="pt-6 px-8 pb-4 border-b border-surface-container-highest">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[#0066CC] text-xl font-bold">StockSavvy</span>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Step 2 of 3</span>
            </div>
            <div className="flex gap-1 w-full mb-4">
              <div className="h-1 flex-1 bg-[#0066CC] rounded-full"></div>
              <div className="h-1 flex-1 bg-[#0066CC] rounded-full"></div>
              <div className="h-1 flex-1 bg-gray-100 rounded-full"></div>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Let's set up your first warehouse</h1>
            <p className="text-sm text-gray-500">This will be your primary distribution hub.</p>
          </div>
          <form onSubmit={handleStep2Submit}>
            <div className="p-8 flex-1 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-900" htmlFor="warehouseName">Warehouse Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[20px]">warehouse</span>
                  <input
                    required
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    className="w-full pl-[44px] pr-4 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                    id="warehouseName" placeholder="e.g., North Hub" type="text" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-900" htmlFor="warehouseLocation">Warehouse Location</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[20px]">location_on</span>
                  <input
                    required
                    value={warehouseLocation}
                    onChange={(e) => setWarehouseLocation(e.target.value)}
                    className="w-full pl-[44px] pr-4 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                    id="warehouseLocation" placeholder="e.g., Seattle, WA" type="text" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 mt-2 border border-gray-200 rounded-lg bg-gray-50-low opacity-75 cursor-not-allowed">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-900 font-medium">This is my main warehouse</span>
                  <span className="text-[13px] text-gray-500">Primary distribution center</span>
                </div>
                <div className="w-[40px] h-[24px] bg-[#0066CC] rounded-full relative opacity-50">
                  <div className="absolute right-[2px] top-[2px] w-[20px] h-[20px] bg-white rounded-full flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[14px] text-[#0066CC]">check</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 border-t border-surface-container-highest flex justify-between items-center bg-white">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back
              </button>
              <button
                type="submit"
                className="bg-[#0066CC] text-on-primary px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#D0E9FF] transition-colors shadow-sm flex items-center gap-2 cursor-pointer">
                Continue
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen antialiased flex flex-col justify-center items-center">
      <main className="w-full max-w-[800px] px-6 py-8 flex flex-col items-center">
        <div className="w-full max-w-md mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-semibold uppercase text-gray-500">Step 3 of 3</span>
            <span className="text-[11px] font-semibold text-[#0066CC]">100% Complete</span>
          </div>
          <div className="w-full h-2 bg-gray-100est rounded-full overflow-hidden">
            <div className="h-full bg-[#0066CC] w-full rounded-full transition-all duration-1000 ease-out"></div>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#0066CC]-fixed mb-6 relative">
            <span className="material-symbols-outlined text-[48px] text-[#0066CC]" data-icon="warehouse" style={{ fontVariationSettings: "'FILL' 1" }}>warehouse</span>
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2 tracking-tight">You're all set, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-base text-gray-500 max-w-lg mx-auto">
            Your workspace is configured and ready for action. Here's a quick summary of what we'll set up for you.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-white-container rounded-lg w-full max-w-3xl text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col hover:border-primary transition-colors duration-200">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-50-low flex items-center justify-center mr-4">
                <span className="material-symbols-outlined text-gray-500">business</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{companyName}</h3>
                <p className="text-[13px] text-gray-500">Company Profile</p>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-500">Industry</span>
                <span className="text-[13px] text-gray-900 capitalize">{industry || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-500">Location</span>
                <span className="text-[13px] text-gray-900">{location}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col hover:border-primary transition-colors duration-200">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-50-low flex items-center justify-center mr-4">
                <span className="material-symbols-outlined text-gray-500">inventory_2</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{warehouseName}</h3>
                <p className="text-[13px] text-gray-500">Primary Facility</p>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-500">Role</span>
                <span className="text-[13px] text-gray-900">Main Hub</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-500">Location</span>
                <span className="text-[13px] text-gray-900">{warehouseLocation}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleFinalize}
          disabled={loading}
          className="bg-[#0066CC] text-on-primary font-medium text-sm px-8 py-3 rounded-lg shadow-sm hover:bg-[#D0E9FF] transition-colors duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50">
          {loading ? 'Setting up...' : 'Go to Dashboard'}
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </main>
    </div>
  );
}
