import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.jsx';

export default function PricingCard({ plan }) {
  const { currency } = useSettings();
  const hasPromotion = plan.activePromotions && plan.activePromotions.length > 0;
  const promo = hasPromotion ? plan.activePromotions[0] : null;

  return (
    <div className={`soft-card rounded-[40px] p-8 transition-all hover:-translate-y-2 hover:shadow-2xl group border relative overflow-hidden ${hasPromotion ? 'border-coral shadow-[0_0_20px_rgba(255,83,83,0.1)]' : 'border-slate-100/50'} bg-white`}>
      {hasPromotion && (
         <div className="absolute top-0 right-0 z-10">
            <div className="bg-coral text-white text-[10px] font-black uppercase tracking-widest py-2 px-10 rotate-45 translate-x-[35%] translate-y-[20%] shadow-lg">
               OFFER
            </div>
         </div>
      )}

      <div className="flex flex-col h-full">
        <div>
          <h3 className="font-display text-3xl font-black text-ink leading-tight">{plan.name}</h3>
          <div className="mt-4 flex flex-col">
            <span className={`${hasPromotion ? 'text-sm text-slate-300 line-through font-bold' : 'text-4xl font-black text-brand-blue'}`}>
              {currency} {plan.price}
            </span>
            {hasPromotion && promo.discountValue && (
              <span className="text-4xl font-black text-coral mt-1">
                {currency} {promo.discountType === 'percentage' 
                  ? Math.round(plan.price * (1 - promo.discountValue / 100)) 
                  : Math.max(0, plan.price - promo.discountValue)}
              </span>
            )}
          </div>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-ink/30 italic">{plan.validity}</p>
          
          {hasPromotion && promo.name && (
            <div className="mt-4 bg-coral/5 border border-coral/10 rounded-2xl p-3">
              <p className="text-[10px] font-black text-coral uppercase tracking-widest text-center">{promo.name}</p>
            </div>
          )}
        </div>

        <ul className="mt-8 space-y-4 flex-1">
          {plan.benefits.slice(0, 5).map((benefit, idx) => (
            <li key={idx} className="flex items-start gap-3 text-sm font-medium text-ink/60 leading-relaxed">
              <svg className="h-5 w-5 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              {benefit}
            </li>
          ))}
        </ul>
        
        <div className="mt-8">
           <button className="w-full bg-ink text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-blue transition-all active:scale-95 shadow-lg shadow-ink/10">
              Select Package
           </button>
        </div>
      </div>
    </div>
  );
}
