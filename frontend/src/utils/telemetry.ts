// src/utils/telemetry.ts
import { supabase } from '../supabaseClient';

export interface TelemetryPayload {
  event: string;
  portal: 'broker' | 'fleet' | 'evidence_locker';
  metadata?: Record<string, any>;
}

const VISITOR_STORAGE_KEY = 'rl_visitor_id';
const ATTRIBUTION_STORAGE_KEY = 'rl_utm_attribution';
const LOCAL_EVENT_LOG_KEY = 'rl_telemetry_events';

function getOrCreateVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!id) {
      id = `vis_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(VISITOR_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `vis_anon_${Date.now().toString(36)}`;
  }
}

export function getSessionAttribution(): Record<string, string> {
  try {
    const params = new URLSearchParams(window.location.search);
    const existingRaw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    const existing: Record<string, string> = existingRaw ? JSON.parse(existingRaw) : {};

    const keys = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'fleet',
      'org',
      'from',
      'demo',
      'broker',
    ];

    let updated = false;
    keys.forEach((key) => {
      const val = params.get(key);
      if (val) {
        existing[key] = val;
        updated = true;
      }
    });

    if (!existing.landing_path) {
      existing.landing_path = window.location.pathname + window.location.search;
      updated = true;
    }

    if (!existing.referrer && document.referrer) {
      existing.referrer = document.referrer;
      updated = true;
    }

    if (updated) {
      sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(existing));
    }

    return existing;
  } catch {
    return {};
  }
}

export async function trackEvent({
  event,
  portal,
  metadata = {},
}: TelemetryPayload): Promise<void> {
  const visitorId = getOrCreateVisitorId();
  const attribution = getSessionAttribution();
  const timestamp = new Date().toISOString();

  const record = {
    visitor_id: visitorId,
    event_name: event,
    portal,
    page_url: window.location.href,
    utm_source: attribution.utm_source || 'direct',
    utm_campaign: attribution.utm_campaign || 'untagged',
    utm_content: attribution.utm_content || '',
    metadata: {
      ...attribution,
      ...metadata,
      user_agent: navigator.userAgent,
      screen_width: window.innerWidth,
    },
    created_at: timestamp,
  };

  // 1. Store locally for instant session debugging
  try {
    const prevRaw = localStorage.getItem(LOCAL_EVENT_LOG_KEY);
    const prev = prevRaw ? JSON.parse(prevRaw) : [];
    prev.unshift(record);
    localStorage.setItem(LOCAL_EVENT_LOG_KEY, JSON.stringify(prev.slice(0, 100)));
  } catch {
    // Ignore storage quota errors
  }

  if (window.location.search.includes('debug_tracking=true')) {
    console.info('[RecallLogic Telemetry]', record);
  }

  // 2. Non-blocking POST to FastAPI backend (keepalive survives tab navigation)
  const apiBaseUrl =
    import.meta.env.VITE_API_URL || 'https://ai-safety-recall-system.onrender.com';

  try {
    fetch(`${apiBaseUrl}/api/telemetry/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Fail silently so UI never blocks
  }

  // 3. Direct Supabase insert into `sandbox_events` table (if configured)
  try {
    await supabase.from('sandbox_events').insert([record]);
  } catch {
    // Fail silently if table not yet created
  }
}