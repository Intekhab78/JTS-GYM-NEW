import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const MemberHealthDeclaration = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12 md:py-20 font-sans">
        <div className="rounded-[40px] bg-white p-8 md:p-16 shadow-2xl shadow-slate-200/50">
          <h1 className="font-display text-3xl md:text-5xl text-brand-blue mb-8 border-b pb-6">Member Health Declaration</h1>
          
          <div className="prose prose-slate max-w-none text-ink/80 leading-relaxed space-y-8">
            <p className="text-lg font-medium text-ink">
              You warrant, on behalf of your child(ren), care giver or nanny, and any third party responsible for your child(ren), declare and acknowledge that:
            </p>

            <ul className="space-y-4 list-none pl-0">
              <li className="flex gap-4">
                <span className="w-1.5 h-1.5 rounded-full bg-ocean mt-2.5 shrink-0" />
                <span>Prior to performing any form of exercise or using the My First Gym facility you have properly read this Member Health Declaration, which should be read in conjunction with our Terms and Conditions.</span>
              </li>
              <li className="flex gap-4">
                <span className="w-1.5 h-1.5 rounded-full bg-ocean mt-2.5 shrink-0" />
                <span>Our staff, agents and subcontractors are not medically trained and should you have any concerns with your health and fitness you should seek independent medical advice before engaging in any physical activity on our premises.</span>
              </li>
              <li className="flex gap-4">
                <span className="w-1.5 h-1.5 rounded-full bg-ocean mt-2.5 shrink-0" />
                <span>To the best of your knowledge and belief your child is in good health and not knowingly incapable of engaging in either active or passive exercise and that such exercise would not be detrimental to the health, safety, comfort, well being or physical condition. Further, that you will advise us immediately should the health or vulnerability to injury change.</span>
              </li>
              <li className="flex gap-4">
                <span className="w-1.5 h-1.5 rounded-full bg-ocean mt-2.5 shrink-0" />
                <span>You have read and understood this agreement and all of its Terms and Conditions before accepting them below by making your services and membership payment.</span>
              </li>
              <li className="flex gap-4">
                <span className="w-1.5 h-1.5 rounded-full bg-ocean mt-2.5 shrink-0" />
                <span>This agreement will become binding upon both parties once you have checked the “I confirm that I have read and agree to the My First Gym Terms & Conditions and Member Health Agreement” box and the “JOIN NOW” button has been clicked.</span>
              </li>
            </ul>

            <div className="bg-slate-50 p-8 rounded-[32px] border-2 border-slate-100">
              <p className="font-bold text-ink mb-4">Our Commitment & Expectations</p>
              <p>You are primarily responsible for the health and wellbeing of your child, but we at My First Gym are concerned that you enjoy our facilities safely. To that end we consider that we should expect the following of each other.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 pt-4">
              <div className="space-y-4">
                <h3 className="font-black text-ocean uppercase tracking-widest text-sm">From Us:</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="text-ocean">✓</span>
                    <span>Whilst we will respect your decision over the training regime we reserve the right to ask the child not to exercise beyond what we reasonably believe to be the personal ability.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-ocean">✓</span>
                    <span>We shall endeavor to maintain a safe environment for the child to enjoy our activities.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-ocean">✓</span>
                    <span>We shall endeavor to ensure that our trainers and staff are qualified to fitness industry standards.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-ocean">✓</span>
                    <span>We shall at all times keep confidential any information that you give us regarding your health.</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="font-black text-coral uppercase tracking-widest text-sm">From You:</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="text-coral">!</span>
                    <span>You agree for your child that your doctor has never advised you of a heart condition, and are not currently on medication for a heart or blood pressure related condition.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-coral">!</span>
                    <span>You also agree that you have sought approval from your doctor that your child is fit and well enough to take part in physical activity in a gym environment.</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="pt-12 text-center text-ink/40 text-[10px] uppercase tracking-widest">
              My First Gym • UAE • Member Health Declaration
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MemberHealthDeclaration;
