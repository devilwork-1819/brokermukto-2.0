import { useState, FormEvent } from 'react';
import { X, Check, MessageSquare, User, Info, Inbox } from 'lucide-react';

interface Suggestion {
  id: number;
  name: string;
  contact: string;
  category: string;
  suggestion: string;
  date: string;
}

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'bn' | 'en';
}

export default function SuggestionModal({ isOpen, onClose, lang }: SuggestionModalProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [category, setCategory] = useState('Improvement');
  const [suggestion, setSuggestion] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!suggestion.trim()) {
      setError(lang === 'bn' ? '⚠️ অনুগ্রহ করে আপনার মতামত লিখুন' : '⚠️ Please enter your recommendation.');
      return;
    }

    const newSuggestion: Suggestion = {
      id: Date.now(),
      name: name.trim() || (lang === 'bn' ? 'বেনামী পরিদর্শক' : 'Anonymous Visitor'),
      contact: contact.trim() || 'N/A',
      category,
      suggestion: suggestion.trim(),
      date: new Date().toLocaleDateString('en-IN') + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };

    try {
      const existing = localStorage.getItem('bm_visitor_suggestions');
      const suggestionsList = existing ? JSON.parse(existing) : [];
      suggestionsList.unshift(newSuggestion);
      localStorage.setItem('bm_visitor_suggestions', JSON.stringify(suggestionsList));
      
      // Reset & show feedback success 
      setIsSuccess(true);
      setName('');
      setContact('');
      setSuggestion('');
      setCategory('Improvement');
    } catch (err) {
      setError(lang === 'bn' ? '⚠️ মতামত সংরক্ষণ করতে সমস্য হয়েছে' : '⚠️ Failed to save suggestion. Storage space could be full.');
    }
  };

  const handleCloseSuccess = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <div 
      id="suggestion-modal-overlay" 
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gradient-to-b from-teal-900 to-teal-950 border border-yellow-500/40 rounded-3xl p-6 relative shadow-2xl animate-scale-up"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors"
          id="close-suggestion-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSuccess ? (
          <>
            <h3 className="text-xl font-extrabold text-yellow-500 flex items-center gap-2 mb-2" id="suggestion-modal-header">
              💬 {lang === 'bn' ? 'মন্তব্য ও মতামত বাক্স' : 'Leave Comments'}
            </h3>
            <p className="text-xs text-white/55 mb-5 font-semibold leading-relaxed">
              {lang === 'bn' 
                ? 'BrokerMukto সার্ভিস, ওটিপি, পেমেন্ট বা নকশা নিয়ে আপনার যেকোনো মন্তব্য বা পরামর্শ লিখুন।' 
                : 'Leave your comments, suggestions, or reports on BrokerMukto service, design, or payment systems.'}
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold rounded-xl p-2.5 mb-4 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" id="visitor-suggestion-form">
              {/* Category selector */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-yellow-500/85 mb-1.5">
                  {lang === 'bn' ? 'মতামতের বিভাগ' : 'Feedback Category'}
                </label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white outline-none transition-colors cursor-pointer"
                >
                  <option value="Improvement" className="bg-teal-950 text-white">{lang === 'bn' ? '💡 মানোন্নয়ন (Improvement)' : '💡 Improvement Recommendation'}</option>
                  <option value="OTP" className="bg-teal-950 text-white">{lang === 'bn' ? '🔑 ওটিপি ও মোবাইল ভেরিফিকেশন' : '🔑 OTP & SMS Verification'}</option>
                  <option value="Payments" className="bg-teal-950 text-white">{lang === 'bn' ? '💰 পে-আনলক সিস্টেম (Pay-Unlock)' : '💰 Pay-Unlock System Proposal'}</option>
                  <option value="Bugs" className="bg-teal-950 text-white">{lang === 'bn' ? '⚠️ ত্রুটি বা বাগ রিপোর্ট (Bugs)' : '⚠️ Error or Bug Report'}</option>
                  <option value="Other" className="bg-teal-950 text-white">{lang === 'bn' ? '📝 অন্যান্য মতামত' : '📝 Other Feedback'}</option>
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-yellow-500/85 mb-1.5">
                  {lang === 'bn' ? 'আপনার নাম (ঐচ্ছিক)' : 'Your Name (Optional)'}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 text-white/30 w-4 h-4" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: সনৎ ঘোষ' : 'e.g. Sanat Ghosh'}
                    className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-white outline-none placeholder-white/20 transition-colors"
                  />
                </div>
              </div>

              {/* Mobile/Email */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-yellow-500/85 mb-1.5">
                  {lang === 'bn' ? 'মোবাইল বা ইমেইল (ঐচ্ছিক)' : 'Contact Info (Optional)'}
                </label>
                <div className="relative">
                  <Inbox className="absolute left-3.5 top-3 text-white/30 w-4 h-4" />
                  <input 
                    type="text" 
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: +91 98xxx xxxxx বা email' : 'e.g. +91 9830001234 or email'}
                    className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-white outline-none placeholder-white/20 transition-colors"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-yellow-500/85 mb-1.5">
                  {lang === 'bn' ? 'আপনার মন্তব্য / মতামত *' : 'Your Comments / Suggestions *'}
                </label>
                <textarea 
                  required
                  rows={4}
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder={lang === 'bn' ? 'আপনার মূল্যবান মন্তব্য এখানে লিখুন...' : 'Write your valuable comments here...'}
                  className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-4 py-3 text-xs font-semibold text-white outline-none placeholder-white/20 transition-colors resize-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 rounded-xl text-teal-950 font-black text-xs hover:shadow-md cursor-pointer transition-all active:scale-97 leading-none flex items-center justify-center gap-1.5"
                id="submit-suggestion-btn"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'মন্তব্য জমা দিন' : 'Submit Comments'}</span>
              </button>
            </form>
          </>
        ) : (
          <div className="py-6 text-center space-y-4" id="suggestion-success-panel">
            <div className="w-14 h-14 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto text-green-400 text-2xl animate-bounce">
              <Check className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-white">
              {lang === 'bn' ? 'ধন্যবাদ! মন্তব্য জমা হয়েছে।' : 'Thank you! Your comments have been submitted.'}
            </h3>
            <p className="text-xs text-white/60 leading-relaxed max-w-xs mx-auto">
              {lang === 'bn' 
                ? 'আপনার মন্তব্যগুলো আমাদের টিম গুরুত্ব সহকারে পর্যালোচনা করবে এবং প্ল্যাটফর্ম উন্নত করতে সাহায্য করবে।' 
                : 'Our administrator team will review your comments with high priority as we continue to grow.'}
            </p>
            <button
              onClick={handleCloseSuccess}
              className="px-6 py-2.5 bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/40 text-yellow-500 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              {lang === 'bn' ? 'বন্ধ করুন' : 'Close Sandbox View'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
