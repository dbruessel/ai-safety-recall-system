import React, { useState } from 'react';

interface SamsaraIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: (syncedCount: number) => void;
}

export const SamsaraIntegrationModal: React.FC<SamsaraIntegrationModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [apiToken, setApiToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'syncing' | 'connected' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  if (!isOpen) return null;

  const webhookUrl = `${window.location.origin}/api/integrations/samsara/webhook`;

  const handleConnectAndSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('connecting');
    setMessage('');

    try {
      const connectRes = await fetch('/api/integrations/samsara/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_token: apiToken,
          webhook_secret: webhookSecret || null,
          auto_sync_enabled: true,
        }),
      });

      if (!connectRes.ok) {
        const err = await connectRes.json();
        throw new Error(err.detail || 'Could not verify Samsara token.');
      }

      setStatus('syncing');
      const syncRes = await fetch('/api/integrations/samsara/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Samsara-Token': apiToken,
        },
      });

      if (!syncRes.ok) {
        const err = await syncRes.json();
        throw new Error(err.detail || 'Vehicle sync failed.');
      }

      const syncData = await syncRes.json();
      setStatus('connected');
      setMessage(syncData.message);
      onSyncComplete?.(syncData.synced_vehicles);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Unexpected error connecting Samsara.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="inline-block rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
              ENTERPRISE TELEMATICS
            </span>
            <h2 className="mt-1 text-xl font-bold">Connect Samsara Fleet</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleConnectAndSync} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Samsara API Token
            </label>
            <input
              type="password"
              required
              placeholder="samsara_api_..."
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-400">
              Required scopes: <strong>Read Vehicles</strong>, <strong>Read Vehicle Statistics</strong>, and <strong>Read DVIRs</strong>.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">
              Webhook Signing Secret <span className="text-slate-500">(Optional)</span>
            </label>
            <input
              type="password"
              placeholder="Base64 secret from Samsara Settings → Webhooks"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Real-Time DVIR Webhook URL</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
                className="text-xs font-medium text-emerald-400 hover:underline"
              >
                Copy URL
              </button>
            </div>
            <code className="mt-1 block truncate text-xs text-slate-300">{webhookUrl}</code>
          </div>

          {message && (
            <div
              className={`rounded-lg p-3 text-sm ${
                status === 'error'
                  ? 'border border-red-500/30 bg-red-500/10 text-red-300'
                  : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === 'connecting' || status === 'syncing' || !apiToken}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {status === 'connecting'
                ? 'Verifying Token...'
                : status === 'syncing'
                ? 'Syncing VINs...'
                : 'Connect & Sync Fleet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};