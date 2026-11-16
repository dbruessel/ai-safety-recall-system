import React from 'react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-16 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <a
            href="/"
            className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
          >
            &larr; Back to RecallLogic
          </a>
          <h1 className="text-3xl font-bold text-white mt-4">Privacy Policy</h1>
          <p className="text-sm text-slate-400 mt-2">
            Effective Date: November 16, 2026 &bull; Last Updated: November 16, 2026
          </p>
        </div>

        <p className="text-slate-300 leading-relaxed">
          RecallLogic (&ldquo;RecallLogic,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or
          &ldquo;us&rdquo;) provides automated commercial fleet safety recall monitoring, repair
          verification, and loss-control reporting through our web application and API integrations
          at <span className="text-white font-medium">recalllogic.ai</span> (collectively, the
          &ldquo;Service&rdquo;). This Privacy Policy explains how we collect, use, store, and
          protect information when you visit our website, create an account, or connect
          third-party fleet management integrations such as Fleetio.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">1. Information We Collect</h2>
          <h3 className="text-base font-medium text-slate-100">
            A. Account &amp; Contact Information
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>Full name and job title</li>
            <li>Business email address and phone number</li>
            <li>Company or organization name, USDOT/MC identifiers (if provided), and billing details</li>
          </ul>

          <h3 className="text-base font-medium text-slate-100 pt-2">
            B. Fleet &amp; Integration Data (Fleetio &amp; Telematics Connectors)
          </h3>
          <p className="text-slate-300">
            When you authorize RecallLogic to connect with your fleet management platform (such as
            Fleetio via read-only API key and Account Token) or upload fleet rosters, we access only
            the least-privilege data scopes required to deliver the Service:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>
              <strong>Vehicle Roster Data:</strong> Vehicle Identification Numbers (VINs), unit
              numbers, year, make, model, and active/inactive vehicle status.
            </li>
            <li>
              <strong>Maintenance &amp; Compliance Records:</strong> Read-only metadata related to
              safety recalls, open or resolved maintenance issues, and closed work orders used
              strictly to verify recall remediation and generate Loss Control Certificates.
            </li>
            <li>
              <strong>No Driver Personal Data Required:</strong> RecallLogic does not require or
              collect driver Social Security numbers, driver&rsquo;s license numbers, or personal
              background records to perform NHTSA recall monitoring.
            </li>
          </ul>

          <h3 className="text-base font-medium text-slate-100 pt-2">
            C. Usage &amp; Technical Telemetry
          </h3>
          <p className="text-slate-300">
            We automatically collect basic operational logs—such as browser type, IP address, page
            interactions, and API sync status—to maintain platform reliability, prevent abuse, and
            troubleshoot integration errors.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">2. How We Use Information</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>
              <strong>Continuous NHTSA Recall Monitoring:</strong> Querying public National Highway
              Traffic Safety Administration (NHTSA) and OEM recall databases using your vehicle
              VINs, makes, models, and model years to detect open safety recalls.
            </li>
            <li>
              <strong>Automated Repair Verification &amp; Reporting:</strong> Matching NHTSA
              campaign IDs against closed maintenance issues and work orders in your connected fleet
              system to produce audit-ready Loss Control Certificates and compliance reports.
            </li>
            <li>
              <strong>Account &amp; Customer Support:</strong> Delivering recall alerts, responding
              to support inquiries at <span className="text-sky-400">support@recalllogic.ai</span>,
              and maintaining service security.
            </li>
            <li>
              <strong>Aggregated, De-Identified Benchmarks:</strong> Compiling anonymized,
              aggregated statistics that cannot identify any individual company, user, or specific
              VIN.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">
            3. Third-Party Integrations &amp; Data Sharing
          </h2>
          <p className="text-slate-300 font-medium">
            We do not sell, rent, or trade your personal information or fleet data to third parties.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>
              <strong>Authorized Underwriting / Broker Portals (At Your Direction):</strong> If you
              explicitly generate or share a Loss Control Certificate or authorize a commercial auto
              broker, MGA, captive, or insurer to view your fleet&rsquo;s recall compliance status,
              we share only the compliance reports you authorize.
            </li>
            <li>
              <strong>Infrastructure &amp; Subprocessors:</strong> Enterprise-grade cloud
              infrastructure providers (including Supabase/AWS for encrypted database hosting and
              authentication) bound by strict confidentiality and data-protection obligations.
            </li>
            <li>
              <strong>Public NHTSA APIs:</strong> VINs and vehicle attributes are transmitted to
              official NHTSA recall endpoints solely to retrieve public safety recall records.
            </li>
            <li>
              <strong>Legal Compliance:</strong> Disclosure if required by applicable law, subpoena,
              or valid governmental request.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">4. Data Security &amp; Retention</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-300">
            <li>
              <strong>Encryption:</strong> All data is encrypted in transit using TLS 1.2+ and
              encrypted at rest (AES-256) within isolated, role-based access-controlled databases.
            </li>
            <li>
              <strong>Credential Protection:</strong> Third-party API tokens (such as Fleetio API
              Keys and Account Tokens) are stored securely and accessed solely by automated sync
              workers scoped to your organization.
            </li>
            <li>
              <strong>Revocation &amp; Deletion:</strong> You may revoke RecallLogic&rsquo;s API
              access at any time. Upon account cancellation or written request to{' '}
              <span className="text-sky-400">support@recalllogic.ai</span>, we delete your
              organization&rsquo;s fleet records and API credentials within 30 days.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">5. Your Privacy Rights</h2>
          <p className="text-slate-300">
            Depending on your jurisdiction (including California under the CCPA/CPRA and the EEA/UK
            under the GDPR), you may request access to, correction of, or deletion of your personal
            information and connected fleet records by emailing{' '}
            <span className="text-sky-400">support@recalllogic.ai</span>. We respond within 30
            days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">6. Contact Us</h2>
          <p className="text-slate-300">
            <strong>RecallLogic</strong> &bull; Las Vegas, Nevada, United States
            <br />
            Email: <span className="text-sky-400">support@recalllogic.ai</span> &bull; Website:{' '}
            <span className="text-sky-400">https://recalllogic.ai</span>
          </p>
        </section>
      </div>
    </div>
  );
};