import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Search, X, CheckCircle2, Store } from "lucide-react";

export default function VendorPickerSearch({ selectedVendorId, onSelect }) {
  const [query, setQuery] = useState("");
  const [vendors, setVendors] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Load vendors once
  useEffect(() => {
    base44.entities.VendorAccount.list("-created_date", 500)
      .then(v => setVendors(v || []))
      .catch(() => {});
  }, []);

  // Restore selected vendor on edit
  useEffect(() => {
    if (selectedVendorId && vendors.length > 0 && !selectedVendor) {
      const v = vendors.find(v => v.id === selectedVendorId);
      if (v) setSelectedVendor(v);
    }
  }, [selectedVendorId, vendors]);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (q) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    const lower = q.toLowerCase();
    const filtered = vendors.filter(v =>
      v.business_name?.toLowerCase().includes(lower) ||
      v.vendor_display_name?.toLowerCase().includes(lower) ||
      v.owner_name?.toLowerCase().includes(lower) ||
      v.owner_email?.toLowerCase().includes(lower) ||
      v.vendor_account_number?.toLowerCase().includes(lower) ||
      v.business_phone?.toLowerCase().includes(lower) ||
      v.phone?.toLowerCase().includes(lower)
    );
    setResults(filtered.slice(0, 12));
    setOpen(true);
  };

  const handleSelect = (v) => {
    setSelectedVendor(v);
    setQuery("");
    setOpen(false);
    const slug = v.vendor_slug;
    const vendorPageUrl = slug ? `${window.location.origin}/vendor/${slug}` : null;
    onSelect({
      vendor_id: v.id,
      vendor_business_name: v.business_name || v.vendor_display_name || "",
      vendor_logo: v.business_logo || "",
      vendor_description: v.description || "",
      vendor_address: [v.business_street_address, v.business_city, v.business_state, v.business_zip_code].filter(Boolean).join(", "),
      vendor_page_url: vendorPageUrl,
    });
  };

  const handleClear = () => {
    setSelectedVendor(null);
    setQuery("");
    onSelect(null);
  };

  return (
    <div ref={wrapperRef} className="relative">
      {selectedVendor ? (
        <div className="flex items-center gap-3 bg-[#F3E6CF] border-2 border-[#5DADA5] rounded-xl p-3">
          {selectedVendor.business_logo
            ? <img src={selectedVendor.business_logo} className="w-10 h-10 rounded-lg object-cover border border-slate-200" alt="" />
            : <div className="w-10 h-10 rounded-lg bg-[#5DADA5]/20 flex items-center justify-center"><Store className="w-5 h-5 text-[#5DADA5]" /></div>
          }
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#2C4F4E] text-sm truncate">{selectedVendor.business_name}</p>
            <p className="text-xs text-slate-500 truncate">{selectedVendor.vendor_account_number} · {selectedVendor.owner_email}</p>
          </div>
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <button onClick={handleClear} className="p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5DADA5]"
            placeholder="Search by business name, email, account #..."
            value={query}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => query && setOpen(true)}
          />
        </div>
      )}

      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
          {results.map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => handleSelect(v)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#F3E6CF] text-left transition-colors"
            >
              {v.business_logo
                ? <img src={v.business_logo} className="w-8 h-8 rounded-md object-cover border border-slate-100 shrink-0" alt="" />
                : <div className="w-8 h-8 rounded-md bg-[#5DADA5]/20 flex items-center justify-center shrink-0"><Store className="w-4 h-4 text-[#5DADA5]" /></div>
              }
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-[#2C4F4E] truncate">{v.business_name}</p>
                <p className="text-xs text-slate-400 truncate">{v.vendor_account_number} · {v.owner_email}</p>
              </div>
            </button>
          ))}
          {results.length === 0 && (
            <p className="text-sm text-slate-400 px-4 py-3">No vendors found.</p>
          )}
        </div>
      )}

      {open && query && results.length === 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-3">
          <p className="text-sm text-slate-400">No vendors found matching "{query}".</p>
        </div>
      )}
    </div>
  );
}