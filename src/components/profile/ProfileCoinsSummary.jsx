import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEFAULT_JTH_BADGES } from "@/components/jth/jthDefaults";
import { getJthBadgeAssetByRank } from "@/components/jth/jthBadgeAssets";

export default function ProfileCoinsSummary({ stats }) {
  const [showRules, setShowRules] = useState(false);
  const lifetimeCoins = Number(stats?.lifetime_coins || 0);
  const rollingCoins = Number(stats?.rolling_60_day_coins || 0);
  const currentRank = stats?.current_rank || "Scout";
  const rankConfig = DEFAULT_JTH_BADGES.find((badge) => badge.rank_name === currentRank) || DEFAULT_JTH_BADGES[0];
  const maintenanceTarget = Number(rankConfig?.maintenance_60_day_total || 0);
  const maintenanceProgress = maintenanceTarget > 0 ? Math.min((rollingCoins / maintenanceTarget) * 100, 100) : 100;
  const coinsRemaining = Math.max(maintenanceTarget - rollingCoins, 0);
  const badgeAsset = rankConfig?.badge_asset || getJthBadgeAssetByRank(currentRank);

  return (
    <>
      <Card className="mb-6 overflow-hidden border-2 border-[#2C4F4E] bg-gradient-to-br from-[#F8E8C9] to-white shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-[#2C4F4E]">My Hunt Rank</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="mx-auto flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[#2C4F4E]/20 bg-white p-2 sm:mx-0">
            {badgeAsset ? (
              <img src={badgeAsset} alt={currentRank} className="h-full w-full object-contain" />
            ) : (
              <div className="text-xs text-slate-400">No badge</div>
            )}
          </div>

            <div className="flex-1 space-y-2">
              <div>
                <p className="text-xs text-slate-500">Current rank</p>
                <p className="text-xl font-bold text-[#2C4F4E]">{currentRank}</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[11px] text-slate-500">Total coins</p>
                  <p className="text-xl font-bold text-amber-700">{lifetimeCoins}</p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <p className="text-[11px] text-slate-500">60-day coins</p>
                  <p className="text-xl font-bold text-blue-700">{rollingCoins}</p>
                </div>
              </div>
            </div>
        </div>

          <div className="space-y-2 rounded-xl border border-[#2C4F4E]/15 bg-white/80 p-3">
            <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
              <span className="font-medium text-[#2C4F4E]">60-day maintenance progress</span>
              <span className="text-slate-600">{rollingCoins} / {maintenanceTarget}</span>
            </div>
            <Progress value={maintenanceProgress} className="h-2.5" />
            <div className="flex items-center justify-between gap-3 text-[11px] sm:text-xs text-slate-600">
              <span>Collected: {rollingCoins}</span>
              <span>Remaining: {coinsRemaining}</span>
            </div>
          </div>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setShowRules(true)}
              className="text-sm font-medium text-[#2C4F4E] underline underline-offset-4 hover:text-[#5DADA5]"
            >
              Show me Hunt rules
            </button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="border-2 border-[#2C4F4E] bg-[#F3E6CF] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#2C4F4E]">Hunt Rules</DialogTitle>
            <DialogDescription className="text-slate-700">
              Here’s how your Hunt rank and maintenance progress work.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-[#2C4F4E]">
            <div className="rounded-xl bg-white/70 p-3">
              1. Collect coins by participating in the hunt and checking in where eligible.
            </div>
            <div className="rounded-xl bg-white/70 p-3">
              2. Your total coins help show your overall hunt history and rank progress.
            </div>
            <div className="rounded-xl bg-white/70 p-3">
              3. Your 60-day coins track recent activity needed to maintain your current rank.
            </div>
            <div className="rounded-xl bg-white/70 p-3">
              4. If you reach the required 60-day coin goal, your rank maintenance is complete.
            </div>
            <div className="rounded-xl bg-white/70 p-3">
              5. The badge shown here matches your current active hunt rank.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}