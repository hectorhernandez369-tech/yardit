export const DEFAULT_JTH_GLOBALS = {
  coin_cooldown_days_default: 8,
  grid_size_default: 5,
  probability_bands: {
    band_1_5: 20,
    band_6_25: 15,
    band_26_150: 10,
    band_150_plus: 5,
  },
  coin_value_mix: {
    one_coin: 70,
    two_coin: 20,
    five_coin: 10,
  },
  minimum_coin_floor_per_grid: 1,
  maximum_coin_cap_per_grid: 5,
  arrival_proximity_feet: 100,
  dwell_time_seconds: 60,
  lost_flow_enabled: true,
};

export const DEFAULT_JTH_BADGES = [
  { rank_name: "Scout", sort_order: 1, lifetime_unlock_total: 1, maintenance_60_day_total: 0, active: true, description: "First coin earned." },
  { rank_name: "Tracker", sort_order: 2, lifetime_unlock_total: 5, maintenance_60_day_total: 2, active: true, description: "Keeps the hunt moving." },
  { rank_name: "Seeker", sort_order: 3, lifetime_unlock_total: 15, maintenance_60_day_total: 4, active: true, description: "Consistent local hunter." },
  { rank_name: "Pathfinder", sort_order: 4, lifetime_unlock_total: 30, maintenance_60_day_total: 6, active: true, description: "Finds the good routes." },
  { rank_name: "Hunter", sort_order: 5, lifetime_unlock_total: 50, maintenance_60_day_total: 8, active: true, description: "A proven coin collector." },
  { rank_name: "Gold Hunter", sort_order: 6, lifetime_unlock_total: 80, maintenance_60_day_total: 10, active: true, description: "A strong gold coin hunter." },
  { rank_name: "Elite Hunter", sort_order: 7, lifetime_unlock_total: 120, maintenance_60_day_total: 12, active: true, description: "Elite local status." },
  { rank_name: "Trailblazer", sort_order: 8, lifetime_unlock_total: 180, maintenance_60_day_total: 15, active: true, description: "Sets the pace for others." },
  { rank_name: "Master of the Hunt", sort_order: 9, lifetime_unlock_total: 260, maintenance_60_day_total: 18, active: true, description: "A top-tier hunt identity." },
  { rank_name: "Legend of the Hunt", sort_order: 10, lifetime_unlock_total: 400, maintenance_60_day_total: 25, active: true, description: "Rare long-term JTH status." },
];

export function getJthStatusLabel(settings, hasPendingChanges) {
  if (!settings?.published_master_toggle) return "JTH Off";
  if (hasPendingChanges) return "Draft Changes Pending";
  return "JTH Live";
}

export function isMixValid(mix) {
  return Number(mix?.one_coin || 0) + Number(mix?.two_coin || 0) + Number(mix?.five_coin || 0) === 100;
}