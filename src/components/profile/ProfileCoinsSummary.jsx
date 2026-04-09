import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DEFAULT_JTH_BADGES } from "@/components/jth/jthDefaults";
import { getJthBadgeAssetByRank } from "@/components/jth/jthBadgeAssets";

export default function ProfileCoinsSummary({ stats }) {
  const lifetimeCoins = Number(stats?.lifetime_coins || 0);
  const rollingCoins = Number(stats?.rolling_60_day_coins || 0);
  const currentRank = stats?.current_rank || "Scout";
  const rankConfig = DEFAULT_JTH_BADGES.find((badge) => badge.rank_name === currentRank) || DEFAULT_JTH_BADGES[0];
  const maintenanceTarget = Number(rankConfig?.maintenance_60_day_total || 0);
  const maintenanceProgress = maintenanceTarget > 0 ? Math.min((rollingCoins / maintenanceTarget) * 100, 100) : 100;
  const coinsRemaining = Math.max(maintenanceTarget - rollingCoins, 0);
  const badgeAsset = rankConfig?.badge_asset || getJthBadgeAssetByRank(currentRank);

  return (
    <Card className="mb-6 overflow-hidden border-2 border-[#2C4F4E] bg-gradient-to-br from-[#F8E8C9] to-white shadow-lg">
      <CardHeader>
        <CardTitle className="text-[#2C4F4E]">My Hunt Rank</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="mx-auto flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-[#2C4F4E]/20 bg-white p-3 sm:mx-0">
            {badgeAsset ? (
              <img src={badgeAsset} alt={currentRank} className="h-full w-full object-contain" />
            ) : (
              <div className="text-xs text-slate-400">No badge</div>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm text-slate-500">Current rank</p>
              <p className="text-2xl font-bold text-[#2C4F4E]">{currentRank}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs text-slate-500">Total coins</p>
                <p className="text-2xl font-bold text-amber-700">{lifetimeCoins}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs text-slate-500">60-day coins</p>
                <p className="text-2xl font-bold text-blue-700">{rollingCoins}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-[#2C4F4E]/15 bg-white/80 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-[#2C4F4E]">60-day maintenance progress</span>
            <span className="text-slate-600">{rollingCoins} / {maintenanceTarget}</span>
          </div>
          <Progress value={maintenanceProgress} className="h-3" />
          <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
            <span>Collected: {rollingCoins} coins</span>
            <span>Remaining: {coinsRemaining} coins</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}