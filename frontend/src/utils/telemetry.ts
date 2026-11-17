// src/utils/telemetry.ts
import { supabase } from '../supabaseClient';

export interface TelemetryPayload {
  event: string;
  portal: 'broker' | 'fleet' | 'evidence_locker' | 'landing';
  metadata?: Record<string, any>;
}

const VISITOR_STORAGE_KEY = 'rl_visitor_id';
const ATTRIBUTION_STORAGE_KEY = 'rl_utm_attribution';
const LOCAL_EVENT_LOG_KEY = 'rl_telemetry_events';
const DEBUG_FLAG_KEY = 'rl_debug_tracking';

function isDebugEnabled(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug_tracking') === 'true') {
      sessionStorage.setItem(DEBUG_FLAG_KEY, 'true');
      return true;
    }
    return sessionStorage.getItem(DEBUG_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

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
      'email',
      'company',
      'brokerage',
    ];

    let updated = false;
    keys.forEach((key) => {
      const val = params.get(key);
      if (val) {
        existing[key] = val.trim();
        updated = true;
      }
    });

    // Normalize prospect identity across pages (even when URL params change on drill-down)
    const rawEmail = params.get('email') || existing.email;
    if (rawEmail && rawEmail.includes('@')) {
      const cleanEmail = rawEmail.trim().toLowerCase();
      if (existing.prospect_email !== cleanEmail) {
        existing.prospect_email = cleanEmail;
        updated = true;
      }
    }

    const rawCompany =
      params.get('company') ||
      params.get('brokerage') ||
      params.get('broker') ||
      existing.company ||
      existing.brokerage ||
      existing.broker;
    if (rawCompany) {
      const cleanCompany = decodeURIComponent(rawCompany).trim();
      if (existing.prospect_company !== cleanCompany) {
        existing.prospect_company = cleanCompany;
        updated = true;
      }
    }

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

/**
 * Captures outbound prospect email + company from URL params (or sessionStorage)
 * and upserts into Supabase `broker_leads` across any portal page.
 */
export async function captureOutboundLead(
  portal: 'broker' | 'fleet' | 'evidence_locker' | 'landing',
  defaultSourceLabel = 'Outbound Click'
): Promise<{ email?: string; company?: string }> {
  const attribution = getSessionAttribution();
  const cleanEmail = attribution.prospect_email;
  const cleanCompany = attribution.prospect_company || `${portal.toUpperCase()} Prospect`;

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { company: attribution.prospect_company };
  }

  try {
    const { error } = await supabase.from('broker_leads').upsert(
      {
        email: cleanEmail,
        brokerage_name: cleanCompany,
        portfolio_size: defaultSourceLabel,
      },
      { onConflict: 'email', ignoreDuplicates: true }
    );

    if (!error) {
      await trackEvent({
        event: 'outbound_lead_captured',
        portal,
        metadata: { email: cleanEmail, brokerage_name: cleanCompany, source_label: defaultSourceLabel },
      });
    }
  } catch (err) {
    if (isDebugEnabled()) {
      console.error('[RecallLogic Telemetry] Outbound lead capture error:', err);
    }
  }

  return { email: cleanEmail, company: attribution.prospect_company };
}

export async function trackEvent({
  event,
  portal,
  metadata = {},
}: TelemetryPayload): Promise<void> {
  const debug = isDebugEnabled();
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

  // 1. Store locally in browser LocalStorage for instant inspection
  try {
    const prevRaw = localStorage.getItem(LOCAL_EVENT_LOG_KEY);
    const prev = prevRaw ? JSON.parse(prevRaw) : [];
    prev.unshift(record);
    localStorage.setItem(LOCAL_EVENT_LOG_KEY, JSON.stringify(prev.slice(0, 100)));
  } catch {
    // Ignore storage quota errors
  }

  if (debug) {
    console.info('[RecallLogic Telemetry] Firing event:', record);
  }

  // 2. Insert into Supabase `sandbox_events` and surface any table/RLS error
  try {
    const { error } = await supabase.from('sandbox_events').insert([record]);
    if (error) {
      if (debug) {
        console.error('[RecallLogic Telemetry] Supabase insert error:', error.message, error);
      }
    } else if (debug) {
      console.info('[RecallLogic Telemetry] Saved to Supabase sandbox_events ✓');
    }
  } catch (err) {
    if (debug) {
      console.error('[RecallLogic Telemetry] Unexpected insert exception:', err);
    }
  }
}