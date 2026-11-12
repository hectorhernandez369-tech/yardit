import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import * as ui from "../preSpree.js";

async function loadModule(path) {
  const result = await build({ entryPoints: [path], bundle: true, write: false, format: "esm", platform: "node", alias: { "@": resolve("src") }, define: { "import.meta.env.DEV": "false" } });
  return import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64"));
}
const server = await loadModule("base44/shared/preSpree.ts");
const visibility = await loadModule("src/lib/listingVisibility.js");
const now = new Date("2026-11-06T18:00:00Z");
const user = { id: "owner", primary_address_verified: true, street_address: "Test address", city: "Test City", state: "CA", zip_code: "00000", address_lat: 36.1, address_lng: -119.0 };
const form = { ownerUserId: user.id, listingType: "yard_sale", tier: "featured", title: "Test sale", selectedRangeStartDate: "2026-11-20", selectedRangeEndDate: "2026-11-22", openTime: "08:00", closeTime: "16:00", photoUrls: [], lat: 36.1, lng: -119.0, timeZoneId: "America/Los_Angeles" };
const prepare = (patch = {}, at = now, owner = user) => server.preparePreSpreeListing({ ...form, ...patch }, owner, "America/Los_Angeles", at);
const published = prepare().data;

test("client and server eligibility rules remain identical", async () => {
  assert.equal(await readFile("src/lib/preSpree.js", "utf8"), await readFile("base44/shared/preSpreeRules.ts", "utf8"));
});
test("only the full locked Friday through Sunday range qualifies", () => {
  for (const range of [["2026-11-20", "2026-11-20"], ["2026-11-20", "2026-11-21"], ["2026-11-20", "2026-11-22"], ["2026-11-21", "2026-11-22"], ["2026-11-21", "2026-11-21"], ["2026-11-22", "2026-11-22"]]) {
    const data = { ...form, selectedRangeStartDate: range[0], selectedRangeEndDate: range[1] };
    const fullWeekend = range[0] === ui.PRE_SPREE_START && range[1] === ui.PRE_SPREE_END;
    assert.equal(ui.isPreSpreeEligible(data, now), fullWeekend);
    assert.equal(Boolean(prepare(data).data), fullWeekend);
  }
});
test("dates outside the promotion, reversed dates, other tiers, events and demos do not qualify", () => {
  for (const patch of [
    { selectedRangeStartDate: "2026-11-19" }, { selectedRangeEndDate: "2026-11-23" },
    { selectedRangeStartDate: "2026-11-22", selectedRangeEndDate: "2026-11-21" },
    { selectedRangeStartDate: "" }, { tier: "premium" }, { tier: "free" },
    { listingType: "event" }, { is_demo_listing: true }, { developer_schedule_override: true },
    { neighborhood_sale_id: "neighborhood" },
  ]) {
    assert.equal(ui.isPreSpreeEligible({ ...form, ...patch }, now), false, JSON.stringify(patch));
    assert.ok(prepare(patch).error);
  }
});
test("promotion stops using the listing timezone, not server UTC", () => {
  assert.equal(ui.isPreSpreeOfferOpen(new Date("2026-11-23T07:59:00Z"), form.timeZoneId), true);
  assert.equal(ui.isPreSpreeOfferOpen(new Date("2026-11-23T08:00:00Z"), form.timeZoneId), false);
  assert.ok(prepare({}, new Date("2026-11-23T08:00:00Z")).error);
  assert.ok(prepare({}, new Date("2026-11-01T18:00:00Z")).error);
});
test("server sets zero payment and scheduled state, ignoring caller payment values", () => {
  const { data } = prepare({ pricePaid: 499, payment_status: "paid", startDateTime: "2099-01-01", endDateTime: "2099-01-01" });
  assert.equal(data.pricePaid, 0);
  assert.equal(data.payment_status, "waived");
  assert.equal(data.status, "scheduled");
  assert.equal(data.startDateTime, "2026-11-20T16:00:00.000Z");
  assert.equal(data.endDateTime, "2026-11-23T00:00:00.000Z");
  assert.equal(data.early_visibility_enabled, false);
  assert.equal(data.pre_spree_published_at, now.toISOString());
});
test("server requires own account, verified home, valid hours, and at most ten photos", () => {
  assert.ok(prepare({ ownerUserId: "someone-else" }).error);
  assert.ok(prepare({}, now, { ...user, primary_address_verified: false }).error);
  assert.ok(prepare({ lat: 40 }).error);
  for (const patch of [{ openTime: "garbage" }, { openTime: "04:59" }, { closeTime: "22:01" }, { openTime: "16:00", closeTime: "08:00" }, { photoUrls: Array(11).fill("https://example.com/photo.jpg") }]) assert.ok(prepare(patch).error);
  assert.ok(prepare({ photoUrls: Array(10).fill("https://example.com/photo.jpg") }).data);
});
test("sale cannot publish after its closing time", () => {
  assert.ok(prepare({}, new Date("2026-11-23T00:00:00Z")).error);
});
test("public visitor sees the pin at publication without a coming-soon package", () => {
  assert.equal(visibility.getListingMapVisibilityState(published, null, { now }), "pre_spree");
  assert.equal(visibility.isPremiumComingSoonPublicListing(published, now), false);
  assert.equal(visibility.isPubliclyVisibleListing(published, { now }), true);
  assert.equal(ui.isPreSpreeOpenNow(published, now), false);
});
test("ordinary Featured listings retain their existing visibility schedule", () => {
  assert.equal(visibility.isPubliclyVisibleListing({ ...published, pre_spree_campaign: "" }, { now }), false);
});
test("cancelled, hidden, unpaid, pending, expired and unlocated promotions stay hidden", () => {
  for (const patch of [
    { status: "draft" }, { status: "pending_payment" }, { status: "cancelled" },
    { status: "hidden" }, { status: "suspended" }, { status: "under_review" },
    { payment_status: "pending" }, { payment_status: "failed" },
    { lat: null }, { pre_spree_published_at: "invalid" },
    { pre_spree_published_at: "2026-11-07T18:00:00Z" },
  ]) assert.equal(visibility.isPubliclyVisibleListing({ ...published, ...patch }, { now }), false, JSON.stringify(patch));
  assert.equal(visibility.isPubliclyVisibleListing(published, { now: new Date("2026-11-23T00:00:01Z") }), false);
});
test("OPEN NOW follows local sale hours while pins remain visible overnight", () => {
  assert.equal(ui.isPreSpreeOpenNow(published, new Date("2026-11-21T15:59:00Z")), false);
  assert.equal(ui.isPreSpreeOpenNow(published, new Date("2026-11-21T16:00:00Z")), true);
  assert.equal(ui.isPreSpreeOpenNow(published, new Date("2026-11-22T00:00:00Z")), false);
  assert.equal(visibility.isPubliclyVisibleListing(published, { now: new Date("2026-11-22T04:00:00Z") }), true);
  assert.equal(ui.isPreSpreeOpenNow(published, new Date("2026-11-22T16:00:00Z")), true);
});

test("editing sale hours updates the expiration time", () => {
  const schedule = server.getPreSpreeSchedule({ ...published, closeTime: "18:00" });
  assert.equal(schedule.endDateTime, "2026-11-23T02:00:00.000Z");
});
test("a campaign marker cannot carry its free entitlement to another weekend", () => {
  const moved = { ...published, selectedRangeStartDate: "2026-11-28", selectedRangeEndDate: "2026-11-29" };
  assert.equal(visibility.isPubliclyVisibleListing(moved, { now: new Date("2026-11-28T18:00:00Z") }), false);
});

const handlerBundle = await build({
  entryPoints: ["base44/functions/saveResidentialListing/entry.ts"], bundle: true, write: false, format: "esm", platform: "node",
  plugins: [{ name: "mock-boundaries", setup(builder) {
    builder.onResolve({ filter: /^npm:@base44\/sdk/ }, () => ({ path: "sdk", namespace: "test-mock" }));
    builder.onResolve({ filter: /^npm:tz-lookup/ }, () => ({ path: "timezone", namespace: "test-mock" }));
    builder.onResolve({ filter: /shared\/(demoMode|founderVip|developerListings)\.ts$/ }, args => ({ path: args.path, namespace: "test-mock" }));
    builder.onLoad({ filter: /.*/, namespace: "test-mock" }, ({ path }) => {
      let contents = "";
      if (path === "sdk") contents = "export const createClientFromRequest = () => globalThis.__preSpreeTestSdk;";
      else if (path === "timezone") contents = 'export default () => "America/Los_Angeles";';
      else if (path.includes("demoMode")) contents = "export const getDemoAuthorization = async () => ({canUseDemoMode:false}); export const hasDemoBypassRequest = () => false; export const sanitizeDemoFields = data => data;";
      else if (path.includes("founderVip")) contents = "export const hasResidentialVip = async () => false; export const eligibleFounderListing = () => false; export const founderWaiver = {};";
      else contents = "export const createDeveloperListing = async () => Response.json({}, {status:403});";
      return { contents };
    });
  }}],
});
const { default: handler } = await import("data:text/javascript;base64," + Buffer.from(handlerBundle.outputFiles[0].text).toString("base64"));
const realDate = Date;
async function invoke(body, currentUser = user, existing = null) {
  const writes = [];
  globalThis.__preSpreeTestSdk = {
    auth: { me: async () => currentUser },
    asServiceRole: { entities: {
      Listing: { filter: async query => query.id && existing ? [existing] : [], create: async data => { writes.push(data); return {id:"new", ...data}; }, update: async (id, data) => { writes.push(data); return {id, ...data}; } },
      User: { filter: async () => [] },
      ResidentialListingAccessRequest: { filter: async () => [] },
    } },
  };
  globalThis.Date = class extends realDate { constructor(...args) { super(...(args.length ? args : [now.getTime()])); } static now() { return now.getTime(); } };
  try {
    const response = await handler(new Request("https://example.invalid/test", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) }));
    return { status: response.status, body: await response.json(), writes };
  } finally { globalThis.Date = realDate; delete globalThis.__preSpreeTestSdk; }
}
test("publish endpoint creates one free scheduled sale without checkout", async () => {
  const result = await invoke({ action: "pre_spree_create", data: {...form, payment_status:"paid", pricePaid:4.99} });
  assert.equal(result.status, 200);
  assert.equal(result.writes.length, 1);
  assert.equal(result.body.listing.payment_status, "waived");
  assert.equal(result.body.listing.pricePaid, 0);
  assert.equal(result.body.listing.pre_spree_campaign, ui.PRE_SPREE_CAMPAIGN);
});
test("publish endpoint rejects anonymous and ineligible requests before writing", async () => {
  assert.equal((await invoke({ action: "pre_spree_create", data: form }, null)).status, 401);
  const result = await invoke({ action: "pre_spree_create", data: {...form, tier:"premium"} });
  assert.equal(result.status, 400);
  assert.equal(result.writes.length, 0);
});
test("ordinary create cannot supply its own campaign marker", async () => {
  const result = await invoke({ action: "create", data: {...form, pre_spree_campaign:ui.PRE_SPREE_CAMPAIGN, pre_spree_published_at:now.toISOString()} });
  assert.equal(result.status, 200);
  assert.equal(result.body.listing.pre_spree_campaign, undefined);
  assert.equal(result.body.listing.pre_spree_published_at, undefined);
});
test("update endpoint rejects moving a free campaign sale outside its dates", async () => {
  const result = await invoke({ action:"update", listing_id:"sale", data:{selectedRangeEndDate:"2026-11-29"} }, user, {...published,id:"sale"});
  assert.equal(result.status, 400);
  assert.equal(result.writes.length, 0);
});
test("update endpoint preserves campaign publication and recomputes closing time", async () => {
  const result = await invoke({ action:"update", listing_id:"sale", data:{closeTime:"18:00",pre_spree_published_at:"2099-01-01"} }, user, {...published,id:"sale"});
  assert.equal(result.status, 200);
  assert.equal(result.writes[0].endDateTime, "2026-11-23T02:00:00.000Z");
  assert.equal(result.writes[0].pre_spree_published_at, undefined);
});

test("Featured starts at $4.99 until complete qualifying dates are selected", async () => {
  const { getFeaturedPricing } = await import("../featuredPricing.js");
  for (const dates of [{ selectedRangeStartDate: "", selectedRangeEndDate: "" }, { selectedRangeStartDate: "2026-11-21", selectedRangeEndDate: "" }]) {
    const price = getFeaturedPricing({ ...form, ...dates }, { now });
    assert.equal(price.amountCents, 499);
    assert.equal(price.isFree, false);
  }
});
test("changing weekends recalculates price and checkout eligibility in both directions", async () => {
  const { getFeaturedPricing } = await import("../featuredPricing.js");
  const regular = { ...form, listing_offer: ui.PRE_SPREE_CAMPAIGN, selectedRangeStartDate: "2026-11-28", selectedRangeEndDate: "2026-11-29" };
  const free = getFeaturedPricing({ ...form, listing_offer: ui.PRE_SPREE_CAMPAIGN }, { now });
  assert.equal(free.amountCents, 0);
  assert.equal(free.isFree, true);
  const paid = getFeaturedPricing(regular, { now });
  assert.equal(paid.amountCents, 499);
  assert.equal(paid.isFree, false);
  assert.match(paid.scheduleMessage, /These dates aren’t included in Pre-Spree/);
  assert.equal(getFeaturedPricing({ ...form, listing_offer: ui.PRE_SPREE_CAMPAIGN }, { now }).amountCents, 0);
});
test("partial overlap with Pre-Spree is regular Featured pricing", async () => {
  const { getFeaturedPricing } = await import("../featuredPricing.js");
  for (const dates of [
    {selectedRangeStartDate:"2026-11-19",selectedRangeEndDate:"2026-11-21"},
    {selectedRangeStartDate:"2026-11-21",selectedRangeEndDate:"2026-11-23"},
  ]) assert.equal(getFeaturedPricing({...form,...dates}, {now}).amountCents, 499);
});
test("expired promotions and excluded creation modes cannot advertise free checkout", async () => {
  const { getFeaturedPricing } = await import("../featuredPricing.js");
  assert.equal(getFeaturedPricing({ ...form, listing_offer: ui.PRE_SPREE_CAMPAIGN }, {now,enabled:false}).isFree, false);
  assert.equal(getFeaturedPricing({ ...form, listing_offer: ui.PRE_SPREE_CAMPAIGN }, {now:new Date("2026-11-24T18:00:00Z")}).showPromotion, false);
});

test("Friday through Sunday receives free pricing, all three active dates, and immediate visibility", async () => {
  const { getFeaturedPricing } = await import("../featuredPricing.js");
  const data = { ...form, listing_offer: ui.PRE_SPREE_CAMPAIGN, selectedRangeStartDate: "2026-11-20" };
  assert.equal(getFeaturedPricing(data, { now }).amountCents, 0);
  const result = await invoke({ action: "pre_spree_create", data });
  assert.equal(result.status, 200);
  const listing = result.body.listing;
  assert.deepEqual(listing.activeDates, ["2026-11-20", "2026-11-21", "2026-11-22"]);
  assert.equal(listing.startDateTime, "2026-11-20T16:00:00.000Z");
  assert.equal(visibility.getListingMapVisibilityState(listing, null, { now }), "pre_spree");
  assert.equal(ui.isPreSpreeOpenNow(listing, new Date("2026-11-20T16:00:00Z")), true);
});

test("ordinary Featured never becomes free just because the dates match Pre-Spree", async () => {
  const { getFeaturedPricing } = await import("../featuredPricing.js");
  const { canPublishPreSpree } = await import("../preSpreeSelection.js");
  assert.equal(getFeaturedPricing(form, { now }).amountCents, 499);
  assert.equal(canPublishPreSpree(form, { now }), false);
});

test("selecting the separate promo card enables free publishing and sets the weekend", async () => {
  const { selectPreSpreeOffer, isPreSpreeSelected, canPublishPreSpree } = await import("../preSpreeSelection.js");
  const selected = selectPreSpreeOffer({ ...form, selectedRangeStartDate: "2026-11-28" }, now);
  assert.equal(isPreSpreeSelected(selected), true);
  assert.equal(canPublishPreSpree(selected, { now }), true);
  assert.equal(selected.selectedRangeStartDate, "2026-11-20");
  assert.equal(selected.selectedRangeEndDate, "2026-11-22");
  assert.equal(selected.tier, "featured");
});

test("switching back to Featured clears the promo even on the same weekend", async () => {
  const { selectPreSpreeOffer, selectStandardTier, isPreSpreeSelected, canPublishPreSpree } = await import("../preSpreeSelection.js");
  const { getFeaturedPricing } = await import("../featuredPricing.js");
  const promo = selectPreSpreeOffer(form, now);
  for (const tier of ["free", "featured", "premium"]) {
    const standard = selectStandardTier(promo, tier);
    assert.equal(isPreSpreeSelected(standard), false);
    assert.equal(canPublishPreSpree(standard, { now }), false);
    if (tier === "featured") assert.equal(getFeaturedPricing(standard, { now }).amountCents, 499);
  }
});

test("invalid promo dates and expired drafts cannot publish free", async () => {
  const { selectPreSpreeOffer, canPublishPreSpree } = await import("../preSpreeSelection.js");
  const promo = selectPreSpreeOffer(form, now);
  assert.equal(canPublishPreSpree({ ...promo, selectedRangeEndDate: "2026-11-23" }, { now }), false);
  assert.equal(canPublishPreSpree(promo, { now: new Date("2026-11-24T18:00:00Z") }), false);
  assert.equal(canPublishPreSpree(promo, { now, enabled: false }), false);
});

test("publish endpoint rejects shortened promo dates without writing", async () => {
  for (const dates of [{ selectedRangeStartDate: "2026-11-21" }, { selectedRangeEndDate: "2026-11-21" }]) {
    const result = await invoke({ action: "pre_spree_create", data: { ...form, ...dates } });
    assert.equal(result.status, 400);
    assert.equal(result.writes.length, 0);
  }
});

test("update endpoint rejects shortening either locked date", async () => {
  for (const data of [{ selectedRangeStartDate: "2026-11-21" }, { selectedRangeEndDate: "2026-11-21" }]) {
    const result = await invoke({ action: "update", listing_id: "sale", data }, user, { ...published, id: "sale" });
    assert.equal(result.status, 400);
    assert.equal(result.writes.length, 0);
  }
});

test("joining during the weekend keeps fixed dates and can publish before closing", async () => {
  const { selectPreSpreeOffer, canPublishPreSpree } = await import("../preSpreeSelection.js");
  for (const at of [new Date("2026-11-21T18:00:00Z"), new Date("2026-11-22T18:00:00Z")]) {
    const selected = selectPreSpreeOffer(form, at);
    assert.equal(selected.selectedRangeStartDate, ui.PRE_SPREE_START);
    assert.equal(selected.selectedRangeEndDate, ui.PRE_SPREE_END);
    assert.equal(canPublishPreSpree(selected, { now: at }), true);
    assert.ok(prepare(selected, at).data);
  }
});