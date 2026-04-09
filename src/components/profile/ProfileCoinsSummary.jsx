import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
        <DialogContent className="border-2 border-[#2C4F4E] bg-[#F3E6CF] sm:max-w-2xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-[#2C4F4E]">Hunt Rules</DialogTitle>
            <DialogDescription className="text-slate-700">
              Learn how coins, ranks, badges, and 60-day maintenance work in the Hunt.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-2 text-sm text-[#2C4F4E]">
            <div className="rounded-xl bg-white/70 p-4">
              <p className="font-semibold mb-1">1. How you collect coins</p>
              <p>
                Coins are earned by successfully participating in Hunt activity where coins are available. When you complete an eligible Hunt action, the coins you earn are added to your account history.
              </p>
            </div>

            <div className="rounded-xl bg-white/70 p-4">
              <p className="font-semibold mb-1">2. Total coins</p>
              <p>
                Total coins show your full Hunt history across all time. This number reflects everything you have collected overall and helps represent your long-term activity in the Hunt.
              </p>
            </div>

            <div className="rounded-xl bg-white/70 p-4">
              <p className="font-semibold mb-1">3. Current rank</p>
              <p>
                Your current rank represents your present Hunt standing. As you collect more coins and keep up your Hunt activity, your rank can improve based on the Hunt system requirements.
              </p>
            </div>

            <div className="rounded-xl bg-white/70 p-4">
              <p className="font-semibold mb-1">4. Rank badge</p>
              <p>
                The badge shown on your profile matches your current Hunt rank. Each rank has its own badge so you can quickly see your standing and progress level.
              </p>
            </div>

            <div className="rounded-xl bg-white/70 p-4">
              <p className="font-semibold mb-1">5. 60-day maintenance coins</p>
              <p>
                Your 60-day coins track how many coins you have collected during the most recent 60-day window. This is used to determine whether you are maintaining your current Hunt rank.
              </p>
            </div>

            <div className="rounded-xl bg-white/70 p-4">
              <p className="font-semibold mb-1">6. Successful 60-day completion</p>
              <p>
                When your progress reaches the full requirement, you have successfully completed the 60-day maintenance target for that rank. Reaching the goal means your current activity level is strong enough for maintenance.
              </p>
            </div>

            <div className="rounded-xl bg-white/70 p-4">
              <p className="font-semibold mb-1">7. Ongoing maintenance and possible demotion</p>
              <p className="mb-2">
                Maintenance is ongoing because the system uses a rolling 60-day window. That means only coins earned in your most recent 60 days count toward maintenance. As time passes, older coins can drop out of that window.
              </p>
              <p className="mb-2">
                If enough older coins fall out and you do not replace them with new coin collections, your 60-day total can drop below the maintenance requirement for your current rank.
              </p>
              <p>
                When that happens, you may no longer qualify to hold that rank and could be demoted to a lower rank whose maintenance requirement you still meet. To avoid demotion, keep collecting coins consistently instead of waiting until the last minute.
              </p>
            </div>

            <div className="rounded-xl bg-white/70 p-4">
              <p className="font-semibold mb-1">8. Best way to stay on track</p>
              <p>
                Check your profile regularly, watch your 60-day progress, and continue collecting coins consistently. That is the easiest way to maintain your rank and keep moving forward in the Hunt.
              </p>
            </div>

            <div className="rounded-xl bg-white/70 p-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="rank-requirements" className="border-b-0">
                  <AccordionTrigger className="py-0 text-left font-semibold hover:no-underline">
                    Show all ranks, required coins, and maintenance
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="space-y-2">
                      {DEFAULT_JTH_BADGES.map((badge) => (
                        <div key={badge.rank_name} className="rounded-xl border border-[#2C4F4E]/15 bg-white p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-[#2C4F4E]">{badge.rank_name}</p>
                            <p className="text-xs text-slate-500">Rank {badge.sort_order}</p>
                          </div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs sm:text-sm text-slate-700">
                            <p>Lifetime coins required: <span className="font-semibold text-[#2C4F4E]">{badge.lifetime_unlock_total}</span></p>
                            <p>60-day maintenance: <span className="font-semibold text-[#2C4F4E]">{badge.maintenance_60_day_total}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}