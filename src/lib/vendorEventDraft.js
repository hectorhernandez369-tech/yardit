// Helpers for the VendorEvent Create Event draft system.
// Drafts are VendorEvent records with status="draft". The full in-progress form
// is stored in `draft_form_data` so the system is future-proof: any new Create
// Event field is persisted automatically without special-case code.

export const DRAFT_SECTION_LABELS = {
  1: "Event Details",
  2: "Public Contact",
  3: "Location & Schedule",
  4: "Flyer",
  5: "Vendor Setup",
};

// Map form fields → the Create Event section they belong to (1-5).
const FIELD_TO_SECTION = {
  title: 1, description: 1, category: 1, event_type: 1, logo: 1,
  public_contact_visibility: 2,
  display_address: 3, geocoded_address: 3, latitude: 3, longitude: 3,
  radius_feet: 3, highlights: 3, event_flags: 3, startDateTime: 3, endDateTime: 3,
  flyer_url: 4,
  open_to_vendors: 5, vendor_invitation_description: 5, vendor_fee_type: 5,
  vendor_payment_type: 5, reserve_deposit_percentage: 5, vendor_general_fee: 5,
  vendor_space_options: 5, allow_custom_spaces: 5, vendor_instructions: 5,
  vendor_deadline: 5, max_vendors: 5, coming_soon_start_date: 5,
};

export function hasDraftContent(form) {
  if (!form) return false;
  return Boolean(
    form.title?.trim() ||
    form.description?.trim() ||
    form.category?.trim() ||
    form.display_address?.trim() ||
    form.startDateTime ||
    form.endDateTime ||
    (form.highlights && form.highlights.length > 0) ||
    (form.event_flags && form.event_flags.length > 0) ||
    form.open_to_vendors ||
    form.logo ||
    form.flyer_url ||
    (form.vendor_space_options && form.vendor_space_options.length > 0)
  );
}

// Compute the highest section the user has reached, based on filled fields.
export function computeDraftStep(form) {
  if (!form) return 1;
  let step = 1;
  if (form.title?.trim() || form.description?.trim() || form.category?.trim() || form.logo) step = 1;
  if (form.public_contact_visibility && form.public_contact_visibility !== "inherit") step = Math.max(step, 2);
  if (form.display_address?.trim() || form.startDateTime || form.endDateTime || (form.highlights?.length) || (form.event_flags?.length)) step = Math.max(step, 3);
  if (form.flyer_url) step = Math.max(step, 4);
  if (form.open_to_vendors || form.vendor_space_options?.length || form.max_vendors || form.vendor_deadline || form.vendor_instructions?.trim() || form.coming_soon_start_date) step = Math.max(step, 5);
  return step;
}

export function getDraftStepLabel(step) {
  return DRAFT_SECTION_LABELS[step] || "Event Details";
}

// Filter helper: only unfinished drafts for a given organizer account.
export function isOrganizerDraft(event, accountId) {
  return !!event && event.status === "draft" && event.organizer_business_id === accountId;
}

export function pickOrganizerDrafts(events, accountId) {
  return (events || [])
    .filter((e) => isOrganizerDraft(e, accountId))
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
}

// Build a form object from a draft record, merging stored draft_form_data over defaults.
export function buildFormFromDraft(draft, initialForm) {
  if (!draft?.draft_form_data) return initialForm;
  return { ...initialForm, ...draft.draft_form_data, status: "draft" };
}