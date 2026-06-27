import { AlertTriangle, Check } from 'lucide-react';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'bn' | 'en';
}

export default function DisclaimerModal({ isOpen, onClose, lang }: DisclaimerModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      id="disclaimer-modal-overlay"
      className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-gradient-to-b from-teal-900 to-teal-950 border-2 border-yellow-500/40 rounded-3xl p-6 md:p-8 relative shadow-2xl my-8 leading-relaxed">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 animate-bounce">
            ⚠️
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold text-yellow-500">
            {lang === 'bn' ? 'সতর্কীকরণ ও শর্তাবলী' : 'Important Disclaimer'}
          </h3>
          <p className="text-xs text-white/40 mt-1 font-semibold tracking-wider uppercase">
            BrokerMukto.com
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 my-6 py-4 border-t border-b border-white/10 max-h-[50vh] overflow-y-auto">
          {/* English Disclaimer */}
          <div className="text-xs text-yellow-100/90 space-y-3 font-medium">
            <h4 className="font-bold text-sm text-yellow-400">English Terms</h4>
            <p>
              All transactions and deals facilitated through <strong>BrokerMukto.com</strong> are conducted entirely at the user's own risk. The platform serves solely as a medium to connect buyers and sellers and <strong>does not verify</strong> the authenticity of any property, titles, or legal documents.
            </p>
            <p>
              We strongly urge all users to perform comprehensive due diligence and independently verify all paperwork with appropriate authorities or legal professionals before committing to any financial agreement.
            </p>
            <p>
              <strong>BrokerMukto disclaims all liability</strong> for any fraudulent activities, misrepresentations, or losses arising from interactions between parties on this platform. Please stay alert and exercise necessary caution in all your dealings.
            </p>
          </div>

          {/* Bengali Disclaimer */}
          <div className="text-xs text-yellow-100/75 space-y-3 font-medium border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8">
            <h4 className="font-bold text-sm text-yellow-400">বাংলা শর্তাবলী</h4>
            <p>
              <strong>BrokerMukto.com</strong>-এ সম্পাদিত সমস্ত লেনদেন ও চুক্তি সম্পূর্ণরূপে ব্যবহারকারীর নিজস্ব ঝুঁকিতে পরিচালিত হয়। এই প্ল্যাটফর্ম শুধুমাত্র ক্রেতা ও বিক্রেতাদের সংযুক্ত করার মাধ্যম হিসেবে কাজ করে এবং কোনো সম্পত্তি, দলিল বা আইনি নথির সত্যতা <strong>যাচাই করে না।</strong>
            </p>
            <p>
              যেকোনো আর্থিক চুক্তির আগে সংশ্লিষ্ট কর্তৃপক্ষ বা আইনি বিশেষজ্ঞের সাথে পরামর্শ করে সব কাগজপত্র স্বাধীনভাবে যাচাই করার জন্য আমরা দৃঢ়ভাবে অনুরোধ করছি।
            </p>
            <p>
              এই প্ল্যাটফর্মে পক্ষগুলির মধ্যে মিথ্যা তথ্য, প্রতারণা বা ক্ষতির জন্য <strong>BrokerMukto কোনো দায় বহন করে না।</strong> সকল লেনদেনে সতর্ক থাকুন।
            </p>
          </div>
        </div>

        {/* Agree Button */}
        <div className="flex flex-col items-center gap-3">
          <button 
            onClick={onClose} 
            className="w-full md:w-auto px-10 py-4 bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 border border-yellow-500 rounded-2xl text-white font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-green-950/40 transition-all active:scale-95 cursor-pointer"
          >
            <Check className="w-5 h-5" />
            <span>✓ I Agree / আমি সম্মত আছি</span>
          </button>
          
          <div className="text-[10px] text-white/30 text-center font-medium max-w-sm">
            {lang === 'bn' 
              ? 'সম্মত বোতামে চাপ দিয়ে আপনি আমাদের শর্তাবলী গ্রহণ করছেন এবং নিজের ঝুঁকিতে এগিয়ে যাচ্ছেন।' 
              : 'By tapping agree, you accept our terms and proceed at your own risk.'}
          </div>
        </div>
      </div>
    </div>
  );
}
