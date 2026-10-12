import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';
import { CommodityProfile } from '../api/types';
import { Apple, Plus, RefreshCw, Power, Trash2, Edit3, ShieldCheck, Thermometer, Droplets, Search } from 'lucide-react';

export const CommodityProfilesPage: React.FC = () => {
  const [profiles, setProfiles] = useState<CommodityProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [commodityName, setCommodityName] = useState('');
  const [variety, setVariety] = useState('');
  const [tempMin, setTempMin] = useState('0.50');
  const [tempMax, setTempMax] = useState('2.50');
  const [humidityMin, setHumidityMin] = useState('85.00');
  const [humidityMax, setHumidityMax] = useState('95.00');
  const [submitting, setSubmitting] = useState(false);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getCommodityProfiles(0, 100);
      setProfiles(res.content);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load commodity profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    const q = searchQuery.toLowerCase();
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.commodityName.toLowerCase().includes(q) ||
        (p.variety && p.variety.toLowerCase().includes(q))
    );
  }, [profiles, searchQuery]);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setCommodityName('');
    setVariety('');
    setTempMin('0.50');
    setTempMax('2.50');
    setHumidityMin('85.00');
    setHumidityMax('95.00');
    setShowModal(true);
  };

  const openEditModal = (profile: CommodityProfile) => {
    setEditingId(profile.id);
    setName(profile.name);
    setCommodityName(profile.commodityName);
    setVariety(profile.variety || '');
    setTempMin(profile.targetTemperatureMin.toString());
    setTempMax(profile.targetTemperatureMax.toString());
    setHumidityMin(profile.targetHumidityMin.toString());
    setHumidityMax(profile.targetHumidityMax.toString());
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        name,
        commodityName,
        variety: variety.trim() ? variety.trim() : null,
        targetTemperatureMin: parseFloat(tempMin),
        targetTemperatureMax: parseFloat(tempMax),
        targetHumidityMin: parseFloat(humidityMin),
        targetHumidityMax: parseFloat(humidityMax),
      };

      if (editingId) {
        await api.updateCommodityProfile(editingId, { ...payload, active: true });
      } else {
        await api.createCommodityProfile(payload);
      }

      setShowModal(false);
      loadProfiles();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save commodity profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!window.confirm('Are you sure you want to deactivate this commodity profile? Facilities assigned this profile will temporarily fall back to global threshold defaults.')) {
      return;
    }
    try {
      await api.deactivateCommodityProfile(id);
      loadProfiles();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to deactivate profile');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this commodity profile permanently? Note: If it is assigned to any facility, deletion will be rejected.')) {
      return;
    }
    try {
      await api.deleteCommodityProfile(id);
      loadProfiles();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete profile');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Commodity Storage Profiles
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Define optimal temperature and relative humidity preservation envelopes for specific commodities and varieties.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadProfiles}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 shadow-xs transition-all"
          >
            <Plus className="h-4 w-4" />
            New Profile
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commodity name, variety, profile..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-1.5 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900">{filteredProfiles.length}</span> of {profiles.length} profiles
        </div>
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredProfiles.map((profile) => (
          <div
            key={profile.id}
            className={`rounded-xl border p-5 space-y-4 transition-all shadow-xs flex flex-col justify-between ${
              profile.active
                ? 'border-slate-200 bg-white hover:border-slate-300'
                : 'border-slate-200 bg-slate-50/70 opacity-75'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-xl p-2.5 border ${
                      profile.active
                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    <Apple className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">{profile.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {profile.commodityName} {profile.variety ? `• ${profile.variety}` : ''}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    profile.active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {profile.active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              {/* Threshold Ranges */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg bg-blue-50/50 p-3 border border-blue-100">
                  <div className="flex items-center gap-1.5 text-xs text-blue-700 font-semibold mb-1">
                    <Thermometer className="h-3.5 w-3.5 text-blue-600" />
                    <span>Temperature</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 font-mono">
                    {profile.targetTemperatureMin.toFixed(1)}°C – {profile.targetTemperatureMax.toFixed(1)}°C
                  </div>
                </div>

                <div className="rounded-lg bg-teal-50/50 p-3 border border-teal-100">
                  <div className="flex items-center gap-1.5 text-xs text-teal-700 font-semibold mb-1">
                    <Droplets className="h-3.5 w-3.5 text-teal-600" />
                    <span>Humidity</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 font-mono">
                    {profile.targetHumidityMin.toFixed(0)}% – {profile.targetHumidityMax.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Profile #{profile.id}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(profile)}
                  className="rounded-lg p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                  title="Edit Profile"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                {profile.active ? (
                  <button
                    onClick={() => handleDeactivate(profile.id)}
                    className="rounded-lg p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 transition-colors"
                    title="Deactivate Profile"
                  >
                    <Power className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium italic mr-1">Deactivated</span>
                )}
                <button
                  onClick={() => handleDelete(profile.id)}
                  className="rounded-lg p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                  title="Delete Profile"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredProfiles.length === 0 && !loading && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
            <Apple className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-700">No commodity storage profiles found</p>
            <p className="text-xs text-slate-400 mt-1">
              Create profiles with tailored temperature and humidity tolerances for produce or pharmaceuticals.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Add First Profile
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                {editingId ? 'Edit Commodity Storage Profile' : 'New Commodity Storage Profile'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Profile Name (Unique)</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apples - Cold Controlled Atmosphere"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Commodity Name</label>
                  <input
                    type="text"
                    required
                    value={commodityName}
                    onChange={(e) => setCommodityName(e.target.value)}
                    placeholder="e.g. Apples"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Variety (Optional)</label>
                  <input
                    type="text"
                    value={variety}
                    onChange={(e) => setVariety(e.target.value)}
                    placeholder="e.g. Fuji / Gala"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Temperature Settings */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <span className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                  <Thermometer className="h-4 w-4 text-blue-600" /> Target Temperature (°C)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5 font-medium">Min Temp (°C)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={tempMin}
                      onChange={(e) => setTempMin(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5 font-medium">Max Temp (°C)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={tempMax}
                      onChange={(e) => setTempMax(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Humidity Settings */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <span className="text-xs font-semibold text-teal-700 flex items-center gap-1.5">
                  <Droplets className="h-4 w-4 text-teal-600" /> Target Relative Humidity (%)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5 font-medium">Min Humidity (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={humidityMin}
                      onChange={(e) => setHumidityMin(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5 font-medium">Max Humidity (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={humidityMax}
                      onChange={(e) => setHumidityMax(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Profile' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
