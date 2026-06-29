import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation, EffectFade } from 'swiper/modules';
import { Link } from 'react-router-dom';

// Import Swiper styles
import 'swiper/css/bundle';

import sliderMain from '../assets/slider-main.png';
import sliderBirthday from '../assets/slider-birthday.png';

const slides = [
    {
        image: sliderMain,
        kicker: "Welcome to My First Gym",
        title: "Where Every Customer Is A Star",
        description: "From Ninja Warrior and Martial Arts to Gymnastics and Fitness, we provide a joyful space for customers to grow, learn, and build confidence.",
        ctaText: "Explore Classes",
        ctaLink: "/programs"
    },
    {
        image: sliderBirthday,
        kicker: "Unforgettable Parties",
        title: "Celebrate Your Big Day With Us",
        description: "We host the coolest birthday parties in town! Stress-free for customers and pure magic for the kids.",
        ctaText: "Learn More",
        ctaLink: "/contact"
    }
];

export default function HeroSlider() {
    return (
        <div className="hero-slider-container relative overflow-hidden rounded-[40px] bg-white border-2 border-brand-blue/5 shadow-glow min-h-[500px]">
            <Swiper
                modules={[Autoplay, Pagination, Navigation, EffectFade]}
                spaceBetween={0}
                slidesPerView={1}
                effect={'fade'}
                fadeEffect={{ crossFade: true }}
                speed={1200}
                autoplay={{
                    delay: 6000,
                    disableOnInteraction: false,
                }}
                pagination={{
                    clickable: true,
                    el: '.custom-pagination',
                }}
                navigation={{
                    nextEl: '.swiper-button-next-custom',
                    prevEl: '.swiper-button-prev-custom',
                }}
                className="h-full w-full"
            >
                {slides.map((slide, index) => (
                    <SwiperSlide key={index}>
                        <div className="grid h-full items-center gap-12 p-12 lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="z-10 text-left">
                                <p className="animate-fade-in-up text-sm font-bold uppercase tracking-[0.4em] text-brand-black [animation-delay:0.2s] flex items-center gap-3">
                                    <span className="w-8 h-[2px] bg-brand-blue"></span>
                                    {slide.kicker}
                                </p>
                                <h1 className="animate-fade-in-up mt-6 font-display text-5xl font-black text-brand-blue md:text-6xl lg:text-7xl leading-tight [animation-delay:0.4s]">
                                    {slide.title}
                                </h1>
                                <p className="animate-fade-in-up mt-6 text-xl text-brand-black/70 max-w-lg font-medium [animation-delay:0.6s]">
                                    {slide.description}
                                </p>
                                <div className="animate-fade-in-up mt-10 flex flex-wrap gap-5 [animation-delay:0.8s]">
                                    <Link to={slide.ctaLink} className="group relative overflow-hidden rounded-full bg-brand-blue px-10 py-5 text-base font-black text-white shadow-xl transition-all hover:scale-105 active:scale-95">
                                        <span className="relative z-10">{slide.ctaText}</span>
                                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-brand-yellow/30 to-transparent transition-transform group-hover:translate-x-0"></div>
                                    </Link>
                                    <Link
                                        to="/programs"
                                        className="rounded-full border-2 border-brand-black/10 bg-white/50 px-10 py-5 text-base font-bold text-brand-black backdrop-blur-sm transition-all hover:bg-brand-black hover:text-white"
                                    >
                                        Explore Programs
                                    </Link>
                                </div>
                            </div>
                            <div className="relative flex justify-center lg:justify-end">
                                <div className="animate-fade-in relative w-full max-w-[550px] [animation-delay:0.4s]">
                                    <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-ocean/10 to-coral/10 blur-2xl"></div>
                                    <img src={slide.image} alt={slide.title} className="relative z-10 w-full rounded-3xl drop-shadow-2xl object-cover aspect-video lg:aspect-square" />
                                </div>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>

            {/* Custom Navigation */}
            <div className="absolute bottom-12 right-12 z-20 hidden items-center gap-6 md:flex">
                <button className="swiper-button-prev-custom group flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand-black/5 bg-white/90 text-brand-black backdrop-blur-sm transition-all hover:bg-brand-black hover:text-white hover:border-brand-black shadow-lg disabled:opacity-20 active:scale-90">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6 transition-transform group-hover:-translate-x-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>
                <button className="swiper-button-next-custom group flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand-black/5 bg-white/90 text-brand-black backdrop-blur-sm transition-all hover:bg-brand-black hover:text-white hover:border-brand-black shadow-lg disabled:opacity-20 active:scale-90">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6 transition-transform group-hover:translate-x-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </button>
            </div>

            {/* Custom Pagination Container */}
            <div className="custom-pagination absolute bottom-14 left-12 z-20 flex gap-4"></div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .custom-pagination .swiper-pagination-bullet {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #000000;
          opacity: 0.15;
          margin: 0 !important;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          cursor: pointer;
        }
        .custom-pagination .swiper-pagination-bullet-active {
          opacity: 1;
          width: 32px;
          border-radius: 12px;
          background: #29AAE2;
          box-shadow: 0 4px 12px rgba(41, 170, 226, 0.3);
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .swiper-slide .animate-fade-in-up,
        .swiper-slide .animate-fade-in {
          opacity: 0;
        }
        .swiper-slide-active .animate-fade-in-up {
          animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .swiper-slide-active .animate-fade-in {
          animation: fade-in 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
        </div>
    );
}
