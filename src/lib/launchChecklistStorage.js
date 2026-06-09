import { base44 } from '@/api/base44Client';

export const LAUNCH_CHECKLIST_STORAGE_KEY = 'yardit_launch_checklist';
export const LAUNCH_CHECKLIST_SETTING_KEY = 'launch_checklist_progress';

export function readLocalChecklist(defaults) {
  const stored = localStorage.getItem(LAUNCH_CHECKLIST_STORAGE_KEY);
  if (!stored) return defaults;

  try {
    return { ...defaults, ...JSON.parse(stored) };
  } catch {
    localStorage.removeItem(LAUNCH_CHECKLIST_STORAGE_KEY);
    return defaults;
  }
}

export async function loadSavedLaunchChecklist(defaults) {
  const records = await base44.entities.AppSetting.filter({ key: LAUNCH_CHECKLIST_SETTING_KEY });
  const record = records?.[0] || null;

  if (!record?.value) {
    return { recordId: record?.id || null, values: readLocalChecklist(defaults) };
  }

  try {
    const values = { ...defaults, ...JSON.parse(record.value) };
    localStorage.setItem(LAUNCH_CHECKLIST_STORAGE_KEY, JSON.stringify(values));
    return { recordId: record.id, values };
  } catch {
    return { recordId: record.id, values: readLocalChecklist(defaults) };
  }
}

export async function saveLaunchChecklist(values, settingId) {
  localStorage.setItem(LAUNCH_CHECKLIST_STORAGE_KEY, JSON.stringify(values));

  const payload = {
    key: LAUNCH_CHECKLIST_SETTING_KEY,
    value: JSON.stringify(values),
  };

  if (settingId) {
    await base44.entities.AppSetting.update(settingId, payload);
    return settingId;
  }

  const existing = await base44.entities.AppSetting.filter({ key: LAUNCH_CHECKLIST_SETTING_KEY });
  if (existing?.[0]?.id) {
    await base44.entities.AppSetting.update(existing[0].id, payload);
    return existing[0].id;
  }

  const created = await base44.entities.AppSetting.create(payload);
  return created.id;
}