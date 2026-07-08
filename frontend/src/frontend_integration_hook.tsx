import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize your Supabase client
// In a standard Vite setup, these are loaded from your .env.local file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Fallback gracefully if keys are missing
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Lead {
  id?: string;
  company_name: string;
  industry: string;
  est_fleet_size: number;
  primary_vehicle_mix: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  usdot_number?: string;
  usdot_oos_rate?: number;
  localized_threat_hook?: string;
  lead_status?: string;
}

/**
 * useLeadData Hook
 * 
 * Automatically parses incoming URL search params for 'email' or 'lead_id'/'id'.
 * Queries the public.leads table in Supabase to fetch the matching lead record
 * to drive dynamic, zero-friction personalization on your landing page.
 */
export function useLeadData() {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLead() {
      try {
        setLoading(true);
        setError(null);

        // 1. Parse URL Query Parameters (e.g., ?email=john@goettl.com)
        const params = new URLSearchParams(window.location.search);
        const emailParam = params.get('email');
        const idParam = params.get('lead_id') || params.get('id');

        if (!emailParam && !idParam) {
          // No tracking params present in URL; landing page will show fallback generic mode
          setLoading(false);
          return;
        }

        // 2. Query Supabase leads table
        let query = supabase.from('leads').select('*');

        if (idParam) {
          query = query.eq('id', idParam);
        } else if (emailParam) {
          // Trim whitespace to handle copy-paste or email-sender padding
          query = query.eq('contact_email', emailParam.trim());
        }

        const { data, error: apiError } = await query.single();

        if (apiError) {
          // Code 'PGRST116' means 0 rows returned on a .single() query (no match)
          if (apiError.code === 'PGRST116') {
            setLoading(false);
            return;
          }
          throw apiError;
        }

        if (data) {
          setLead({
            id: data.id,
            company_name: data.company_name,
            industry: data.industry,
            est_fleet_size: Number(data.est_fleet_size) || 0,
            primary_vehicle_mix: data.primary_vehicle_mix || 'Service Vehicles',
            contact_name: data.contact_name,
            contact_email: data.contact_email,
            contact_phone: data.contact_phone,
            usdot_number: data.usdot_number,
            usdot_oos_rate: data.usdot_oos_rate ? Number(data.usdot_oos_rate) : undefined,
            localized_threat_hook: data.localized_threat_hook,
            lead_status: data.lead_status,
          });
        }
      } catch (err: any) {
        console.error('Error fetching lead data:', err);
        setError(err.message || 'An error occurred loading your fleet profile.');
      } finally {
        setLoading(false);
      }
    }

    fetchLead();
  }, []);

  return { lead, loading, error };
}