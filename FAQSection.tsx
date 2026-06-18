import { useState } from 'react';
import { ChevronDown, HelpCircle, CheckCircle, ShieldAlert } from 'lucide-react';

interface FAQSectionProps {
  lang: 'bn' | 'en';
}

export default function FAQSection({ lang }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqsBN = [
    {
      question: '❓ ব্রোকারমুক্ত (BrokerMukto) কি আসলেই সম্পূর্ণ ফ্রি?',
      answer: `হ্যাঁ, একেবারে ফ্রি! ব্রোকারমুক্ত পশ্চিমবঙ্গের প্রথম স্বাধীন এবং সম্পূর্ণ দালালি-মুক্ত জমি/সম্পত্তি খোঁজা ও বিজ্ঞাপনের প্ল্যাটফর্ম। আমরা কোনো ধরণের লিস্টিং ফি, আনলক ফি বা কমিশন গ্রহণ করি না। ক্রেতা ও বিক্রেতারা সরাসরি যোগাযোগ করতে পারেন কোনো মাধ্যম ছাড়াই।`
    },
    {
      question: '🔍 লিস্টিং এবং বিক্রেতাদের সত্যতা কীভাবে ভেরিফাই বা যাচাই করা হয়?',
      answer: `প্রত্যেকটি সম্পত্তির বিজ্ঞাপন এবং বিক্রেতার সঠিকতা আমরা ওটিপি (OTP) মোবাইল যাচাইকরণের মাধ্যমে ১০০% নিশ্চিত করি। এছাড়া অপ্রাসঙ্গিক বা ভুয়া তথ্য রোধে আমাদের ব্যাকএন্ডে স্বয়ংক্রিয় স্ক্যান ও র্যান্ডম অডিট পরিচালিত হয়। তবে আর্থিক লেনদেন বা রেজিস্ট্রি করার পূর্বে ক্রেতাদের নিজে জমিতে গিয়ে আইনগত কাগজপত্র (দলিল, পরচা ইত্যাদি) যাচাই করে নেওয়ার অনুরোধ জানানো হচ্ছে।`
    },
    {
      question: '🚫 এখানে কি কোনো দালাল বা ব্রোকার বিজ্ঞাপন দিতে পারবে?',
      answer: `না! ব্রোকারমুক্ত অ্যাপ্লিকেশনটি কঠোরভাবে শুধু প্রকৃত জমির মালিক ও আসল ক্রেতাদের জন্য তৈরি। কোনো এজেন্ট বা দালালের লিস্টিং সনাক্ত হলে তা অবিলম্বে ব্লক বা ডিলিট করা হয়। এটি একটি খাঁটি ব্রোকার-ফ্রি ইকোসিস্টেম হিসেবে কাজ করে।

তবে এটি সম্ভব যে কোনো রিয়েল এস্টেট ব্রোকার বা দালাল অন্য কারো জমির তথ্য তাদের নিজস্ব মোবাইল নম্বর দিয়ে পোস্ট করতে পারে। তাই কোনো আর্থিক লেনদেন বা চুক্তিতে যাওয়ার আগে ক্রেতাদের অবশ্যই জমির মালিকানা এবং বিবরণ সঠিকভাবে যাচাই করে নেওয়ার করার পরামর্শ দেওয়া হচ্ছে।`
    },
    {
      question: '🔴 সম্পত্তি বিক্রি হয়ে গেলে আমি বিজ্ঞাপন কীভাবে সরাব বা "SOLD" করব?',
      answer: `আপনার সম্পত্তিটি বিক্রি হয়ে গেলে বা লিস্টিংটি বন্ধ করতে চাইলে, সম্পত্তিটির বিজ্ঞাপনের কার্ডে থাকা "Seller can change status" বাটনে ক্লিক করুন। এরপর আপনার লিস্টিং করার কোড বা নিবন্ধিত মোবাইল নম্বরটি ইনপুট করে ওয়ান-ক্লিক ওটিপি যাচাইয়ের মাধ্যমে স্ট্যাটাসটি "SOLD" (বিক্রি হয়েছে)-তে পরিবর্তন করতে পারবেন।`
    },
    {
      question: '🔔 হোয়াটসঅ্যাপ (WhatsApp) অ্যালার্ট কীভাবে কাজ করে?',
      answer: `নতুন কোনো সম্পত্তি আমাদের সিস্টেমে লিস্টিং হওয়া মাত্রই আপনার পছন্দের জেলার অ্যালার্ট পেতে আপনার হোয়াটসঅ্যাপ নম্বর দিয়ে সাবস্ক্রাইব করুন। কোনো ক্রেতা রিকোয়ারমেন্ট দিলে বা বিক্রেতা নতুন বিজ্ঞাপন দিলে আমাদের সিস্টেম অবিলম্বে সম্পূর্ণ ফ্রিতে সরাসরি হোয়াটসঅ্যাপে অটোমেটেড অ্যালার্ট বার্তা পাঠায়।`
    },
    {
      question: '🛡️ কোনো প্রতারণা বা জালিয়াতি এড়াতে ক্রেতাদের কী সতর্কতা অবলম্বন করা উচিত?',
      answer: `দালালদের খপ্পর ও জালিয়াতি এড়াতে আমরা সর্বদা বলি: 
১. কোনো বিক্রেতাকে অগ্রিম টাকা বা বুকিং মানি দেবেন না জমি নিজে চোখে দেখার আগে।
২. স্থানীয় রেজিস্ট্রি অফিসে গিয়ে দলিলের সত্যতা এবং নামপত্তন (Mutation) সঠিকভাবে চেক করুন।
৩. জমির সীমানা, রাস্তা এবং সরকারি কোনো ঝামেলা (যেমন আইনি স্থগিতাদেশ বা অর্পিত সম্পত্তি) আছে কিনা তা যাচাই করুন।`
    }
  ];

  const faqsEN = [
    {
      question: '❓ Is BrokerMukto really 100% free?',
      answer: `Absolutely! BrokerMukto is West Bengal's premier independent, broker-free land and property connection app. There are zero listing fees, zero unlock charges, and zero hidden platform commissions. Buyers and sellers communicate directly with each other.`
    },
    {
      question: '🔍 How are the property listings and seller details verified?',
      answer: `We use a secure mobile OTP verification system to verify each seller's contact details when posting. Additionally, we run automated scans and random quality audits of listing details. However, we strictly advise all buyers to perform independent legal checks (deeds, mutation records) on property documents before making any payments.`
    },
    {
      question: '🚫 Are real estate brokers allowed to post listings?',
      answer: `Strictly No! BrokerMukto is dedicated purely to direct property owners and end-buyers. Any broker, intermediate agent, or unauthorized corporate postings are immediately flagged and permanently removed to preserve a clean, direct environment.

It may be possible that real estate brokers can post others' land using their mobile number. Buyers are advised to verify the same before dealing or exchange of any money.`
    },
    {
      question: '🔴 How can sellers remove their ad or mark properties as SOLD?',
      answer: `If your property is sold or you simply wish to take it down, go to your listing card and click "Seller can change status". Verify your identity by entering your registered mobile number, and you can change the status instantly to "SOLD" completely for free.`
    },
    {
      question: '🔔 How do the WhatsApp Alerts work?',
      answer: `Simply input your WhatsApp number and select your district on the dashboard to register for alerts. The moment a new verified property matching your district is posted, our system automatically triggers a free instant direct alert to your WhatsApp.`
    },
    {
      question: '🛡️ What safeguards should buyers practice to prevent fraud?',
      answer: `To remain 100% safe from fraud, please stick to these secure guidelines:
1. NEVER transfer advance/booking money without inspecting the original property physically.
2. Verify land deeds, registration numbers, and mutations at the local land registry/BLRO office.
3. Physically map out property boundaries, access roads, and check for any outstanding disputes.`
    }
  ];

  const faqs = lang === 'bn' ? faqsBN : faqsEN;

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div id="faq-section" className="max-w-5xl mx-auto mt-6 mb-4 animate-fade-in font-sans px-2 sm:px-0">
      <div className="bg-slate-900/60 border border-white/5 rounded-2.5xl p-4 md:p-5 shadow-md">

        <div className="text-center space-y-1 mb-4">
          <h3 className="text-[9px] md:text-xs font-black text-yellow-500/80 uppercase tracking-widest text-center">
            ❓ {lang === 'bn' ? 'সাধারণ জিজ্ঞাসিত প্রশ্নাবলী' : 'Frequently Asked Questions'}
          </h3>
          <h2 className="text-xs md:text-sm font-bold text-white/95">
            {lang === 'bn' ? 'দালালমুক্ত সম্পত্তি বেচাকেনা ও যাচাইকরণ গাইড' : 'Broker-Free Listing & Document Verification FAQ'}
          </h2>
        </div>

        <div className="space-y-2.5 max-w-4xl mx-auto">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index}
                id={`faq-item-${index}`}
                className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                  isOpen 
                    ? 'border-yellow-500/30 bg-yellow-500/[0.02] shadow-md shadow-yellow-500/5' 
                    : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10'
                }`}
              >
                {/* Header / Trigger */}
                <button
                  type="button"
                  onClick={() => toggleFAQ(index)}
                  className="w-full text-left p-3.5 md:p-4 flex items-center justify-between gap-4 select-none cursor-pointer focus:outline-none"
                >
                  <span className={`text-xs md:text-sm font-bold transition-colors ${isOpen ? 'text-yellow-400' : 'text-white'}`}>
                    {faq.question}
                  </span>
                  <div className={`shrink-0 p-1 rounded-lg bg-white/5 text-white/50 transition-all duration-300 ${isOpen ? 'rotate-185 bg-yellow-500/20 text-yellow-400' : ''}`}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </button>

                {/* Answer block with clean state-driven CSS transition */}
                <div 
                  className={`transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-[300px] border-t border-white/5' : 'max-h-0'
                  }`}
                >
                  <div className="p-3.5 md:p-4 text-xs text-white/70 leading-relaxed font-medium whitespace-pre-line">
                    {faq.answer.includes('১.') || faq.answer.includes('1.') ? (
                      <div className="space-y-1.5">
                        {faq.answer.split('\n').map((line, lidx) => (
                          <p key={lidx} className="flex gap-1.5">
                            {line.match(/^\d/) ? (
                              <span className="text-yellow-500 font-extrabold shrink-0">✦</span>
                            ) : null}
                            <span>{line}</span>
                          </p>
                        ))}
                      </div>
                    ) : (
                      faq.answer
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Safe Deal Disclaimer Accent */}
        <div className="mt-6 pt-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-2.5 text-left w-full sm:w-auto">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400 shrink-0 border border-orange-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs font-bold text-white leading-none">
                {lang === 'bn' ? 'সতর্কীকরণ: কোনো আগ্রিম পেমেন্ট করবেন না' : 'Safety First: Never Pay Advance Money'}
              </p>
              <p className="text-[9px] md:text-[10px] text-white/40 font-medium mt-1 leading-none">
                {lang === 'bn' 
                  ? 'কাগজপত্র ও সশরীরে সম্পত্তি যাচাইয়ের পূর্বে কাউকে এক টাকাও দেবেন না।' 
                  : 'Never pay any token money or booking amount before verifying real papers/land.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20">
            <CheckCircle className="w-3.5 h-3.5 text-yellow-400" />
            <span>{lang === 'bn' ? 'সম্পূর্ণ নিরাপদ সংযোগ' : '100% Secure Direct Dealing'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
