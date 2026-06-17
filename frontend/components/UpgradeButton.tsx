"use client";

import { useState } from 'react';
import CheckoutForm from './CheckoutForm';

export default function UpgradeButton({ planType }: { planType: "pro" | "enterprise" }) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const initiatePayment = async () => {
    try {
      // Fetch the intent from your FastAPI router
      const res = await fetch('/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_type: planType }),
      });
      
      const data = await res.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setShowCheckout(true);
      }
    } catch (error) {
      console.error("Payment initiation failed:", error);
    }
  };

  return (
    <div className="mt-4">
      {!showCheckout ? (
        <button 
          onClick={initiatePayment}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition duration-200"
        >
          Upgrade to {planType.toUpperCase()} Tier
        </button>
      ) : (
        <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Complete your secure checkout</h3>
          <CheckoutForm clientSecret={clientSecret!} />
        </div>
      )}
    </div>
  );
}