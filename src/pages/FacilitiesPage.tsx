import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';
import { StorageFacility, FacilityType, CommodityProfile } from '../api/types';
import {
  Building2,
  Plus,
  MapPin,
  Package,
  RefreshCw,
  Apple,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const FacilitiesPage: React.FC = () => {
  const [facilities, setFacilities] = useState<StorageFacility[]>([]);
  const [profiles, setProfiles] = useState<CommodityProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('500');
  const [facilityType, setFacilityType] = useState<FacilityType>('COLD_STORAGE');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Quick profile assign modal state
  const [assigningFacility, setAssigningFacility] = useState<StorageFacility | null>(null);
  const [assignProfileId, setAssignProfileId] = useState<string>('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [facilitiesRes, profilesRes] = await Promise.all([
        api.getFacilities(0, 100),
        api.getCommodityProfiles(0, 100, true),
      ]);
      setFacilities(facilitiesRes.content);
      setProfiles(profilesRes.content);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load storage facilities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredFacilities = useMemo(() => {
    if (!searchQuery.trim()) return facilities;
    const q = searchQuery.toLowerCase();
    return facilities.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q) ||
        f.facilityType.toLowerCase().includes(q) ||
        (f.commodityProfileName && f.commodityProfileName.toLowerCase().includes(q))
    );
  }, [facilities, searchQuery]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.createFacility({
        name,
        location,
        capacityInTonnes: parseFloat(capacity),
        facilityType,
        commodityProfileId: selectedProfileId ? parseInt(selectedProfileId) : null,
      });
      setShowModal(false);
      setName('');
      setLocation('');
      setCapacity('500');
      setSelectedProfileId('');
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to register facility');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningFacility) return;
    try {
      setAssignSubmitting(true);
      if (assignProfileId) {
        await api.assignCommodityProfile(assigningFacility.id, parseInt(assignProfileId));
      } else {
        await api.removeCommodityProfile(assigningFacility.id);
      }
      setAssigningFacility(null);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update commodity profile assignment');
    } finally {
      setAssignSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Storage Facilities
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Registered commercial cold-storage infrastructure, temperature chambers, and warehouse nodes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 shadow-xs transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Facility
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
            placeholder="Search facility name, location, or commodity..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-1.5 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none transition-colors"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900">{filteredFacilities.length}</span> of {facilities.length} facilities
        </div>
      </div>

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredFacilities.map((facility) => (
          <div
            key={facility.id}
            className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 hover:border-slate-300 shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 border border-blue-100">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">{facility.name}</h3>
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 mt-0.5">
                      {facility.facilityType.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    facility.active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {facility.active ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> ACTIVE
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 text-slate-400" /> INACTIVE
                    </>
                  )}
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600 pt-1">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="font-medium text-slate-700">{facility.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span>Capacity: <strong className="text-slate-800">{facility.capacityInTonnes} Tonnes</strong></span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Apple className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    {facility.commodityProfileName ? (
                      <span className="text-blue-700 font-semibold text-xs">
                        {facility.commodityProfileName}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs italic">Global Default Thresholds</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setAssigningFacility(facility);
                      setAssignProfileId(facility.commodityProfileId ? facility.commodityProfileId.toString() : '');
                    }}
                    className="rounded-md p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                    title="Configure Commodity Profile"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between font-mono">
              <span>Node #{facility.id}</span>
              <span>Reg: {new Date(facility.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}

        {filteredFacilities.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 space-y-2">
            <Building2 className="mx-auto h-8 w-8 text-slate-400" />
            <p className="font-semibold text-slate-700">No facilities matching your filter.</p>
            <p className="text-xs text-slate-400">Try adjusting your search query or clear the filter.</p>
          </div>
        )}
      </div>

      {/* Register Facility Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Register Storage Facility</h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Cold Storage Hub"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Location</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Sector 12 Industrial Zone"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Storage Capacity (Tonnes)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Type</label>
                <select
                  value={facilityType}
                  onChange={(e) => setFacilityType(e.target.value as FacilityType)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="COLD_STORAGE">Cold Storage</option>
                  <option value="CONTROLLED_ATMOSPHERE">Controlled Atmosphere</option>
                  <option value="RIPENING_CHAMBER">Ripening Chamber</option>
                  <option value="DISTRIBUTION_CENTER">Distribution Center</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Commodity Profile (Optional)</label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">None (Global Default Limits: 0-8°C, 65-95%)</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.targetTemperatureMin}°C - {p.targetTemperatureMax}°C)
                    </option>
                  ))}
                </select>
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
                  {submitting ? 'Saving...' : 'Register Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Commodity Profile Assignment Modal */}
      {assigningFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Apple className="h-5 w-5 text-blue-600" />
                Configure Commodity Profile
              </h3>
              <button
                onClick={() => setAssigningFacility(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Assign or remove a specific commodity profile for <span className="text-slate-900 font-semibold">{assigningFacility.name}</span>. Sensors in this facility will evaluate environmental breaches against this profile.
            </p>

            <form onSubmit={handleAssignProfile} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Commodity Profile</label>
                <select
                  value={assignProfileId}
                  onChange={(e) => setAssignProfileId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">None (Use Global Defaults: 0-8°C, 65-95%)</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.targetTemperatureMin}°C - {p.targetTemperatureMax}°C, {p.targetHumidityMin}% - {p.targetHumidityMax}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningFacility(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignSubmitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
                >
                  {assignSubmitting ? 'Updating...' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
