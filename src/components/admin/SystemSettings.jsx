import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Info, Loader2, ShieldAlert, Map as MapIcon, BellRing, Mail, UploadCloud, PlugZap, BarChart3, RefreshCw } from "lucide-react";

export default function SystemSettings() {
  const queryClient = useQueryClient();
  const [showDemoModeInfo, setShowDemoModeInfo] = React.useState(false);

  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ["currentUserForSystemSettings"],
    queryFn: () => base44.auth.me(),
  });

  const { data: adminProfiles = [], isLoading: isLoadingAdminProfile } = useQuery({
    queryKey: ["systemSettingsAdminProfile", currentUser?.id],
    queryFn: async () => {
      const byUserId = await base44.entities.AdminProfile.filter({ user_id: currentUser.id });
      if (byUserId.length > 0) return byUserId;
      return await base44.entities.AdminProfile.filter({ email: currentUser.email.toLowerCase() });
    },
    enabled: !!currentUser,
    initialData: [],
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => base44.entities.AppSetting.list(),
  });

  const findSetting = React.useCallback((key) => settings?.find((item) => item.key === key), [settings]);
  const settingBool = React.useCallback((key, fallback = true) => {
    const setting = settings?.find((item) => item.key === key);
    if (!setting) return fallback;
    return String(setting.value).toLowerCase() === "true";
  }, [settings]);
  const settingNumber = React.useCallback((key, fallback) => {
    const value = Number(settings?.find((item) => item.key === key)?.value);
    return Number.isFinite(value) ? value : fallback;
  }, [settings]);

  const upsertSetting = React.useCallback(async (key, value) => {
    const existing = settings?.find((item) => item.key === key);
    if (existing) {
      await base44.entities.AppSetting.update(existing.id, { value: String(value) });
    } else {
      await base44.entities.AppSetting.create({ key, value: String(value) });
    }
  }, [settings]);

  const appModeSetting = settings?.find(s => s.key === "app_mode");
  const isDemo = appModeSetting?.value === "demo";

  const toggleMutation = useMutation({
    mutationFn: async (newValue) => {
      const mode = newValue ? "demo" : "live";
      if (appModeSetting) {
        await base44.entities.AppSetting.update(appModeSetting.id, { value: mode });
      } else {
        await base44.entities.AppSetting.create({ key: "app_mode", value: mode });
      }
    },
    onSuccess: (_data, newValue) => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      toast.success("App mode updated");
      if (newValue) {
        setShowDemoModeInfo(true);
      }
    }
  });

  const deleteDemosMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("deleteDemoListings");
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.success(`Deleted ${data.deletedCount} demo listing(s)`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete demo listings");
    }
  });

  const canManageDemoMode = adminProfiles[0]?.role_label === "master";

  const vendorSignupSetting = settings?.find((s) => s.key === "vendor_public_signup_enabled");
  const vendorAllowlistSetting = settings?.find((s) => s.key === "vendor_beta_allowlist");
  const isPublicSignupEnabled = String(vendorSignupSetting?.value || "").toLowerCase() === "true";
  const [allowlistDraft, setAllowlistDraft] = React.useState("");

  const emergencyCostLock = settingBool("cost_emergency_lock", false);
  const mapboxEnabled = settingBool("cost_mapbox_enabled", true);
  const pushEnabled = settingBool("cost_push_enabled", true);
  const emailEnabled = settingBool("cost_email_enabled", true);
  const uploadsEnabled = settingBool("cost_uploads_enabled", true);
  const externalApisEnabled = settingBool("cost_external_apis_enabled", true);
  const warningPercent = settingNumber("cost_warning_percent", 75);
  const throttlePercent = settingNumber("cost_throttle_percent", 90);
  const hardStopPercent = settingNumber("cost_hard_stop_percent", 100);
  const [costDraft, setCostDraft] = React.useState({
    warning: String(warningPercent),
    throttle: String(throttlePercent),
    hardStop: String(hardStopPercent),
  });

  React.useEffect(() => {
    setCostDraft({
      warning: String(warningPercent),
      throttle: String(throttlePercent),
      hardStop: String(hardStopPercent),
    });
  }, [warningPercent, throttlePercent, hardStopPercent]);

  const usageServices = React.useMemo(() => ([
    {
      key: "mapbox_gl",
      label: "Mapbox GL Web Loads",
      unit: "map loads",
      defaultLimit: 50000,
      protectedSetting: "cost_mapbox_enabled",
      source: "Mapbox Statistics",
      note: "New Mapbox GL map. A load is counted when the Mapbox map initializes.",
    },
    {
      key: "mapbox_raster",
      label: "Current Mapbox Tile Map",
      unit: "tile requests",
      defaultLimit: 10000,
      protectedSetting: "cost_mapbox_enabled",
      source: "Mapbox Statistics",
      note: "Current Main map uses Leaflet with Mapbox raster tiles. Panning and zooming can request more tiles.",
    },
    {
      key: "onesignal_mobile",
      label: "OneSignal Mobile Push",
      unit: "monthly active users",
      defaultLimit: 1000,
      protectedSetting: "cost_push_enabled",
      source: "OneSignal Dashboard",
      note: "Free-plan mobile push allowance. Provider MAU is authoritative.",
    },
    {
      key: "onesignal_web",
      label: "OneSignal Web Push",
      unit: "subscribers per send",
      defaultLimit: 10000,
      protectedSetting: "cost_push_enabled",
      source: "OneSignal Dashboard",
      note: "Free web-push sending limit is based on subscribers reached by a send.",
    },
    {
      key: "base44",
      label: "Base44 Integration Credits",
      unit: "credits",
      defaultLimit: 0,
      protectedSetting: null,
      source: "Base44 Dashboard",
      note: "Enter the credit allowance for your current Base44 plan. Core Yardit infrastructure should not be hard-stopped from inside Yardit.",
    },
  ]), []);

  const [usageDrafts, setUsageDrafts] = React.useState({});

  React.useEffect(() => {
    const next = {};
    for (const service of usageServices) {
      const used = settingNumber(`cost_usage_${service.key}`, 0);
      const configuredLimit = settingNumber(`cost_limit_${service.key}`, service.defaultLimit);
      next[service.key] = {
        used: String(used || 0),
        limit: String(configuredLimit || service.defaultLimit || ""),
      };
    }
    setUsageDrafts(next);
  }, [settings, usageServices, settingNumber]);

  const getUsageStatus = React.useCallback((used, limit) => {
    const safeUsed = Math.max(0, Number(used) || 0);
    const safeLimit = Math.max(0, Number(limit) || 0);
    if (!safeLimit) return { percent: 0, label: "Set limit", tone: "slate", action: "Enter your plan limit" };
    const percent = Math.max(0, (safeUsed / safeLimit) * 100);
    if (percent >= hardStopPercent) return { percent, label: "HARD STOP", tone: "red", action: "Shut off protected service now" };
    if (percent >= throttlePercent) return { percent, label: "THROTTLE", tone: "orange", action: "Reduce optional usage" };
    if (percent >= warningPercent) return { percent, label: "WARNING", tone: "amber", action: "Watch closely" };
    return { percent, label: "HEALTHY", tone: "green", action: "No action needed" };
  }, [warningPercent, throttlePercent, hardStopPercent]);

  React.useEffect(() => {
    setAllowlistDraft(vendorAllowlistSetting?.value || "");
  }, [vendorAllowlistSetting?.value]);

  const toggleSignupMutation = useMutation({
    mutationFn: async (newValue) => {
      const val = newValue ? "true" : "false";
      if (vendorSignupSetting) {
        await base44.entities.AppSetting.update(vendorSignupSetting.id, { value: val });
      } else {
        await base44.entities.AppSetting.create({ key: "vendor_public_signup_enabled", value: val });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      queryClient.invalidateQueries({ queryKey: ["vendorLaunchGateSettings"] });
      toast.success("Vendor signup setting updated");
    },
  });

  const saveAllowlistMutation = useMutation({
    mutationFn: async (value) => {
      if (vendorAllowlistSetting) {
        await base44.entities.AppSetting.update(vendorAllowlistSetting.id, { value });
      } else {
        await base44.entities.AppSetting.create({ key: "vendor_beta_allowlist", value });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      queryClient.invalidateQueries({ queryKey: ["vendorLaunchGateSettings"] });
      toast.success("Vendor beta allowlist updated");
    },
  });

  const costSettingMutation = useMutation({
    mutationFn: async ({ key, value }) => upsertSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      queryClient.invalidateQueries({ queryKey: ["publicAppSettings"] });
      queryClient.invalidateQueries({ queryKey: ["publicMapData"] });
      toast.success("Cost safeguard updated");
    },
    onError: (error) => toast.error(error?.message || "Unable to update safeguard"),
  });

  const saveCostThresholds = async () => {
    const warning = Math.max(1, Math.min(95, Number(costDraft.warning) || 75));
    const throttle = Math.max(warning + 1, Math.min(99, Number(costDraft.throttle) || 90));
    const hardStop = Math.max(throttle + 1, Math.min(100, Number(costDraft.hardStop) || 100));
    try {
      await Promise.all([
        upsertSetting("cost_warning_percent", warning),
        upsertSetting("cost_throttle_percent", throttle),
        upsertSetting("cost_hard_stop_percent", hardStop),
      ]);
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      queryClient.invalidateQueries({ queryKey: ["publicAppSettings"] });
      queryClient.invalidateQueries({ queryKey: ["publicMapData"] });
      toast.success("Cost thresholds saved");
    } catch (error) {
      toast.error(error?.message || "Unable to save thresholds");
    }
  };

  const saveUsageMeter = async (serviceKey) => {
    const draft = usageDrafts[serviceKey] || {};
    const used = Math.max(0, Number(draft.used) || 0);
    const limit = Math.max(0, Number(draft.limit) || 0);
    try {
      await Promise.all([
        upsertSetting(`cost_usage_${serviceKey}`, used),
        upsertSetting(`cost_limit_${serviceKey}`, limit),
        upsertSetting(`cost_usage_updated_${serviceKey}`, new Date().toISOString()),
      ]);
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
      toast.success("Usage meter updated");
    } catch (error) {
      toast.error(error?.message || "Unable to update usage meter");
    }
  };

  if (isLoading || isLoadingUser || isLoadingAdminProfile) return <div className="p-4"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!canManageDemoMode) return null;

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="font-semibold">Global App Mode</p>
              <p className="text-sm text-slate-600">
                When Demo is enabled, testing behavior applies to admin accounts only. Admins can skip payment at checkout or continue to Stripe.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={!isDemo ? "font-bold text-slate-800" : "text-slate-500"}>Live</span>
              <Switch 
                checked={isDemo} 
                onCheckedChange={(c) => toggleMutation.mutate(c)} 
                disabled={toggleMutation.isPending}
              />
              <span className={isDemo ? "font-bold text-blue-600" : "text-slate-500"}>Demo</span>
            </div>
          </div>

          <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Public Vendor Signup</p>
                <p className="text-sm text-slate-600">
                  Temporarily gate public Vendor Account creation during the Residential launch. Existing vendors, allowlisted beta users, and admins still have access.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={!isPublicSignupEnabled ? "font-bold text-slate-800" : "text-slate-500"}>Off</span>
                <Switch checked={isPublicSignupEnabled} onCheckedChange={(c) => toggleSignupMutation.mutate(c)} disabled={toggleSignupMutation.isPending} />
                <span className={isPublicSignupEnabled ? "font-bold text-green-600" : "text-slate-500"}>On</span>
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <p className="text-sm font-semibold text-slate-800">Beta Allowlist</p>
              <p className="text-xs text-slate-500">One email or user ID per line, or a JSON array. Emails are matched case-insensitively.</p>
              <textarea
                className="w-full min-h-[120px] rounded-lg border border-slate-200 p-2 text-sm font-mono"
                value={allowlistDraft}
                onChange={(e) => setAllowlistDraft(e.target.value)}
                placeholder={"alice@example.com\nbob@example.com"}
              />
              <Button size="sm" disabled={saveAllowlistMutation.isPending} onClick={() => saveAllowlistMutation.mutate(allowlistDraft)}>
                {saveAllowlistMutation.isPending ? "Saving..." : "Save Allowlist"}
              </Button>
            </div>
          </div>

          <div className="space-y-4 p-4 rounded-lg border-2 border-amber-300 bg-amber-50/70">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-700 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">Yardit Cost Protection</p>
                <p className="text-sm text-amber-800">
                  Master circuit breakers for services that can create variable charges or burn paid usage. Stripe payments stay available because its fees only occur when Yardit collects money.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-red-300 bg-red-50 p-3">
              <div>
                <p className="font-semibold text-red-900">Emergency Cost Lock</p>
                <p className="text-xs text-red-700">Immediately disables protected optional paid/external services while keeping Yardit's core database and account access online.</p>
              </div>
              <Switch
                checked={emergencyCostLock}
                onCheckedChange={(checked) => costSettingMutation.mutate({ key: "cost_emergency_lock", value: checked })}
                disabled={costSettingMutation.isPending}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[#2C4F4E]" />
                    <p className="font-bold text-slate-900">Usage vs Limit</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Update the provider-reported usage here. Yardit calculates remaining headroom and tells you when to warn, throttle, or shut off.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {usageServices.map((service) => {
                  const draft = usageDrafts[service.key] || { used: "0", limit: String(service.defaultLimit || "") };
                  const used = Math.max(0, Number(draft.used) || 0);
                  const limit = Math.max(0, Number(draft.limit) || 0);
                  const status = getUsageStatus(used, limit);
                  const remaining = limit > 0 ? Math.max(0, limit - used) : null;
                  const barPercent = Math.min(100, status.percent);
                  const updatedRaw = findSetting(`cost_usage_updated_${service.key}`)?.value;
                  const updatedLabel = updatedRaw ? new Date(updatedRaw).toLocaleString() : "Not updated yet";
                  const toneClasses = {
                    green: { bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800 border-emerald-200" },
                    amber: { bar: "bg-amber-500", badge: "bg-amber-100 text-amber-900 border-amber-200" },
                    orange: { bar: "bg-orange-500", badge: "bg-orange-100 text-orange-900 border-orange-200" },
                    red: { bar: "bg-red-600", badge: "bg-red-100 text-red-900 border-red-200" },
                    slate: { bar: "bg-slate-300", badge: "bg-slate-100 text-slate-700 border-slate-200" },
                  }[status.tone];

                  return (
                    <div key={service.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{service.label}</p>
                          <p className="text-[11px] text-slate-500">{service.source} • {service.unit}</p>
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${toneClasses.badge}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full transition-all ${toneClasses.bar}`} style={{ width: `${barPercent}%` }} />
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Used</p>
                          <p className="text-sm font-bold text-slate-800">{used.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Limit</p>
                          <p className="text-sm font-bold text-slate-800">{limit ? limit.toLocaleString() : "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Remaining</p>
                          <p className="text-sm font-bold text-slate-800">{remaining === null ? "—" : remaining.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-700">{limit ? `${status.percent.toFixed(1)}% used` : "Limit not set"}</span>
                        <span className={status.tone === "red" ? "font-bold text-red-700" : status.tone === "orange" ? "font-semibold text-orange-700" : status.tone === "amber" ? "font-semibold text-amber-700" : "text-slate-500"}>
                          {status.action}
                        </span>
                      </div>

                      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{service.note}</p>

                      <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
                        <label className="text-[10px] font-medium text-slate-500">
                          Current usage
                          <input
                            type="number"
                            min="0"
                            value={draft.used}
                            onChange={(e) => setUsageDrafts((prev) => ({ ...prev, [service.key]: { ...draft, used: e.target.value } }))}
                            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
                          />
                        </label>
                        <label className="text-[10px] font-medium text-slate-500">
                          Plan/free limit
                          <input
                            type="number"
                            min="0"
                            value={draft.limit}
                            onChange={(e) => setUsageDrafts((prev) => ({ ...prev, [service.key]: { ...draft, limit: e.target.value } }))}
                            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
                          />
                        </label>
                        <Button size="sm" variant="outline" className="self-end h-8 px-2" onClick={() => saveUsageMeter(service.key)}>
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span className="sr-only">Update {service.label}</span>
                        </Button>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                        <span>Last updated: {updatedLabel}</span>
                        {service.protectedSetting && status.percent >= hardStopPercent && (
                          <button
                            type="button"
                            onClick={() => costSettingMutation.mutate({ key: service.protectedSetting, value: false })}
                            className="rounded-md bg-red-600 px-2 py-1 font-bold text-white hover:bg-red-700"
                          >
                            Shut Off Now
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["cost_mapbox_enabled", mapboxEnabled, "Mapbox", "Stops paid Mapbox map requests.", MapIcon],
                ["cost_push_enabled", pushEnabled, "Push / OneSignal", "Stops external push delivery; Yardit bell history can remain.", BellRing],
                ["cost_email_enabled", emailEnabled, "Outbound Email", "Stops Base44/external email sends.", Mail],
                ["cost_uploads_enabled", uploadsEnabled, "File Uploads", "Master policy switch for user-uploaded media.", UploadCloud],
                ["cost_external_apis_enabled", externalApisEnabled, "Other External APIs", "Default kill switch for future paid integrations.", PlugZap],
              ].map(([key, checked, label, description, Icon]) => (
                <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-start gap-2">
                    <Icon className="w-4 h-4 text-[#2C4F4E] mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-xs text-slate-500">{description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={checked}
                    onCheckedChange={(value) => costSettingMutation.mutate({ key, value })}
                    disabled={costSettingMutation.isPending || emergencyCostLock}
                  />
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">Protection Thresholds</p>
              <p className="mt-1 text-xs text-slate-500">
                Yardit policy: warn first, throttle optional usage next, then hard-stop protected optional services. Provider billing alerts and quotas are a second independent layer.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <label className="text-xs text-slate-600">Warning %
                  <input type="number" min="1" max="95" value={costDraft.warning} onChange={(e) => setCostDraft((p) => ({ ...p, warning: e.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm" />
                </label>
                <label className="text-xs text-slate-600">Throttle %
                  <input type="number" min="2" max="99" value={costDraft.throttle} onChange={(e) => setCostDraft((p) => ({ ...p, throttle: e.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm" />
                </label>
                <label className="text-xs text-slate-600">Hard Stop %
                  <input type="number" min="3" max="100" value={costDraft.hardStop} onChange={(e) => setCostDraft((p) => ({ ...p, hardStop: e.target.value }))} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm" />
                </label>
              </div>
              <Button size="sm" className="mt-3" onClick={saveCostThresholds}>Save Thresholds</Button>
            </div>

            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
              <strong>Current policy:</strong> warn at {warningPercent}%, throttle at {throttlePercent}%, hard stop at {hardStopPercent}%.
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
            <div>
              <p className="font-semibold text-red-900">Delete Demo Data</p>
              <p className="text-sm text-red-700">
                Permanently delete all listings flagged as demo (and their related records).
              </p>
            </div>
            <Button 
              variant="destructive"
              disabled={deleteDemosMutation.isPending}
              onClick={() => {
                if (window.confirm("Are you sure you want to delete all demo listings? This cannot be undone.")) {
                  deleteDemosMutation.mutate();
                }
              }}
            >
              {deleteDemosMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Demo Listings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDemoModeInfo} onOpenChange={setShowDemoModeInfo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Demo Mode is now on</DialogTitle>
                <DialogDescription>Here is what changes while Demo Mode is active.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Address testing is unlocked</p>
              <p>You can select test addresses more freely while creating listings.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">One-listing test limit is unlocked</p>
              <p>You can create more test listings without the normal testing restriction.</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="font-semibold">Admins choose payment behavior</p>
              <p>Before Stripe checkout, admins can skip payment for testing or continue to Stripe to test the real payment flow.</p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowDemoModeInfo(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}