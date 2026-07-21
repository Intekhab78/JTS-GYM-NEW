import { Link, useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.jsx';

export default function ClassCard({ item }) {
  const hasPromotion = item.activePromotions && item.activePromotions.length > 0;
  const promo = hasPromotion ? item.activePromotions[0] : null;
  const { currency } = useSettings();

  return (
    <div className={`soft-card rounded-[40px] p-6 transition-all hover:-translate-y-2 hover:shadow-2xl group border relative overflow-hidden ${hasPromotion ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'border-slate-100/50'}`}>
      {hasPromotion && (
        <div className="absolute top-0 right-0 z-10">
          <div className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest py-2 px-10 rotate-45 translate-x-[35%] translate-y-[20%] shadow-lg">
            {promo.promoType === 'bogo' ? 'BOGO 1+1' :
              promo.promoType === 'flash' ? 'FLASH' :
                promo.promoType === 'percentage' ? `${promo.discountValue}% OFF` :
                  'OFFER'}
          </div>
        </div>
      )}

      {item.image ? (
        <div className="overflow-hidden rounded-[32px] mb-6">
          <img
            src={item.image}
            alt={item.title}
            className="h-48 w-full object-cover transition-transform group-hover:scale-110"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className="flex items-start justify-between mb-4">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-ocean bg-ocean/5 px-4 py-1.5 rounded-full mt-1">{item.ageGroup}</span>
        <div className={`flex flex-col items-end ${hasPromotion ? 'mr-6 mt-6' : ''}`}>
          <span className={`${(hasPromotion && promo.promoType !== 'bogo') ? 'text-xs text-slate-400 line-through font-bold' : 'text-lg font-black text-brand-blue'}`}>
            {currency} {item.price}
          </span>
          {hasPromotion && promo.promoType !== 'bogo' && (
            <span className="text-lg font-black text-red-500">
              {currency} {promo.discountType === 'percentage'
                ? Math.round(item.price * (1 - promo.discountValue / 100))
                : Math.max(0, item.price - promo.discountValue)}
            </span>
          )}
          {hasPromotion && promo.promoType === 'bogo' && (
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
              +1 Free Item!
            </span>
          )}
        </div>
      </div>
      <h3 className="font-display text-2xl text-ink leading-tight">{item.title}</h3>
      {hasPromotion && promo.name && (
        <p className="mt-1 text-[10px] font-black text-red-500 uppercase tracking-widest">{promo.name}</p>
      )}
      <p className="mt-3 text-sm text-ink/60 line-clamp-3 font-medium leading-relaxed">{item.description}</p>
      <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
        <span className="text-xs font-bold text-ink/30 uppercase tracking-widest">{item.duration}</span>
        <Link
          to={`/book?classId=${item._id}${item.locationId ? `&locationId=${item.locationId._id || item.locationId}` : ''}`}
          className="bg-brand-blue text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          Book Now
        </Link>
      </div>
    </div>
  );
}
