import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import JTHMasterControls from "@/components/jth/JTHMasterControls";
import JTHGlobalDefaults from "@/components/jth/JTHGlobalDefaults";
import JTHLocationOverrides from "@/components/jth/JTHLocationOverrides";
import JTHBadgeSystem from "@/components/jth/JTHBadgeSystem";
import JTHPromotions from "@/components/jth/JTHPromotions";
import JTHPreviewSummary from "@/components/jth/JTHPreviewSummary";
import JTHSectionCard from "@/components/jth/JTHSectionCard";
import { DEFAULT_JTH_BADGES, DEFAULT_JTH_GLOBALS, isMixValid } from "@/components/jth/jthDefaults";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createOverrideTemplate() {
  return {
    status: "active",
    location_type: "city",
    location_value: "",
    priority: 1,
    start_date_time: "",
    end_date_time: "",
    probability_bands: clone(DEFAULT_JTH_GLOBALS.probability_bands),
    coin_value_mix: clone(DEFAULT_JTH_GLOBALS.coin_value_mix),
    minimum_coin_floor: 1,
    maximum_coin_cap: 5,
    cooldown_override_days: null,
    notes: "",
    coin_icon_key: "",
    coin_icon_url: "",
    draft_state: "draft",
    published_group_id: crypto.randomUUID(),
  };
}

function createPromotionTemplate() {
  return {
    name: "",
    active: true,
    scope_type: "all",
    scope_value: "",
    start_date_time: "",
    end_date_time: "",
    override_probability_bands: clone(DEFAULT_JTH_GLOBALS.probability_bands),
    override_coin_value_mix: clone(DEFAULT_JTH_GLOBALS.coin_value_mix),
    all_eligible_listings_get_coins: false,
    notes: "",
    draft_state: "draft",
    published_group_id: crypto.randomUUID(),
  };
}

export default function JTHTab({ user }) {
  const queryClient = useQueryClient();
  const { data: settingsList = [] } = useQuery({ queryKey: ["jthSettings"], queryFn: () => base44.entities.JTHSettings.list(), initialData: [] });
  const { data: overrideRows = [] } = useQuery({ queryKey: ["jthOverrides"], queryFn: () => base44.entities.JTHLocationOverride.list("-updated_date"), initialData: [] });
  const { data: promotionRows = [] } = useQuery({ queryKey: ["jthPromotions"], queryFn: () => base44.entities.JTHPromotion.list("-updated_date"), initialData: [] });
  const { data: badgeRows = [] } = useQuery({ queryKey: ["jthBadges"], queryFn: () => base44.entities.JTHBadgeDefinition.list("sort_order"), initialData: [] });

  const settings = settingsList[0];
  const initialDraftGlobals = settings?.draft_global_defaults || clone(DEFAULT_JTH_GLOBALS);
  const [draftToggle, setDraftToggle] = useState(settings?.draft_master_toggle ?? settings?.published_master_toggle ?? false);
  const [draftGlobals, setDraftGlobals] = useState(initialDraftGlobals);
  const [draftOverrides, setDraftOverrides] = useState(() => overrideRows.filter((row) => row.draft_state !== "published"));
  const [draftPromotions, setDraftPromotions] = useState(() => promotionRows.filter((row) => row.draft_state !== "published"));
  const [draftBadges, setDraftBadges] = useState(() => badgeRows.filter((row) => row.draft_state !== "published"));
  const [sections, setSections] = useState({
    master: true,
    globals: true,
    overrides: true,
    badges: false,
    promotions: false,
    summary: true,
  });

  useEffect(() => { setDraftToggle(settings?.draft_master_toggle ?? settings?.published_master_toggle ?? false); }, [settings?.draft_master_toggle, settings?.published_master_toggle]);
  useEffect(() => { setDraftGlobals(settings?.draft_global_defaults || clone(DEFAULT_JTH_GLOBALS)); }, [settings?.draft_global_defaults]);
  useEffect(() => { setDraftOverrides(overrideRows.filter((row) => row.draft_state !== "published")); }, [overrideRows]);
  useEffect(() => { setDraftPromotions(promotionRows.filter((row) => row.draft_state !== "published")); }, [promotionRows]);
  useEffect(() => { setDraftBadges(badgeRows.filter((row) => row.draft_state !== "published")); }, [badgeRows]);

  const hasPendingChanges = useMemo(() => {
    const publishedGlobals = JSON.stringify(settings?.published_global_defaults || DEFAULT_JTH_GLOBALS);
    const currentDraftGlobals = JSON.stringify(draftGlobals);
    return settings?.published_master_toggle !== draftToggle || publishedGlobals !== currentDraftGlobals || overrideRows.some((row) => row.draft_state === "draft") || promotionRows.some((row) => row.draft_state === "draft") || badgeRows.some((row) => row.draft_state === "draft");
  }, [settings, draftToggle, draftGlobals, overrideRows, promotionRows, badgeRows]);

  const ensureSeedMutation = useMutation({
    mutationFn: async () => {
      const current = await base44.entities.JTHSettings.list();
      if (current.length === 0) {
        await base44.entities.JTHSettings.create({
          draft_master_toggle: false,
          published_master_toggle: false,
          draft_global_defaults: { ...clone(DEFAULT_JTH_GLOBALS), global_coin_icon_key: "coins", global_coin_icon_url: "" },
          published_global_defaults: { ...clone(DEFAULT_JTH_GLOBALS), global_coin_icon_key: "coins", global_coin_icon_url: "" },
          draft_version: 1,
          published_version: 0,
          last_draft_saved_at: new Date().toISOString(),
          last_draft_saved_by: user?.email || user?.id || "admin",
        });
      }
      const badges = await base44.entities.JTHBadgeDefinition.list();
      if (badges.length === 0) {
        for (const badge of DEFAULT_JTH_BADGES) {
          await base44.entities.JTHBadgeDefinition.create({ ...badge, badge_asset: "", draft_state: "draft", published_group_id: crypto.randomUUID() });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jthSettings"] });
      queryClient.invalidateQueries({ queryKey: ["jthBadges"] });
    },
  });

  useEffect(() => { ensureSeedMutation.mutate(); }, []);

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const current = settings || (await base44.entities.JTHSettings.list())[0];
      if (current) {
        await base44.entities.JTHSettings.update(current.id, {
          draft_master_toggle: draftToggle,
          draft_global_defaults: draftGlobals,
          draft_version: (current.draft_version || 0) + 1,
          last_draft_saved_at: now,
          last_draft_saved_by: user?.email || user?.id || "admin",
        });
      }

      const existingDraftOverrides = overrideRows.filter((row) => row.draft_state !== "published");
      for (const row of existingDraftOverrides) await base44.entities.JTHLocationOverride.delete(row.id);
      for (const row of draftOverrides) await base44.entities.JTHLocationOverride.create({ ...row, draft_state: "draft" });

      const existingDraftPromotions = promotionRows.filter((row) => row.draft_state !== "published");
      for (const row of existingDraftPromotions) await base44.entities.JTHPromotion.delete(row.id);
      for (const row of draftPromotions) await base44.entities.JTHPromotion.create({ ...row, draft_state: "draft" });

      const existingDraftBadges = badgeRows.filter((row) => row.draft_state !== "published");
      for (const row of existingDraftBadges) await base44.entities.JTHBadgeDefinition.delete(row.id);
      for (const row of draftBadges) await base44.entities.JTHBadgeDefinition.create({ ...row, draft_state: "draft" });

      await base44.entities.AdminAction.create({
        admin_id: user?.id,
        action_type: "jth_save_draft",
        new_value: JSON.stringify({ draftToggle, draftGlobals }),
        page: "AdminLite-JTH",
        comment: "Saved JTH draft settings",
      });
    },
    onSuccess: () => {
      toast.success("JTH draft saved");
      queryClient.invalidateQueries({ queryKey: ["jthSettings"] });
      queryClient.invalidateQueries({ queryKey: ["jthOverrides"] });
      queryClient.invalidateQueries({ queryKey: ["jthPromotions"] });
      queryClient.invalidateQueries({ queryKey: ["jthBadges"] });
      queryClient.invalidateQueries({ queryKey: ["adminActions"] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      await saveDraftMutation.mutateAsync();
      const now = new Date().toISOString();
      const current = (await base44.entities.JTHSettings.list())[0];
      await base44.entities.JTHSettings.update(current.id, {
        published_master_toggle: draftToggle,
        published_global_defaults: draftGlobals,
        published_version: (current.published_version || 0) + 1,
        last_published_at: now,
        last_published_by: user?.email || user?.id || "admin",
      });

      const existingPublishedOverrides = (await base44.entities.JTHLocationOverride.list()).filter((row) => row.draft_state === "published");
      for (const row of existingPublishedOverrides) await base44.entities.JTHLocationOverride.delete(row.id);
      for (const row of draftOverrides) await base44.entities.JTHLocationOverride.create({ ...row, draft_state: "published" });

      const existingPublishedPromotions = (await base44.entities.JTHPromotion.list()).filter((row) => row.draft_state === "published");
      for (const row of existingPublishedPromotions) await base44.entities.JTHPromotion.delete(row.id);
      for (const row of draftPromotions) await base44.entities.JTHPromotion.create({ ...row, draft_state: "published" });

      const existingPublishedBadges = (await base44.entities.JTHBadgeDefinition.list()).filter((row) => row.draft_state === "published");
      for (const row of existingPublishedBadges) await base44.entities.JTHBadgeDefinition.delete(row.id);
      for (const row of draftBadges) await base44.entities.JTHBadgeDefinition.create({ ...row, draft_state: "published" });

      await base44.entities.AdminAction.create({
        admin_id: user?.id,
        action_type: draftToggle ? "jth_publish_on" : "jth_publish_off",
        new_value: JSON.stringify({ draftToggle, draftGlobals }),
        page: "AdminLite-JTH",
        comment: "Published JTH settings",
      });
    },
    onSuccess: () => {
      toast.success("JTH published");
      queryClient.invalidateQueries({ queryKey: ["jthSettings"] });
      queryClient.invalidateQueries({ queryKey: ["jthOverrides"] });
      queryClient.invalidateQueries({ queryKey: ["jthPromotions"] });
      queryClient.invalidateQueries({ queryKey: ["jthBadges"] });
      queryClient.invalidateQueries({ queryKey: ["adminActions"] });
    },
  });

  const discardMutation = useMutation({
    mutationFn: async () => {
      setDraftToggle(settings?.published_master_toggle ?? false);
      setDraftGlobals(settings?.published_global_defaults || clone(DEFAULT_JTH_GLOBALS));
      setDraftOverrides(overrideRows.filter((row) => row.draft_state === "published").map((row) => ({ ...row, draft_state: "draft" })));
      setDraftPromotions(promotionRows.filter((row) => row.draft_state === "published").map((row) => ({ ...row, draft_state: "draft" })));
      setDraftBadges((badgeRows.filter((row) => row.draft_state === "published").length ? badgeRows.filter((row) => row.draft_state === "published") : DEFAULT_JTH_BADGES).map((row) => ({ ...row, draft_state: "draft" })));
      await base44.entities.AdminAction.create({
        admin_id: user?.id,
        action_type: "jth_discard_draft",
        page: "AdminLite-JTH",
        comment: "Discarded JTH draft changes",
      });
    },
    onSuccess: () => {
      toast.success("Draft changes discarded");
      queryClient.invalidateQueries({ queryKey: ["adminActions"] });
    },
  });

  const mixError = !isMixValid(draftGlobals.coin_value_mix);
  const toggleSection = (key) => setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="mt-6 space-y-6">
      <JTHSectionCard title="Master Controls" open={sections.master} onToggle={() => toggleSection("master")}>
        <JTHMasterControls
          settings={settings}
          hasPendingChanges={hasPendingChanges}
          draftToggle={draftToggle}
          setDraftToggle={setDraftToggle}
          onSaveDraft={() => saveDraftMutation.mutate()}
          onPublish={() => {
            if (mixError) {
              toast.error("Please fix the coin value mix before publishing.");
              return;
            }
            publishMutation.mutate();
          }}
          onDiscard={() => discardMutation.mutate()}
        />
      </JTHSectionCard>

      <JTHSectionCard title="Global Defaults" open={sections.globals} onToggle={() => toggleSection("globals")}>
        <JTHGlobalDefaults draftToggle={draftToggle} values={draftGlobals} setValues={setDraftGlobals} mixError={mixError} />
      </JTHSectionCard>

      <JTHSectionCard title="Location Overrides" open={sections.overrides} onToggle={() => toggleSection("overrides")}>
        <JTHLocationOverrides overrides={draftOverrides} setOverrides={setDraftOverrides} template={createOverrideTemplate} />
      </JTHSectionCard>

      <JTHSectionCard title="Badge / Rank System" open={sections.badges} onToggle={() => toggleSection("badges")}>
        <JTHBadgeSystem badges={draftBadges.length ? draftBadges : DEFAULT_JTH_BADGES.map((badge) => ({ ...badge, badge_asset: "", draft_state: "draft", published_group_id: crypto.randomUUID() }))} setBadges={setDraftBadges} />
      </JTHSectionCard>

      <JTHSectionCard title="Promotions" open={sections.promotions} onToggle={() => toggleSection("promotions")}>
        <JTHPromotions promotions={draftPromotions} setPromotions={setDraftPromotions} template={createPromotionTemplate} />
      </JTHSectionCard>

      <JTHSectionCard title="Preview / Publish Summary" open={sections.summary} onToggle={() => toggleSection("summary")}>
        <JTHPreviewSummary settings={settings} draftGlobals={draftGlobals} overrides={draftOverrides} promotions={draftPromotions} badges={draftBadges} hasPendingChanges={hasPendingChanges} />
      </JTHSectionCard>
    </div>
  );
}