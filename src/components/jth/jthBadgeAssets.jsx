export const JTH_BADGE_ASSETS = {
  scout: "https://media.base44.com/images/public/690f554506edf795e5d84121/af4a60247_file_0000000096ac71f58cd6621423cc0f81.png#xywh=0,0,204,176",
  tracker: "https://media.base44.com/images/public/690f554506edf795e5d84121/af4a60247_file_0000000096ac71f58cd6621423cc0f81.png#xywh=204,0,204,176",
  seeker: "https://media.base44.com/images/public/690f554506edf795e5d84121/af4a60247_file_0000000096ac71f58cd6621423cc0f81.png#xywh=408,0,204,176",
  pathfinder: "https://media.base44.com/images/public/690f554506edf795e5d84121/af4a60247_file_0000000096ac71f58cd6621423cc0f81.png#xywh=612,0,204,176",
  hunter: "https://media.base44.com/images/public/690f554506edf795e5d84121/af4a60247_file_0000000096ac71f58cd6621423cc0f81.png#xywh=816,0,204,176",
  gold_hunter: "https://media.base44.com/images/public/690f554506edf795e5d84121/af4a60247_file_0000000096ac71f58cd6621423cc0f81.png#xywh=0,176,204,176",
  elite_hunter: "https://media.base44.com/images/public/690f554506edf795e5d84121/af4a60247_file_0000000096ac71f58cd6621423cc0f81.png#xywh=204,176,204,176",
  trailblazer: "https://media.base44.com/images/public/690f554506edf795e5d84121/af4a60247_file_0000000096ac71f58cd6621423cc0f81.png#xywh=408,176,204,176",
  master_of_the_hunt: "https://media.base44.com/images/public/690f554506edf795e5d84121/af4a60247_file_0000000096ac71f58cd6621423cc0f81.png#xywh=612,176,204,176",
  legend_of_the_hunt: "https://media.base44.com/images/public/690f554506edf795e5d84121/af4a60247_file_0000000096ac71f58cd6621423cc0f81.png#xywh=816,176,204,176",
};

export function getJthBadgeAssetByRank(rankName = "") {
  const key = rankName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return JTH_BADGE_ASSETS[key] || "";
}