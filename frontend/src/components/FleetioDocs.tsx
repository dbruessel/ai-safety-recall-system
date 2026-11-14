import React from 'react';

export const FleetioDocs: React.FC = () => {
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
          Connecting Fleetio to RecallLogic
        </h1>
        <p className="text-slate-300 text-lg mb-10 leading-relaxed">
          RecallLogic integrates directly with Fleetio to monitor active vehicle VINs against
          federal NHTSA safety recalls, correlate recall-specific repair Work Orders, and
          generate underwriter-ready Loss Control PDFs—with <strong>zero changes</strong> to how
          your shop creates or numbers Work Orders.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">
            1. Generate a Read-Only Fleetio API Key &amp; Account Token
          </h2>
          <ol className="list-decimal list-inside space-y-2.5 text-slate-300">
            <li>
              Log in to your <strong>Fleetio</strong> web dashboard as an Account Owner or
              Administrator.
            </li>
            <li>
              Click your profile menu in the top-right corner and select{' '}
              <strong>Account Settings → Manage API Keys</strong>.
            </li>
            <li>
              Click <strong>New API Key</strong>, label it <code className="text-sky-400">RecallLogic</code>,
              and copy both your <strong>API Key</strong> and <strong>Account Token</strong>.
            </li>
          </ol>
          <p className="text-sm text-slate-400 mt-3">
            Recommended: Generate the key under a dedicated read-only user role with access
            limited to Vehicles, Issues, and Work Orders.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">
            2. Connect Your Account in RecallLogic
          </h2>
          <ul className="list-disc list-inside space-y-2.5 text-slate-300">
            <li>
              <strong>Fleet Admins:</strong> Open <strong>Fleet Portal → Connect Fleetio</strong>,
              select <strong>Path 2: Direct API Entry</strong>, paste your API Key and Account
              Token, and click <strong>Connect &amp; Sync Fleetio</strong>.
            </li>
            <li>
              <strong>Commercial Insurance Brokers:</strong> Select{' '}
              <strong>Path 1: Request Client Access</strong>, enter your client&apos;s Fleet Safety
              or Maintenance Director email, and send a 1-click delegation link.
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">
            3. How Recall-Only Sync Works (Zero Shop Workflow Changes)
          </h2>
          <ul className="list-disc list-inside space-y-2.5 text-slate-300">
            <li>
              <strong>NHTSA VIN Anchoring:</strong> Pulls active vehicle VINs and checks them
              against live NHTSA safety recall campaigns.
            </li>
            <li>
              <strong>Behind-the-Scenes Work Order Filtering:</strong> Automatically correlates
              Fleetio <code className="text-sky-400">[Recall]</code> issues, NHTSA campaign IDs (
              <code className="text-sky-400">XXV-XXX</code>), and recall component repairs while
              silently omitting routine oil changes and preventive maintenance tasks.
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