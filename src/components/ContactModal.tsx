import { X, Phone, MessageSquare, Mail } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'bn' | 'en';
}

export default function ContactModal({ isOpen, onClose, lang }: ContactModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      id="contact-modal-overlay" 
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-gradient-to-b from-teal-900 to-teal-950 border border-yellow-500/40 rounded-3xl p-6 relative shadow-2xl animate-scale-up"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-extrabold text-yellow-500 flex items-center gap-2 mb-2">
          📞 {lang === 'bn' ? 'যোগাযোগ করুন' : 'Contact Us'}
        </h3>
        <p className="text-xs text-white/50 mb-6 font-medium">
          {lang === 'bn' ? 'আমরা সাহায্য করতে প্রস্তুত — যেকোনো সময় যোগাযোগ করুন' : "We're here to help — reach us anytime"}
        </p>

        <div className="space-y-3">
          <a 
            href="https://wa.me/919483319235"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 p-3.5 rounded-2xl transition-all hover:translate-x-1"
          >
            <div className="p-2 bg-green-500/10 rounded-xl text-green-400">
              <MessageSquare className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] text-white/40 uppercase font-semibold tracking-wider">
                {lang === 'bn' ? 'হোয়াটসঅ্যাপ চ্যাট' : 'WhatsApp Chat'}
              </div>
              <div className="text-sm font-bold text-white">wa.me/919483319235</div>
            </div>
          </a>

          <a 
            href="mailto:brokermukto@gmail.com"
            className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 p-3.5 rounded-2xl transition-all hover:translate-x-1"
          >
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-white/40 uppercase font-semibold tracking-wider">
                {lang === 'bn' ? 'ইমেইল সাপোর্ট' : 'Email Support'}
              </div>
              <div className="text-sm font-bold text-white">brokermukto@gmail.com</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
