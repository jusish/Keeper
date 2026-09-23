import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { X, Copy, Check, MessageSquare } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'UMUSANZU' | 'EVENT' | 'ATTENDANCE';
  targetId?: string;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  reportType,
  targetId,
}) => {
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSummary();
    }
  }, [isOpen, reportType, targetId]);

  const loadSummary = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/reports/whatsapp-summary', {
        params: {
          type: reportType,
          id: targetId,
        },
      });
      setContent(res.data.summaryText);
    } catch (err) {
      setContent('Failed to generate summary.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-50/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Export for Community WhatsApp Group
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-500 mb-3">
            Copy this formatted message and paste it directly into your WhatsApp or Telegram community:
          </p>

          <div className="relative">
            <textarea
              readOnly
              value={isLoading ? 'Generating summary...' : content}
              className="h-64 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] text-slate-800 leading-relaxed focus:outline-none resize-none"
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy WhatsApp Message
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
