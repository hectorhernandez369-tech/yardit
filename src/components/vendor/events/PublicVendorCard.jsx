export default function PublicVendorCard({ vendor, account }) {
  return (
    <div className="rounded-2xl border border-[#2C4F4E]/10 bg-[#FBFAF7] p-4 flex gap-3">
      {(vendor.logo || account?.business_logo) && (
        <img src={vendor.logo || account.business_logo} alt={vendor.business_name} className="h-14 w-14 rounded-full object-cover border" />
      )}
      <div className="min-w-0">
        <p className="font-black text-[#2C4F4E]">{vendor.business_name}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#5DADA5]">{account?.business_category || "Vendor"}</p>
        {(vendor.description || account?.description) && <p className="mt-1 text-sm text-slate-600">{vendor.description || account.description}</p>}
      </div>
    </div>
  );
}