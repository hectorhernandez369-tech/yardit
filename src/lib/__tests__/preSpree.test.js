import test from "node:test";
import assert from "node:assert/strict";
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
const form = { ownerUserId: user.id, listingType: "yard_sale", tier: "featured", title: "Test sale", selectedRangeStartDate: "2026-11-21", selectedRangeEndDate: "2026-11-22", openTime: "08:00", closeTime: "16:00", photoUrls: [], lat: 36.1, lng: -119.0, timeZoneId: "America/Los_Angeles" };
const prepare = (patch = {}, at = now, owner = user) => server.preparePreSpreeListing({ ...form, ...patch }, owner, "America/Los_Angeles", at);
const published = prepare().data;

test("client and server eligibility rules remain identical", async () => {
  assert.equal(await readFile("src/lib/preSpree.js", "utf8"), await readFile("base44/shared/preSpreeRules.ts", "utf8"));
});
test("both days or either individual day qualify", () => {
  for (const range of [["2026-11-21", "2026-11-22"], ["2026-11-21", "2026-11-21"], ["2026-11-22", "2026-11-22"]]) {
    const data = { ...form, selectedRangeStartDate: range[0], selectedRangeEndDate: range[1] };
    assert.equal(ui.isPreSpreeEligible(data, now), true);
    assert.ok(prepare(data).data);
  }
});
test("dates outside the promotion, reversed dates, other tiers, events and demos do not qualify", () => {
  for (const patch of [
    { selectedRangeStartDate: "2026-11-20" }, { selectedRangeEndDate: "2026-11-23" },
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
  assert.equal(data.startDateTime, "2026-11-21T16:00:00.000Z");
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
  assert.ok(prepare({ selectedRangeEndDate: "2026-11-21" }, new Date("2026-11-22T00:00:00Z")).error);
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
