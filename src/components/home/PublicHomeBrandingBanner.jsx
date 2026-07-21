import React from "react";

export default function PublicHomeBrandingBanner() {
  return (
    <section className="border-b border-[#2C4F4E]/15 bg-[#F3E6CF]/95 px-3 py-3 text-[#2C4F4E]" aria-label="About Yardit">
      <div className="mx-auto flex max-w-7xl flex-col gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">Yardit</h1>
          <p className="mt-1 text-sm font-bold text-slate-800 sm:text-base">Find Yard Sales. Discover Local Events. Join the Hunt.</p>
        </div>
        <p className="max-w-5xl text-xs leading-5 text-slate-700 sm:text-sm sm:leading-6">
          Yardit is a local discovery platform that helps users find and promote yard sales, neighborhood sales, estate sales, vendor events, and community events. Users can browse nearby listings on an interactive map, create and manage their own listings, save events, receive relevant notifications, and connect with local sellers and event organizers.
        </p>
        <p className="max-w-5xl text-xs leading-5 text-slate-700 sm:text-sm sm:leading-6">
          Yardit offers Google Sign-In so users can securely create and access their Yardit account. When a user chooses Google Sign-In, Yardit uses basic account information provided by Google, such as the user’s name, email address, and profile image, to create the account, identify the user, display their profile, and manage listings and account activity. Yardit does not request access to Google Drive, Gmail, contacts, or other unrelated Google services.
        </p>
        <div className="flex flex-wrap gap-3 text-xs font-semibold sm:text-sm">
          <a href="/privacy" className="hover:underline">Privacy Policy</a>
          <a href="/terms" className="hover:underline">Terms of Service</a>
        </div>
      </div>
    </section>
  );
}