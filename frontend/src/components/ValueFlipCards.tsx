import React, { useState } from 'react';

// Defensive custom CSS styles to guarantee 3D perspective and backface-visibility
// work instantly without needing to configure custom classes in tailwind.config.js
const flipCardStyles = `
  .perspective-1000 {
    perspective: 1000px;
  }
  .backface-hidden {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
  .transform-style-3d {
    transform-style: preserve-3d;
  }
`;

interface CardProps {
  frontTitle: string;
  frontDescription: string;
  backTitle: string;
  backDescription: string;
  icon: React.ReactNode;
  tagline?: string;
}

const FlipCard: React.FC<CardProps> = ({ frontTitle, frontDescription, backTitle, backDescription, icon, tagline }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="w-full h-80 perspective-1000 cursor-pointer group"
      onClick={() => setIsFlipped(!isFlipped)}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div 
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* Front of Card */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-xl transition-all duration-300 group-hover:border-emerald-500/30 group-hover:shadow-emerald-950/20">
          <div>
            <div className="text-emerald-400 w-12 h-12 mb-4 flex items-center justify-center bg-white/5 rounded-xl border border-white/10">
              {icon}
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{frontTitle}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{frontDescription}</p>
          </div>
          <div className="flex items-center justify-between mt-auto pt-4">
            {tagline && (
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {tagline}
              </span>
            )}
            <span className="text-xs text-gray-500 font-medium">Hover or tap →</span>
          </div>
        </div>

        {/* Back of Card */}
        <div className="absolute inset-0 w-full h-full backface-hidden [transform:rotateY(180deg)] bg-gradient-to-br from-emerald-950/40 to-slate-900/60 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-6 flex flex-col justify-between shadow-2xl">
          <div>
            <div className="text-emerald-400 w-12 h-12 mb-4 flex items-center justify-center bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              {icon}
            </div>
            <h3 className="text-xl font-semibold text-emerald-400 mb-2">{backTitle}</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{backDescription}</p>
          </div>
          <div className="text-xs text-emerald-500/50 mt-auto">
            Click / tap to flip back
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ValueFlipCards() {
  return (
    <section className="py-16 px-4 max-w-6xl mx-auto">
      {/* Inject custom style tag for safety */}
      <style>{flipCardStyles}</style>

      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-4">
          Why Commercial Fleets Choose <span className="text-emerald-400">RecallLogic</span>
        </h2>
        <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">
          Swap guesswork and tedious manual tracking sheets for continuous liability shield safeguards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <FlipCard
          frontTitle="DOT Compliance & Safety"
          frontDescription="Are your fleet assets and drivers legally authorized and safe to operate on the road?"
          backTitle="Avoid Serious DOT Penalties"
          backDescription="Instantly verify outstanding federal safety recalls, avert expensive Department of Transportation (DOT) compliance violations, and verify vehicle road-readiness."
          tagline="Regulatory Shield"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        {/* Card 2 */}
        <FlipCard
          frontTitle="Asset Liability Protection"
          frontDescription="How exposed is your enterprise to litigation risks from known safety defects?"
          backTitle="Audit-Ready Digital History"
          backDescription="Unresolved recalls open your company up to significant litigation and corporate negligence claims. RecallLogic generates a complete, clean, time-stamped audit compliance trail."
          tagline="Legal Guardrails"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        {/* Card 3 */}
        <FlipCard
          frontTitle="Continuous Background Sync"
          frontDescription="Who is scanning federal safety databases for your vehicle configurations?"
          backTitle="Never Look Up a VIN Manually Again"
          backDescription="Static tracking spreadsheets grow stale within hours. Our platform automatically queries NHTSA databases every single night and fires instant alerts if a new match hits."
          tagline="Set-and-Forget"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.228 10H16m0 0a2 2 0 100 4h5" />
            </svg>
          }
        />
      </div>
    </section>
  );
}