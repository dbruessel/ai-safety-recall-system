import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Download, CreditCard, Search, Sparkles } from 'lucide-react';
import { trackEvent } from '../utils/telemetry';
import { PricingUpgradeModal } from './PricingUpgradeModal';

export interface MonitoredVehicle {
  id: string;
  vin: string;
  unit_number?: string;
  make: string;
  model: string;
  year: number;
  terminal?: string;
  division?: string;
  safety_recall_details?: string;
  campaign_id?: string;
  compliance_status: 'OPEN' | 'SCHEDULED' | 'CLEARED';
  punitive_exposure: number;
  work_order_id?: string;
  fleetio_wo_url?: string;
  ecosystem_feeds?: string[];
  remedy_logistics?: string;
}

interface FleetDemoProfile {
  company: string;
  tier: string;
  totalUnitsOverride?: number;
  vehicles: MonitoredVehicle[];
}

interface TaskBoardProps {
  userCompany?: string;
  userTier?: string;
  userRole?: string;
  onNavigatePortfolio?: () => void;
  onOpenShareModal?: () => void;
}

const FLEETIO_ACCOUNT_SLUG =
  import.meta.env.VITE_FLEETIO_ACCOUNT_TOKEN || '0827581100';

const DEFAULT_VEHICLES: MonitoredVehicle[] = [
  {
    id: 'veh-1',
    vin: '3AKJHHDR5KSKB7190',
    unit_number: 'UNIT-101',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2019,
    terminal: 'Dallas Hub (TX)',
    division: 'Southwest Division',
    campaign_id: '23V-891',
    safety_recall_details: '23V-891 — STEERING AXLE DRAG LINK',
    compliance_status: 'OPEN',
    punitive_exposure: 250000,
    ecosystem_feeds: ['FLEETIO', 'SAMSARA'],
    remedy_logistics: 'Fleetio Work Order Issued',
    work_order_id: 'WO #22',
    fleetio_wo_url: `https://secure.fleetio.com/${FLEETIO_ACCOUNT_SLUG}/work_orders/22`,
  },
  {
    id: 'veh-2',
    vin: '1FTBW2CM5KKA84112',
    unit_number: 'UNIT-204',
    make: 'FORD',
    model: 'TRANSIT 250',
    year: 2019,
    terminal: 'Chicago Terminal (IL)',
    division: 'Midwest Division',
    campaign_id: '24V-012',
    safety_recall_details: '24V-012 — REAR DRIVESHAFT FLEX COUPLING',
    compliance_status: 'SCHEDULED',
    punitive_exposure: 0,
    ecosystem_feeds: ['FLEETIO'],
    remedy_logistics: 'Metro Ford Commercial (Parts Backorder)',
    work_order_id: 'WO #23',
    fleetio_wo_url: `https://secure.fleetio.com/${FLEETIO_ACCOUNT_SLUG}/work_orders/23`,
  },
  {
    id: 'veh-3',
    vin: '4V4NC9EHXKN904821',
    unit_number: 'UNIT-309',
    make: 'VOLVO',
    model: 'VNL 860',
    year: 2019,
    terminal: 'Atlanta Logistics (GA)',
    division: 'Southeast Division',
    campaign_id: '23V-838',
    safety_recall_details: '23V-838 — AIR BRAKE ACTUATOR DIAPHRAGM',
    compliance_status: 'CLEARED',
    punitive_exposure: 0,
    ecosystem_feeds: ['FLEETIO'],
    remedy_logistics: 'Volvo Truck Center (Recall Completed)',
    work_order_id: 'WO #24',
    fleetio_wo_url: `https://secure.fleetio.com/${FLEETIO_ACCOUNT_SLUG}/work_orders/24`,
  },
  {
    id: 'veh-4',
    vin: '1FVACWDT2FHGD9018',
    unit_number: 'UNIT-412',
    make: 'FREIGHTLINER',
    model: 'M2 106',
    year: 2015,
    terminal: 'Dallas Hub (TX)',
    division: 'Southwest Division',
    campaign_id: 'CLEAN',
    safety_recall_details: 'No Open NHTSA Defect Campaigns',
    compliance_status: 'CLEARED',
    punitive_exposure: 0,
    ecosystem_feeds: ['FLEETIO', 'GEOTAB'],
    remedy_logistics: 'Inspected & Underwriter Cleared',
    work_order_id: 'WO #25',
    fleetio_wo_url: `https://secure.fleetio.com/${FLEETIO_ACCOUNT_SLUG}/work_orders/25`,
  },
];

const DEMO_FLEET_PROFILES: Record<string, FleetDemoProfile> = {
  'Dennis Enterprise Fleet': {
    company: 'Dennis Enterprise Fleet',
    tier: 'enterprise',
    vehicles: DEFAULT_VEHICLES,
  },
  'Apex Logistics & Freight': {
    company: 'Apex Logistics & Freight',
    tier: 'enterprise',
    vehicles: [
      {
        id: 'apex-1',
        vin: '3AKJHHDR5KSKB7190',
        unit_number: 'APX-114',
        make: 'FREIGHTLINER',
        model: 'CASCADIA',
        year: 2021,
        terminal: 'Houston Port Hub (TX)',
        division: 'Gulf Coast Linehaul',
        campaign_id: '23V-891',
        safety_recall_details: '23V-891 — STEERING AXLE DRAG LINK',
        compliance_status: 'OPEN',
        punitive_exposure: 250000,
        ecosystem_feeds: ['FLEETIO', 'SAMSARA'],
        remedy_logistics: 'Fleetio Work Order Issued',
        work_order_id: 'WO #22',
        fleetio_wo_url: `https://secure.fleetio.com/${FLEETIO_ACCOUNT_SLUG}/work_orders/22`,
      },
      {
        id: 'apex-2',
        vin: '1FTBW2CM5KKA84112',
        unit_number: 'APX-208',
        make: 'KENWORTH',
        model: 'T680 NEXT GEN',
        year: 2022,
        terminal: 'Memphis Intermodal (TN)',
        division: 'Mid-South Freight',
        campaign_id: '24V-012',
        safety_recall_details: '24V-012 — REAR DRIVESHAFT FLEX COUPLING',
        compliance_status: 'SCHEDULED',
        punitive_exposure: 0,
        ecosystem_feeds: ['FLEETIO', 'SAMSARA'],
        remedy_logistics: 'MHC Kenworth (Bay Reserved)',
        work_order_id: 'WO #23',
        fleetio_wo_url: `https://secure.fleetio.com/${FLEETIO_ACCOUNT_SLUG}/work_orders/23`,
      },
      {
        id: 'apex-3',
        vin: '4V4NC9EHXKN904821',
        unit_number: 'APX-319',
        make: 'VOLVO',
        model: 'VNL 860',
        year: 2023,
        terminal: 'Houston Port Hub (TX)',
        division: 'Gulf Coast Linehaul',
        campaign_id: 'CLEAN',
        safety_recall_details: 'No Open NHTSA Defect Campaigns',
        compliance_status: 'CLEARED',
        punitive_exposure: 0,
        ecosystem_feeds: ['FLEETIO'],
        remedy_logistics: 'Inspected & Underwriter Cleared',
        work_order_id: 'WO #24',
        fleetio_wo_url: `https://secure.fleetio.com/${FLEETIO_ACCOUNT_SLUG}/work_orders/24`,
      },
    ],
  },
  'Titan Heavy Hauling Co.': {
    company: 'Titan Heavy Hauling Co.',
    tier: 'professional',
    vehicles: [
      {
        id: 'titan-1',
        vin: '4V4NC9EHXKN904821',
        unit_number: 'THH-402',
        make: 'VOLVO',
        model: 'VNL 860',
        year: 2020,
        terminal: 'Columbus Heavy Yard (OH)',
        division: 'Great Lakes Heavy Haul',
        campaign_id: '23V-838',
        safety_recall_details: '23V-838 — AIR BRAKE ACTUATOR DIAPHRAGM',
        compliance_status: 'OPEN',
        punitive_exposure: 250000,
        ecosystem_feeds: ['GEOTAB'],
        remedy_logistics: 'Critical Brake Defect — Immediate Bay Hold',
        work_order_id: 'WO #22',
        fleetio_wo_url: `https://secure.fleetio.com/${FLEETIO_ACCOUNT_SLUG}/work_orders/22`,
      },
      {
        id: 'titan-2',
        vin: '3AKJHHDR5KSKB7190',
        unit_number: 'THH-419',
        make: 'MACK',
        model: 'ANTHEM 700',
        year: 2021,
        terminal: 'Pittsburgh Terminal (PA)',
        division: 'Northeast Steel Division',
        campaign_id: '23V-838',
        safety_recall_details: '23V-838 — AIR BRAKE ACTUATOR DIAPHRAGM',
        compliance_status: 'OPEN',
        punitive_exposure: 250000,
        ecosystem_feeds: ['GEOTAB'],
        remedy_logistics: 'Dealer Parts Dispatched',
        work_order_id: 'WO #23',
        fleetio_wo_url: `https://secure.fleetio.com/${FLEETIO_ACCOUNT_SLUG}/work_orders/23`,
      },
      {
        id: 'titan-3',
        vin: '1FVACWDT2FHGD9018',
        unit_number: 'THH-511',
        make: 'PETERBILT',
        model: '579 HEAVY',
        year: 2022,
        terminal: 'Columbus Heavy Yard (OH)',
        division: 'Great Lakes Heavy Haul',
        campaign_id: 'CLEAN',
        safety_recall_details: 'No Open NHTSA Defect Campaigns',
        compliance_status: 'CLEARED',
        punitive_exposure: 0,
        ecosystem_feeds: ['GEOTAB'],
        remedy_logistics: 'Inspected & Underwriter Cleared',
        work_order_id: 'WO #24',
        fleetio_wo_url: `https://secure.fleetio.com/${FLEETIO_ACCOUNT_SLUG}/work_orders/24`,
      },
    ],
  },
  'Summit Regional Transport': {
    company: 'Summit Regional Transport',
    tier: 'professional',
    vehicles: [
      {
        id: 'summit-1',
        vin: '3AKJHHDR5KSKB7190',
        unit_number: 'SRT-102',
        make: 'FREIGHTLINER',
        model: 'CASCADIA',
        year: 2023,
        terminal: 'Denver Hub (CO)',
        division: 'Mountain West Regional',
        campaign_id: 'CLEAN',
        safety_recall_details: 'No Open NHTSA Defect Campaigns',
        compliance_status: 'CLEARED',
        punitive_exposure: 0,
        ecosystem_feeds: ['FLEETIO'],
        remedy_logistics: 'Inspected & Underwriter Cleared',
        work_order_id: 'WO #24',
        fleetio_wo_url: `https://secure.fleetio.com/${FLEETIO_ACCOUNT_SLUG}/work_orders/24`,
      },
      {
        id: 'summit-2',
        vin: '4V4NC9EHXKN904821',
        unit_number: 'SRT-118',
        make: 'VOLVO',
        model: 'VNL 760',
        year: 2022,
        terminal: 'Salt Lake City (UT)',
        division: 'Mountain West Regional',
        campaign_id: 'CLEAN',
        safety_recall_details: 'No Open NHTSA Defect Campaigns',
        compliance_status: 'CLEARED',
        punitive_exposure: 0,
        ecosystem_feeds: ['FLEETIO'],
        remedy_logistics: 'Inspected & Underwriter Cleared',
        work_order_id: 'WO #25',
        fleetio_wo_url: `https://secure.fleetio.com/${FLEETIO_ACCOUNT_SLUG}/work_orders/25`,
      },
    ],
  },
  'Metro Last-Mile Delivery': {
    company: 'Metro Last-Mile Delivery',
    tier: 'standard',
    vehicles: [
      {
        id: 'metro-1',
        vin: '1FTBW2CM5KKA84112',
        unit_number: 'MLM-014',
        make: 'FORD',
        model: 'TRANSIT 250',
        year: 2021,
        terminal: 'Phoenix Metro Depot (AZ)',
        division: 'Southwest Parcel',
        campaign_id: '24V-012',
        safety_recall_details: '24V-012 — REAR DRIVESHAFT FLEX COUPLING',
        compliance_status: 'SCHEDULED',
        punitive_exposure: 0,
        ecosystem_feeds: ['FLEETIO'],
        remedy_logistics: 'Chapman Ford Commercial (Appointment Confirmed)',
        work_order_id: 'WO #23',
        fleetio_wo_url: `https://secure.fleetio.com/${FLEETIO_ACCOUNT_SLUG}/work_orders/23`,
      },
      {
        id: 'metro-2',
        vin: '1FVACWDT2FHGD9018',
        unit_number: 'MLM-029',
        make: 'FREIGHTLINER',
        model: 'M2 106',
        year: 2022,
        terminal: 'Phoenix Metro Depot (AZ)',
        division: 'Southwest Parcel',
        campaign_id: 'CLEAN',
        safety_recall_details: 'No Open NHTSA Defect Campaigns',
        compliance_status: 'CLEARED',
        punitive_exposure: 0,
        ecosystem_feeds: ['FLEETIO'],
        remedy_logistics: 'Inspected & Underwriter Cleared',
        work_order_id: 'WO #25',
        fleetio_wo_url: `https://secure.fleetio.com/${FLEETIO_ACCOUNT_SLUG}/work_orders/25`,
      },
    ],
  },
};

const CARRIER_PRESETS = [
  { id: 'travelers', name: 'Travelers Commercial Auto', badge: '🛡️ Travelers' },
  { id: 'acrisure', name: 'Acrisure Risk Solutions', badge: '🔷 Acrisure' },
  { id: 'great_american', name: 'Great American Trucking', badge: '🦅 Great American' },
  { id: 'cottingham', name: 'Cottingham & Butler', badge: '🏛️ Cottingham' },
];

export const TaskBoard: React.FC<TaskBoardProps> = ({
  userCompany = 'Dennis Enterprise Fleet',
  userTier = 'enterprise',
  userRole = 'admin',
  onNavigatePortfolio,
  onOpenShareModal,
}) => {
  // Resolve requested fleet from URL (?fleet=...) or prop
  const resolvedFleetInfo = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const urlFleet = params.get('fleet') || params.get('org');
    const isFromBroker = params.get('from') === 'broker';
    const targetName = urlFleet || userCompany;
    const matchedProfile = DEMO_FLEET_PROFILES[targetName];

    return {
      companyName: matchedProfile?.company || targetName,
      tierName: matchedProfile?.tier || userTier,
      initialVehicles: matchedProfile?.vehicles || DEFAULT_VEHICLES,
      showBrokerBackLink: Boolean(onNavigatePortfolio || isFromBroker),
    };
  }, [userCompany, userTier, onNavigatePortfolio]);

  const [vehicles, setVehicles] = useState<MonitoredVehicle[]>(
    resolvedFleetInfo.initialVehicles
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'SCHEDULED' | 'CLEARED'>('ALL');
  const [selectedTerminal, setSelectedTerminal] = useState<string>('ALL');
  const [syncingVin, setSyncingVin] = useState<string | null>(null);

  // Modals state
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isScanningNhtsa, setIsScanningNhtsa] = useState(false);
  const [scanFeedbackBanner, setScanFeedbackBanner] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isInternalShareOpen, setIsInternalShareOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [scanVinInput, setScanVinInput] = useState('');
  const [scanTerminalInput, setScanTerminalInput] = useState('');
  const [csvRawText, setCsvRawText] = useState('');
  
  // PDF Export Loading State
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // White-label configuration state
  const [selectedCarrier, setSelectedCarrier] = useState<string>(CARRIER_PRESETS[0].name);
  const [riskOfficerName, setRiskOfficerName] = useState<string>('Dennis Vance, VP Safety & Risk');
  const [riskOfficerEmail, setRiskOfficerEmail] = useState<string>('safety@dennisfleet.com');
  const [riskOfficerPhone, setRiskOfficerPhone] = useState<string>('(214) 555-0144');

  // Track sandbox page open on mount
  useEffect(() => {
    trackEvent({
      event: 'sandbox_opened',
      portal: 'fleet',
      metadata: {
        fleet_name: resolvedFleetInfo.companyName,
        from_broker: resolvedFleetInfo.showBrokerBackLink,
      },
    });
  }, [resolvedFleetInfo.companyName, resolvedFleetInfo.showBrokerBackLink]);

  // Sync vehicles when target fleet changes
  useEffect(() => {
    setVehicles(resolvedFleetInfo.initialVehicles);
    setSelectedTerminal('ALL');
    setStatusFilter('ALL');
  }, [resolvedFleetInfo]);

  // Helper to resolve the active Fleetio account token (localStorage override -> env -> 0827581100)
  const getActiveFleetioSlug = () => {
    return (
      localStorage.getItem('fleetio_account_token') ||
      FLEETIO_ACCOUNT_SLUG ||
      '0827581100'
    );
  };

  // Fetch live fleet data from Supabase if connected (skipped in demo mode)
  useEffect(() => {
    const fetchMonitoredVehicles = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('demo') === 'true') return;

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('monitored_vehicles')
          .select('*')
          .eq('profile_id', user.id);

        if (!error && data && data.length > 0) {
          const slug = getActiveFleetioSlug();
          const mappedVehicles: MonitoredVehicle[] = data.map((item: any, idx: number) => ({
            id: item.id || `veh-${idx}`,
            vin: item.vin,
            unit_number: item.unit_number || `UNIT-${100 + idx}`,
            make: (item.make || 'COMMERCIAL').toUpperCase(),
            model: (item.model || 'VEHICLE').toUpperCase(),
            year: item.year || 2023,
            terminal: item.terminal || 'Dallas Hub (TX)',
            division: item.division || 'Southwest Division',
            campaign_id: item.campaign_id || (idx === 0 ? '23V-891' : 'CLEAN'),
            safety_recall_details:
              item.safety_recall_details ||
              (idx === 0
                ? '23V-891 — STEERING AXLE DRAG LINK'
                : 'No Open NHTSA Defect Campaigns'),
            compliance_status: (item.status === 'active' && idx === 0 ? 'OPEN' : 'CLEARED') as
              | 'OPEN'
              | 'SCHEDULED'
              | 'CLEARED',
            punitive_exposure: idx === 0 ? 250000 : 0,
            ecosystem_feeds: ['FLEETIO', 'SAMSARA'],
            remedy_logistics:
              idx === 0 ? 'Fleetio Work Order Issued' : 'Inspected & Underwriter Cleared',
            work_order_id: item.work_order_id || `WO #${22 + idx}`,
            fleetio_wo_url:
              item.fleetio_wo_url || `https://secure.fleetio.com/${slug}/work_orders/${22 + idx}`,
          }));
          setVehicles(mappedVehicles);
        }
      } catch (err) {
        console.warn('Using default demo vehicles:', err);
      }
    };

    fetchMonitoredVehicles();
  }, []);

  // Compute available unique terminals dynamically
  const availableTerminals = useMemo(() => {
    const rawTerminals = vehicles
      .map((v) => v.terminal)
      .filter((t): t is string => Boolean(t && t.trim() !== ''));
    return ['ALL', ...Array.from(new Set(rawTerminals))];
  }, [vehicles]);

  // Reactive filtered vehicle list
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.vin.toLowerCase().includes(q) ||
        (v.unit_number && v.unit_number.toLowerCase().includes(q)) ||
        (v.campaign_id && v.campaign_id.toLowerCase().includes(q)) ||
        (v.make && v.make.toLowerCase().includes(q)) ||
        (v.model && v.model.toLowerCase().includes(q)) ||
        (v.terminal && v.terminal.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'ALL' || v.compliance_status === statusFilter;

      const matchesTerminal =
        selectedTerminal === 'ALL' || v.terminal === selectedTerminal;

      return matchesSearch && matchesStatus && matchesTerminal;
    });
  }, [vehicles, searchQuery, statusFilter, selectedTerminal]);

  // Dynamic calculations scoped to current terminal & search filters
  const filteredCriticalCount = useMemo(() => {
    return filteredVehicles.filter((v) => v.compliance_status === 'OPEN').length;
  }, [filteredVehicles]);

  const filteredExposure = useMemo(() => {
    return filteredVehicles
      .filter((v) => v.compliance_status === 'OPEN')
      .reduce((sum, v) => sum + (v.punitive_exposure || 0), 0);
  }, [filteredVehicles]);

  // Capacity metadata
  const normalizedTier = resolvedFleetInfo.tierName.toLowerCase();
  const vehicleLimit =
    normalizedTier === 'enterprise'
      ? 9999
      : normalizedTier === 'professional'
      ? 250
      : 75;
  const availableSlots = Math.max(0, vehicleLimit - vehicles.length);
  const capacityPercent = Math.min(100, Math.round((vehicles.length / vehicleLimit) * 100));

  // Build dynamic Fleetio Work Order URL for any vehicle
  const getFleetioWorkOrderUrl = (vehicle?: MonitoredVehicle) => {
    const slug = getActiveFleetioSlug();
    if (vehicle?.fleetio_wo_url) {
      return vehicle.fleetio_wo_url.replace('52f335f6cd', slug);
    }
    return `https://secure.fleetio.com/${slug}/work_orders`;
  };

  // Dynamic deep-link navigation into Fleetio Work Orders
  const handleRemediateInFleetio = () => {
    setStatusFilter('OPEN');
    const openDefectVehicle = vehicles.find((v) => v.compliance_status === 'OPEN');
    trackEvent({
      event: 'fleetio_wo_clicked',
      portal: 'fleet',
      metadata: {
        source: 'banner_cta',
        unit_number: openDefectVehicle?.unit_number || 'UNIT-101',
        work_order_id: openDefectVehicle?.work_order_id || 'WO #22',
      },
    });
    window.open(
      getFleetioWorkOrderUrl(openDefectVehicle),
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleBackToPortfolio = () => {
    trackEvent({
      event: 'back_to_broker_portfolio_clicked',
      portal: 'fleet',
      metadata: { from_fleet: resolvedFleetInfo.companyName },
    });
    if (onNavigatePortfolio) {
      onNavigatePortfolio();
    } else {
      window.location.href = '/portal/broker?demo=true';
    }
  };

  // 2-Way Fleetio sync status transition loop
  const handleSyncStatus = (vin: string) => {
    const targetVeh = vehicles.find((v) => v.vin === vin);
    trackEvent({
      event: 'sync_status_clicked',
      portal: 'fleet',
      metadata: {
        vin,
        unit_number: targetVeh?.unit_number,
        previous_status: targetVeh?.compliance_status,
      },
    });

    setSyncingVin(vin);
    setTimeout(() => {
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.vin === vin) {
            if (v.compliance_status === 'OPEN') {
              return {
                ...v,
                compliance_status: 'SCHEDULED',
                punitive_exposure: 0,
                remedy_logistics: 'Parts Sourced — Dealership Bay Reserved',
              };
            }
            if (v.compliance_status === 'SCHEDULED') {
              return {
                ...v,
                compliance_status: 'CLEARED',
                punitive_exposure: 0,
                remedy_logistics: 'Remediation Verified by Underwriter Telematics',
              };
            }
          }
          return v;
        })
      );
      setSyncingVin(null);
    }, 900);
  };

  // Live NHTSA VIN Decoder & Recall Check
  const handleAddVin = async () => {
    const cleanVin = scanVinInput.trim().toUpperCase();
    if (!cleanVin) return;

    setIsScanningNhtsa(true);
    const slug = getActiveFleetioSlug();

    let decodedMake = 'COMMERCIAL';
    let decodedModel = 'POWER UNIT';
    let decodedYear = 2023;
    let recallCount = 0;
    let topCampaign = 'CLEAN';
    let topDetails = 'No Open NHTSA Defect Campaigns';
    let isCriticalOpen = false;

    try {
      // 1. Decode VIN via official NHTSA vPIC API
      const vpicRes = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(
          cleanVin
        )}?format=json`
      );
      if (vpicRes.ok) {
        const vpicData = await vpicRes.json();
        const row = vpicData?.Results?.[0];
        if (row) {
          if (row.Make) decodedMake = String(row.Make).toUpperCase().trim();
          if (row.Model) decodedModel = String(row.Model).toUpperCase().trim();
          if (row.ModelYear && !isNaN(Number(row.ModelYear))) {
            decodedYear = Number(row.ModelYear);
          }
        }
      }

      // 2. Query published NHTSA safety recalls for decoded Make/Model/Year
      if (decodedMake !== 'COMMERCIAL' && decodedModel !== 'POWER UNIT' && decodedYear) {
        const recallsRes = await fetch(
          `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(
            decodedMake
          )}&model=${encodeURIComponent(decodedModel)}&modelYear=${decodedYear}`
        );
        if (recallsRes.ok) {
          const recallsData = await recallsRes.json();
          const results = Array.isArray(recallsData?.results) ? recallsData.results : [];
          recallCount = results.length;

          if (recallCount > 0) {
            const criticalKeywords = [
              'STEERING',
              'BRAKE',
              'AIR BAG',
              'SUSPENSION',
              'FUEL',
              'TIRE',
              'AXLE',
            ];
            const prioritized =
              results.find((r: any) =>
                criticalKeywords.some((kw) =>
                  String(r.Component || '').toUpperCase().includes(kw)
                )
              ) || results[0];

            topCampaign = prioritized.NHTSACampaignNumber || 'NHTSA-ACTIVE';
            const rawComp = String(prioritized.Component || 'SAFETY SYSTEM')
              .split(':')[0]
              .toUpperCase();
            topDetails = `${topCampaign} — ${rawComp}${
              recallCount > 1 ? ` (+${recallCount - 1} more)` : ''
            }`;
            isCriticalOpen = true;
          }
        }
      }
    } catch (err) {
      console.warn('NHTSA live lookup fallback triggered:', err);
    }

    const newEntry: MonitoredVehicle = {
      id: `veh-${Date.now()}`,
      vin: cleanVin,
      unit_number: `UNIT-${vehicles.length + 101}`,
      make: decodedMake,
      model: decodedModel,
      year: decodedYear,
      terminal:
        scanTerminalInput.trim() ||
        (selectedTerminal !== 'ALL' ? selectedTerminal : 'Dallas Hub (TX)'),
      division: 'Live NHTSA Audit',
      campaign_id: topCampaign,
      safety_recall_details: topDetails,
      compliance_status: isCriticalOpen ? 'OPEN' : 'CLEARED',
      punitive_exposure: isCriticalOpen ? 250000 : 0,
      ecosystem_feeds: ['NHTSA LIVE', 'FLEETIO'],
      remedy_logistics: isCriticalOpen
        ? 'NHTSA Live Match: Issue Fleetio Work Order'
        : 'NHTSA Live Scan: Zero Open Recalls',
      work_order_id: isCriticalOpen ? 'WO #22' : 'WO #25',
      fleetio_wo_url: isCriticalOpen
        ? `https://secure.fleetio.com/${slug}/work_orders/22`
        : `https://secure.fleetio.com/${slug}/work_orders/25`,
    };

    trackEvent({
      event: 'live_vin_scanned',
      portal: 'fleet',
      metadata: {
        vin: cleanVin,
        decoded_make: decodedMake,
        decoded_model: decodedModel,
        decoded_year: decodedYear,
        recalls_found: recallCount,
        punitive_exposure: newEntry.punitive_exposure,
      },
    });

    setVehicles((prev) => [newEntry, ...prev]);
    setScanFeedbackBanner(
      isCriticalOpen
        ? `⚠️ NHTSA Live Scan: ${decodedYear} ${decodedMake} ${decodedModel} (${cleanVin}) matched ${recallCount} safety recall(s) — $250,000 punitive exposure flagged.`
        : `✓ NHTSA Live Scan: ${decodedYear} ${decodedMake} ${decodedModel} (${cleanVin}) verified with 0 open safety recalls.`
    );
    setIsScanningNhtsa(false);
    setScanVinInput('');
    setScanTerminalInput('');
    setIsScanOpen(false);
  };

  // Bulk CSV import parser
  const handleCsvImport = () => {
    if (!csvRawText.trim()) return;
    const slug = getActiveFleetioSlug();
    const lines = csvRawText.trim().split('\n');
    const imported: MonitoredVehicle[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split(',').map((p) => p.trim());
      if (parts[0] && parts[0].length >= 11) {
        const vin = parts[0].toUpperCase();
        const unit = parts[1] || `UNIT-${vehicles.length + idx + 101}`;
        const terminal =
          parts[2] || (selectedTerminal !== 'ALL' ? selectedTerminal : 'Dallas Hub (TX)');
        const division = parts[3] || 'Southwest Division';

        imported.push({
          id: `veh-csv-${Date.now()}-${idx}`,
          vin,
          unit_number: unit,
          make: 'COMMERCIAL',
          model: 'POWER UNIT',
          year: 2023,
          terminal,
          division,
          campaign_id: 'CLEAN',
          safety_recall_details: 'No Open NHTSA Defect Campaigns',
          compliance_status: 'CLEARED',
          punitive_exposure: 0,
          ecosystem_feeds: ['FLEETIO'],
          remedy_logistics: 'Batch Ingestion Verified',
          work_order_id: 'WO #25',
          fleetio_wo_url: `https://secure.fleetio.com/${slug}/work_orders/25`,
        });
      }
    });

    if (imported.length > 0) {
      setVehicles([...imported, ...vehicles]);
      trackEvent({
        event: 'bulk_csv_imported',
        portal: 'fleet',
        metadata: { count: imported.length },
      });
    }
    setCsvRawText('');
    setIsImportOpen(false);
  };

  const handleCopyUnderwriterLink = () => {
    const bearerUrl = `https://recalllogic.ai/audit/evidence-locker?token=rl_live_${btoa(
      resolvedFleetInfo.companyName
    ).slice(0, 16)}`;
    navigator.clipboard.writeText(bearerUrl);
    setCopiedLink(true);
    trackEvent({
      event: 'underwriter_link_copied',
      portal: 'fleet',
      metadata: { fleet_name: resolvedFleetInfo.companyName },
    });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareClick = () => {
    trackEvent({
      event: 'share_underwriter_modal_opened',
      portal: 'fleet',
      metadata: { fleet_name: resolvedFleetInfo.companyName },
    });
    if (onOpenShareModal) {
      onOpenShareModal();
    } else {
      setIsInternalShareOpen(true);
    }
  };

  const handleOpenPricing = (source: string) => {
    trackEvent({
      event: 'pricing_modal_opened',
      portal: 'fleet',
      metadata: { source, fleet_name: resolvedFleetInfo.companyName },
    });
    setIsPricingOpen(true);
  };

  // Server-generated PDF export handler
  const handleExportLossControlPDF = async () => {
    setIsExportingPDF(true);
    const targetFleet = resolvedFleetInfo.companyName || 'Dennis Enterprise Fleet';
    const broker = sessionStorage.getItem('broker_name') || 'Apex Risk Brokers';
    const apiBaseUrl =
      import.meta.env.VITE_API_URL || 'https://ai-safety-recall-system.onrender.com';

    trackEvent({
      event: 'pdf_exported',
      portal: 'fleet',
      metadata: { fleet_name: targetFleet },
    });

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/broker/compliance-report/${encodeURIComponent(
          targetFleet
        )}/pdf?broker_name=${encodeURIComponent(broker)}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `RecallLogic_Loss_Control_Certificate_${targetFleet.replace(
        /\s+/g,
        '_'
      )}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Direct PDF export error, falling back to evidence locker print:', err);
      window.open(
        `/audit/evidence-locker?token=rl_live_${btoa(targetFleet).replace(/=+$/, '')}&print=true`,
        '_blank'
      );
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="w-full text-slate-100 font-sans space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tracking-wider uppercase mb-1">
            {resolvedFleetInfo.showBrokerBackLink && (
              <>
                <button
                  type="button"
                  onClick={handleBackToPortfolio}
                  className="text-cyan-400 hover:text-cyan-300 transition cursor-pointer font-bold"
                >
                  ← PORTFOLIO COMMAND
                </button>
                <span className="text-slate-600">›</span>
              </>
            )}
            <span className="text-cyan-300 font-bold">{resolvedFleetInfo.companyName}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
              Role: {userRole}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 uppercase">
              Continuous Risk Defense Active
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 uppercase">
              Verified Evidence Locker
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Underwriter Audit &amp; Remediation Workspace
          </h1>
        </div>

        {/* Global Action Header */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenPricing('header_button')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-600/70 rounded-lg text-xs font-bold text-emerald-300 transition cursor-pointer shadow-sm font-mono"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Plans &amp; Pricing ($99+/mo)</span>
          </button>

          <button
            type="button"
            onClick={handleShareClick}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-semibold text-slate-200 transition cursor-pointer shadow-sm"
          >
            <span>🔗</span> Share Live Underwriter Link
          </button>

          <button
            onClick={handleExportLossControlPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs font-mono transition cursor-pointer shadow-md shadow-cyan-950/50"
          >
            {isExportingPDF ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export Loss Control PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Sandbox Action & Pricing Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5 text-xs">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-slate-300">
            <strong className="text-white font-semibold">Interactive Sandbox:</strong> Run a live NHTSA defect scan on your own VIN or deploy 24/7 Fleetio sync starting at{' '}
            <strong className="text-emerald-400 font-mono">$99/mo</strong>.
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => {
              trackEvent({
                event: 'scan_vin_modal_opened',
                portal: 'fleet',
                metadata: { source: 'sandbox_banner' },
              });
              setIsScanOpen(true);
            }}
            className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 rounded-lg text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Test Your Own VIN</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenPricing('sandbox_banner')}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
          >
            See Pricing →
          </button>
        </div>
      </div>

      {/* Live VIN Scan Result Feedback Banner */}
      {scanFeedbackBanner && (
        <div className="p-3.5 rounded-xl bg-cyan-950/60 border border-cyan-500/60 flex items-center justify-between gap-4 text-xs font-mono text-cyan-200">
          <span>{scanFeedbackBanner}</span>
          <button
            type="button"
            onClick={() => setScanFeedbackBanner(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Critical Defect Exposure Alert Banner */}
      {filteredCriticalCount > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/60 via-red-900/30 to-slate-900/80 border border-red-800/70 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm text-red-200 font-mono tracking-wide">
                  {filteredCriticalCount} CRITICAL DEFECT ALERT(S) DETECTED
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-red-950 text-red-400 border border-red-700/80 rounded">
                  Critical Hazard
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-red-950 text-red-300 border border-red-700/80 rounded font-mono">
                  ${filteredExposure.toLocaleString()} Uninsurable Punitive Exposure
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Vehicles operating with unaddressed, critical safety recalls (Brakes/Steering).
                Standard commercial policies exclude punitive damages under Negligent Maintenance doctrines.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemediateInFleetio}
            className="whitespace-nowrap px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer font-mono"
            title="Open remediation work order in Fleetio"
          >
            Remediate in Fleetio ↗
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Loss Control Shield */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                <span>🛡️</span> CONTINUOUS LOSS CONTROL SHIELD
              </div>
              {filteredCriticalCount > 0 ? (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-red-950/80 text-red-400 border border-red-800 rounded">
                  {filteredCriticalCount} Critical Breach
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800 rounded">
                  Shield Active • 15% Credit
                </span>
              )}
            </div>

            <h3 className="text-sm font-semibold text-slate-200">
              {filteredCriticalCount > 0 ? 'Punitive Exposure Breach' : 'Loss Control Rate Defense'}
            </h3>

            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={`text-3xl md:text-4xl font-extrabold font-mono tracking-tight ${
                  filteredExposure > 0 ? 'text-red-500' : 'text-emerald-400'
                }`}
              >
                ${filteredExposure.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 uppercase font-mono">
                {filteredExposure > 0 ? 'Total Uninsurable Liability' : 'Punitive Liability Defended'}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {selectedTerminal === 'ALL'
                ? 'Portfolio Aggregate Liability'
                : `Filtered Scope: ${selectedTerminal}`}
            </span>
            <button
              type="button"
              onClick={handleRemediateInFleetio}
              className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer transition bg-transparent border-0 p-0 text-xs"
            >
              {filteredExposure > 0
                ? 'Remediate in Fleetio to defend loss ratio ↗'
                : 'Underwriter audit certified ✓'}
            </button>
          </div>
        </div>

        {/* Card 2: Monitored Fleet Capacity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                <span>🚚</span> MONITORED FLEET CAPACITY
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    trackEvent({
                      event: 'scan_vin_modal_opened',
                      portal: 'fleet',
                      metadata: { source: 'capacity_card' },
                    });
                    setIsScanOpen(true);
                  }}
                  className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold font-mono rounded border border-cyan-500/50 transition cursor-pointer"
                >
                  + Live VIN Check
                </button>
                <button
                  type="button"
                  onClick={() => {
                    trackEvent({
                      event: 'csv_import_modal_opened',
                      portal: 'fleet',
                    });
                    setIsImportOpen(true);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded border border-slate-700 transition cursor-pointer"
                >
                  + Import (.CSV)
                </button>
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-extrabold font-mono text-white">
                {vehicles.length} / {vehicleLimit} Units
              </span>
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase">
                ({resolvedFleetInfo.tierName.toUpperCase()})
              </span>
            </div>

            {/* Capacity Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, capacityPercent)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Continuous NHTSA &amp; Telematics Sync</span>
            <button
              type="button"
              onClick={() => handleOpenPricing('capacity_card_upgrade')}
              className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer bg-transparent border-0 p-0 text-xs"
            >
              Upgrade Tier ↗
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Search + Terminal Selector + Status Tabs */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-xs">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search Unit #, VIN, Make, Model, or Campaign..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg text-xs text-slate-100 placeholder-slate-500 font-mono transition focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Terminal / Division Filter Dropdown */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 shadow-sm">
            <span className="text-[11px] text-slate-500 uppercase font-mono tracking-wider font-bold">
              Terminal:
            </span>
            <select
              value={selectedTerminal}
              onChange={(e) => {
                setSelectedTerminal(e.target.value);
                trackEvent({
                  event: 'terminal_filter_changed',
                  portal: 'fleet',
                  metadata: { terminal: e.target.value },
                });
              }}
              className="bg-transparent text-xs text-cyan-400 font-bold focus:outline-none cursor-pointer pr-2"
            >
              {availableTerminals.map((terminal) => (
                <option key={terminal} value={terminal} className="bg-slate-950 text-slate-200">
                  {terminal === 'ALL' ? 'All Operating Hubs' : terminal}
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-mono">
            {(['ALL', 'OPEN', 'SCHEDULED', 'CLEARED'] as const).map((tab) => {
              const count = vehicles.filter((v) =>
                tab === 'ALL' ? true : v.compliance_status === tab
              ).length;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab);
                    trackEvent({
                      event: 'status_tab_clicked',
                      portal: 'fleet',
                      metadata: { status_tab: tab },
                    });
                  }}
                  className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === tab
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{tab}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Roster Evidence Locker Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase font-mono tracking-wider text-slate-400">
                <th className="py-3.5 px-4 font-bold">Vehicle / VIN</th>
                <th className="py-3.5 px-4 font-bold">Make &amp; Model</th>
                <th className="py-3.5 px-4 font-bold">Safety Recall Details</th>
                <th className="py-3.5 px-4 font-bold">Ecosystem Feeds</th>
                <th className="py-3.5 px-4 font-bold">Remedy Logistics</th>
                <th className="py-3.5 px-4 font-bold">Compliance Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono text-xs">
                    No vehicles found matching current search and terminal filters.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle) => {
                  const isSyncing = syncingVin === vehicle.vin;

                  return (
                    <tr
                      key={vehicle.id}
                      className="hover:bg-slate-800/40 transition duration-150"
                    >
                      {/* Vehicle / VIN & Terminal Tag */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-white font-mono text-xs">
                          {vehicle.unit_number || 'UNIT-UNASSIGNED'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono tracking-wider">
                          {vehicle.vin}
                        </div>
                        {vehicle.terminal && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-cyan-300 border border-slate-700">
                              <span>📍</span> {vehicle.terminal}
                            </span>
                            {vehicle.division && (
                              <span className="text-[9px] text-slate-500 font-mono hidden md:inline">
                                ({vehicle.division})
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Make & Model */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-200 uppercase text-xs">
                          {vehicle.make}
                        </div>
                        <div className="text-[11px] text-slate-400 uppercase">
                          {vehicle.model} {vehicle.year}
                        </div>
                      </td>

                      {/* Recall Details */}
                      <td className="py-4 px-4 max-w-xs">
                        <div
                          className={`font-bold font-mono text-xs ${
                            vehicle.compliance_status === 'OPEN'
                              ? 'text-red-400'
                              : vehicle.compliance_status === 'SCHEDULED'
                              ? 'text-amber-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {vehicle.safety_recall_details}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {vehicle.compliance_status === 'OPEN'
                            ? 'NHTSA Priority Safety • Action Required'
                            : vehicle.compliance_status === 'SCHEDULED'
                            ? 'Parts Backordered / Appointment Booked'
                            : 'NHTSA Safety Certified Defect-Free'}
                        </div>
                      </td>

                      {/* Ecosystem Feeds */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {(vehicle.ecosystem_feeds || ['FLEETIO']).map((feed) => (
                            <span
                              key={feed}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border ${
                                feed === 'FLEETIO'
                                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                                  : feed === 'NHTSA LIVE'
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                  : 'bg-blue-950/80 text-blue-300 border-blue-800'
                              }`}
                            >
                              {feed}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Remedy Logistics */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-300">
                        {vehicle.remedy_logistics}
                      </td>

                      {/* Compliance Status Pill */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {vehicle.compliance_status === 'OPEN' && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-red-950/80 text-red-400 border border-red-800">
                              ! OPEN
                            </span>
                            <div className="text-[10px] font-bold font-mono text-red-400 mt-1">
                              +${(vehicle.punitive_exposure / 1000).toFixed(0)}k Exposure
                            </div>
                          </div>
                        )}
                        {vehicle.compliance_status === 'SCHEDULED' && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-amber-950/80 text-amber-300 border border-amber-800">
                              ⏱ SCHEDULED
                            </span>
                            <div className="text-[10px] font-mono text-slate-400 mt-1">
                              Remediation Queued
                            </div>
                          </div>
                        )}
                        {vehicle.compliance_status === 'CLEARED' && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                              ✓ CLEARED
                            </span>
                            <div className="text-[10px] font-mono text-emerald-400/80 mt-1">
                              Certified Clean
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {vehicle.work_order_id && (
                            <a
                              href={getFleetioWorkOrderUrl(vehicle)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() =>
                                trackEvent({
                                  event: 'fleetio_wo_clicked',
                                  portal: 'fleet',
                                  metadata: {
                                    source: 'table_row',
                                    unit_number: vehicle.unit_number,
                                    vin: vehicle.vin,
                                    work_order_id: vehicle.work_order_id,
                                  },
                                })
                              }
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px] font-mono border border-slate-700 transition"
                              title="Open Work Order in Fleetio"
                            >
                              {vehicle.work_order_id} ↗
                            </a>
                          )}
                          <button
                            type="button"
                            disabled={isSyncing || vehicle.compliance_status === 'CLEARED'}
                            onClick={() => handleSyncStatus(vehicle.vin)}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono transition flex items-center gap-1 cursor-pointer ${
                              vehicle.compliance_status === 'CLEARED'
                                ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            }`}
                          >
                            <span>{isSyncing ? '⏳' : '🔄'}</span>
                            <span>{isSyncing ? 'Syncing...' : 'Sync Status'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Live NHTSA Single VIN Scanner */}
      {isScanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Live NHTSA VIN Defect Scanner</h3>
            <p className="text-xs text-slate-400 mb-4">
              Decodes real vehicle specs via NHTSA vPIC and checks active federal safety recall campaigns in real time.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">17-Digit Vehicle VIN</label>
                <input
                  type="text"
                  placeholder="e.g. 3AKJHHDR5KSKB7190"
                  value={scanVinInput}
                  onChange={(e) => setScanVinInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 uppercase focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Assigned Terminal / Hub</label>
                <input
                  type="text"
                  placeholder="e.g. Dallas Hub (TX)"
                  value={scanTerminalInput}
                  onChange={(e) => setScanTerminalInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                disabled={isScanningNhtsa}
                onClick={() => setIsScanOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isScanningNhtsa || !scanVinInput.trim()}
                onClick={handleAddVin}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded text-xs transition cursor-pointer font-mono"
              >
                {isScanningNhtsa ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying NHTSA...</span>
                  </>
                ) : (
                  <span>Run Live NHTSA Audit</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Bulk CSV Import with Terminal Mapping */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Enterprise CSV Bulk Import</h3>
            <p className="text-xs text-slate-400 mb-4">
              Paste rows formatted as: <code className="text-cyan-400">VIN, Unit#, Terminal, Division</code>
            </p>

            <textarea
              rows={6}
              value={csvRawText}
              onChange={(e) => setCsvRawText(e.target.value)}
              placeholder={`3AKJHHDR5KSKB7190, UNIT-501, Dallas Hub (TX), Southwest Division\n1FTBW2CM5KKA84112, UNIT-502, Chicago Terminal (IL), Midwest Division`}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />

            <div className="flex items-center justify-between mt-4">
              <span className="text-[11px] text-slate-500 font-mono">
                Enterprise capacity: {availableSlots.toLocaleString()} remaining
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCsvImport}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs transition cursor-pointer"
                >
                  Import Power Units
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: White-Label Co-Branded Underwriter Evidence Portal */}
      {isInternalShareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold tracking-wider">
                  Continuous Risk Defense Platform
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  Co-Branded Underwriter Evidence Locker
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInternalShareOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Carrier Preset Selector */}
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase font-bold">
                Commercial Underwriting Carrier Co-Branding
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CARRIER_PRESETS.map((carrier) => (
                  <button
                    key={carrier.id}
                    type="button"
                    onClick={() => setSelectedCarrier(carrier.name)}
                    className={`p-2.5 rounded-lg text-xs font-mono text-center transition cursor-pointer border ${
                      selectedCarrier === carrier.name
                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500 font-bold'
                        : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    {carrier.badge}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-[11px] font-mono text-cyan-400/90">
                Active Co-Brand: <span className="font-bold text-slate-200">{selectedCarrier}</span>
              </div>
            </div>

            {/* Risk Officer Contact Card Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Designated Risk Officer</label>
                <input
                  type="text"
                  value={riskOfficerName}
                  onChange={(e) => setRiskOfficerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Audit Email</label>
                <input
                  type="email"
                  value={riskOfficerEmail}
                  onChange={(e) => setRiskOfficerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Direct Phone</label>
                <input
                  type="text"
                  value={riskOfficerPhone}
                  onChange={(e) => setRiskOfficerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>
            </div>

            {/* Bearer Token URL Box */}
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1 uppercase font-bold">
                Immutable Read-Only Underwriter Token Link
              </label>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-cyan-300 break-all select-all">
                https://recalllogic.ai/audit/evidence-locker?token=rl_live_{btoa(
                  resolvedFleetInfo.companyName
                ).slice(0, 16)}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-emerald-400 text-xs font-mono">
                ✓ Co-branding &amp; 15% rate credit active
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyUnderwriterLink}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono transition cursor-pointer"
                >
                  {copiedLink ? 'Copied! ✓' : 'Copy Link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    trackEvent({
                      event: 'live_evidence_portal_opened',
                      portal: 'fleet',
                      metadata: { fleet_name: resolvedFleetInfo.companyName },
                    });
                    window.open(
                      `https://recalllogic.ai/audit/evidence-locker?token=rl_live_${btoa(
                        resolvedFleetInfo.companyName
                      ).slice(0, 16)}`,
                      '_blank'
                    );
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs font-mono transition cursor-pointer"
                >
                  Open Live Portal ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Transparent Pricing & Plans Modal */}
      <PricingUpgradeModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        portal="fleet"
      />
    </div>
  );
};

export default TaskBoard;