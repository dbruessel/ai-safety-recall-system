import React from 'react';

export const SamsaraDocs: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <a
          href="/"
          className="inline-block text-sm text-sky-400 hover:text-sky-300 mb-8"
        >
          ← Back to RecallLogic
        </a>

        <h1 className="text-3xl font-bold tracking-tight mb-4">
          Connecting Samsara to RecallLogic
        </h1>
        <p className="text-slate-300 text-lg mb-10 leading-relaxed">
          RecallLogic integrates directly with Samsara to monitor active vehicle VINs against
          federal NHTSA safety recalls, correlate driver DVIR inspection defects and OBD
          odometer telemetry, and generate underwriter-ready Loss Control PDFs—with{' '}
          <strong>zero disruption</strong> to your drivers, ELDs, or gateway hardware.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">
            1. Generate a Read-Only Samsara API Token
          </h2>
          <ol className="list-decimal list-inside space-y-2.5 text-slate-300">
            <li>
              Log in to your <strong>Samsara Cloud</strong> dashboard as an Organization
              Administrator.
            </li>
            <li>
              Navigate to <strong>Settings → API Tokens</strong> in the left sidebar.
            </li>
            <li>
              Click <strong>+ Add an API Token</strong>, label it{' '}
              <code className="text-sky-400">RecallLogic</code>, select{' '}
              <strong>Granular Scopes (Read-Only)</strong>, and copy your generated token.
            </li>
          </ol>
          <p className="text-sm text-slate-400 mt-3">
            Required Read Scopes: <strong>Read Vehicles</strong>,{' '}
            <strong>Read Vehicle Statistics</strong> (for OBD odometer mileage), and{' '}
            <strong>Read DVIRs</strong> (for pre/post-trip defect correlation).
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">
            2. Connect Your Account in RecallLogic
          </h2>
          <ul className="list-disc list-inside space-y-2.5 text-slate-300">
            <li>
              <strong>Fleet Admins:</strong> Open{' '}
              <strong>Fleet Portal → Connect Samsara</strong>, select{' '}
              <strong>Path 2: Direct API Entry</strong>, paste your Samsara API Token, and
              click <strong>Connect &amp; Sync Samsara</strong>.
            </li>
            <li>
              <strong>Commercial Insurance Brokers:</strong> Select{' '}
              <strong>Path 1: Request Client Access</strong>, enter your client&apos;s Fleet
              Safety or IT Director email, and send a 1-click delegation link.
            </li>
            <li>
              <strong>Real-Time DVIR Webhooks (Optional):</strong> In Samsara{' '}
              <strong>Settings → Webhooks</strong>, add{' '}
              <code className="text-sky-400">
                https://ai-safety-recall-system.onrender.com/api/v1/integrations/samsara/webhook
              </code>{' '}
              and subscribe to <code className="text-sky-400">DvirSubmitted</code>,{' '}
              <code className="text-sky-400">VehicleCreated</code>, and{' '}
              <code className="text-sky-400">VehicleUpdated</code>.
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">
            3. How Telematics &amp; DVIR Recall Correlation Works
          </h2>
          <ul className="list-disc list-inside space-y-2.5 text-slate-300">
            <li>
              <strong>NHTSA VIN Anchoring:</strong> Pulls active power unit VINs from your
              Samsara gateway inventory and audits them continuously against live NHTSA safety
              recall campaigns.
            </li>
            <li>
              <strong>DVIR &amp; Odometer Risk Enrichment:</strong> Cross-references driver
              pre/post-trip DVIR safety defects and active OBD mileage against open recalls to
              flag high-exposure <code className="text-sky-400">Do Not Drive</code> or
              safety-critical campaigns for immediate remediation.
            </li>
            <li>
              <strong>Support:</strong> Need help connecting? Contact{' '}
              <a href="mailto:support@recalllogic.ai" className="text-sky-400 underline">
                support@recalllogic.ai
              </a>
              .
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};