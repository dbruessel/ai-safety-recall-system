import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';

// Initialize Stripe securely using Vite environment keys [cite: 2, 26]
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = loadStripe(stripePublishableKey);

interface CheckoutFormProps {
  clientSecret: string;
  onClose?: () => void;
}

export default function CheckoutForm({ clientSecret, onClose }: CheckoutFormProps) {
  if (!clientSecret) {
    return (
      <div className="w-full max-w-lg mx-auto bg-[#0b0f19]/80 border border-slate-900 rounded-2xl p-8 flex flex-col items-center justify-center space-y-4 shadow-2xl backdrop-blur-md">
        <div className="h-10 w-10 border-4 border-t-cyan-500 border-slate-800 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs font-mono uppercase tracking-wider animate-pulse">
          Provisioning Secure Payment Gateway...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto bg-[#0b0f19] border border-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none" />
      
      <header className="flex justify-between items-center border-b border-slate-900 pb-4 mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <h3 className="text-white font-black text-md uppercase tracking-tight">
            Secure Payment Terminal
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 font-bold font-mono text-xs uppercase tracking-wider transition"
          >
            Cancel
          </button>
        )}
      </header>

      {/* PCI-DSS Compliant Embedded Checkout Panel [cite: 26] */}
      <div className="relative z-10 text-slate-100 bg-[#050914] border border-slate-950/80 rounded-2xl p-4 md:p-6 shadow-inner min-h-[400px]">
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>

      <footer className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-900 pt-4 text-[10px] text-slate-500 font-bold font-mono uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <span className="text-emerald-500">🔒</span> AES-256 Bit PCI DSS Compliant Secure Layer
        </div>
        <div>
          Powered by Stripe
        </div>
      </footer>
    </div>
  );
}