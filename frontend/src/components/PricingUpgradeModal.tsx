import React from 'react';

export type SubscriptionTier = 'free' | 'standard' | 'professional' | 'enterprise';

export interface PricingUpgradeModalProps {
  isOpen: boolean;
  gateReason?: string;
  onClose: () => void;
  onSelectTier: (tier: SubscriptionTier) => void;
}

export const PricingUpgradeModal: React.FC<PricingUpgradeModalProps> = ({
  isOpen,
  gateReason,
  onClose,
  onSelectTier,
}) => {
  if (!isOpen) return null;

  const handleTierSelect = (tier: SubscriptionTier) => {
    onSelectTier(tier);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 text-gray-900 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Upgrade Subscription Plan</h3>
            {gateReason && <p className="text-xs text-blue-600 font-semibold mt-0.5">{gateReason}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {/* STANDARD TIER */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Standard</span>
              <p className="text-2xl font-extrabold text-gray-900">$99<span className="text-xs font-normal text-gray-500">/mo</span></p>
              <ul className="text-xs text-gray-600 space-y-1.5 mt-2">
                <li>✓ Up to 50 Vehicles</li>
                <li>✓ Continuous Monitoring</li>
                <li>✓ Full Workspace Access</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => handleTierSelect('standard')}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
            >
              Select Standard
            </button>
          </div>

          {/* PROFESSIONAL TIER */}
          <div className="p-4 rounded-xl border-2 border-indigo-600 bg-indigo-50/20 flex flex-col justify-between space-y-3 relative">
            <span className="absolute -top-3 right-3 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Recommended</span>
            <div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase">Professional</span>
              <p className="text-2xl font-extrabold text-gray-900">$249<span className="text-xs font-normal text-gray-500">/mo</span></p>
              <ul className="text-xs text-gray-600 space-y-1.5 mt-2">
                <li>✓ Up to 250 Vehicles</li>
                <li>✓ Single-VIN Scan Console</li>
                <li>✓ Signed PDF Compliance Card</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => handleTierSelect('professional')}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
            >
              Select Professional
            </button>
          </div>

          {/* ENTERPRISE TIER */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-900 text-white flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase">Enterprise</span>
              <p className="text-2xl font-extrabold text-white">Custom</p>
              <ul className="text-xs text-gray-300 space-y-1.5 mt-2">
                <li>✓ Unlimited Vehicles</li>
                <li>✓ Telematics Integrations</li>
                <li>✓ Dedicated Broker QBR</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => handleTierSelect('enterprise')}
              className="w-full py-2 bg-white text-gray-900 hover:bg-gray-100 font-bold text-xs rounded-lg transition cursor-pointer"
            >
              Select Enterprise
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingUpgradeModal;