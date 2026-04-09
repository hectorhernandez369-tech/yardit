export const JTH_BADGE_ASSETS = {
  scout: "https://media.base44.com/images/public/690f554506edf795e5d84121/fa1458e38_file_0000000096ac71f58cd6621423cc0f811.png",
  tracker: "https://media.base44.com/images/public/690f554506edf795e5d84121/420c67860_file_0000000096ac71f58cd6621423cc0f812.png",
  seeker: "https://media.base44.com/images/public/690f554506edf795e5d84121/c0fec5a98_file_0000000096ac71f58cd6621423cc0f813.png",
  pathfinder: "https://media.base44.com/images/public/690f554506edf795e5d84121/5d3e8af72_file_0000000096ac71f58cd6621423cc0f814.png",
  hunter: "https://media.base44.com/images/public/690f554506edf795e5d84121/00bdf16f5_file_0000000043f871fd9b3b2469a3c295b91.png",
  gold_hunter: "https://media.base44.com/images/public/690f554506edf795e5d84121/438c20839_file_0000000096ac71f58cd6621423cc0f815.png",
  elite_hunter: "https://media.base44.com/images/public/690f554506edf795e5d84121/a07031cc8_file_0000000096ac71f58cd6621423cc0f816.png",
  trailblazer: "https://media.base44.com/images/public/690f554506edf795e5d84121/06a3cbc8b_file_0000000096ac71f58cd6621423cc0f817.png",
  master_of_the_hunt: "https://media.base44.com/images/public/690f554506edf795e5d84121/0bfe33d39_file_0000000096ac71f58cd6621423cc0f818.png",
  legend_of_the_hunt: "https://media.base44.com/images/public/690f554506edf795e5d84121/b4946b40d_file_0000000043f871fd9b3b2469a3c295b92.png",
};

export function getJthBadgeAssetByRank(rankName = "") {
  const key = rankName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return JTH_BADGE_ASSETS[key] || "";
}