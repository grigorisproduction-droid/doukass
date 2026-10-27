import React, { useEffect, useState } from 'react';
import { X, RefreshCw, Download } from 'lucide-react';

interface UpdatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function statusText(s: UpdateStatus | null): { text: string; tone: 'info' | 'ok' | 'warn' | 'error' } {
  if (!s || s.state === 'idle') return { text: 'Δεν έχει γίνει έλεγχος σε αυτή τη συνεδρία.', tone: 'info' };
  switch (s.state) {
    case 'checking': return { text: 'Έλεγχος για ενημερώσεις…', tone: 'info' };
    case 'none': return { text: 'Η εφαρμογή είναι ενημερωμένη.', tone: 'ok' };
    case 'downloading': return { text: `Λήψη νέας έκδοσης${s.version ? ' ' + s.version : ''}… ${s.percent ?? 0}%`, tone: 'info' };
    case 'ready': return { text: `Η έκδοση ${s.version || ''} είναι έτοιμη για εγκατάσταση.`, tone: 'ok' };
    case 'disabled': return { text: s.message || 'Οι ενημερώσεις δεν είναι ενεργές.', tone: 'warn' };
    case 'error': return { text: `Σφάλμα: ${s.message || 'άγνωστο'}`, tone: 'error' };
    default: return { text: '', tone: 'info' };
  }
}

const toneCls = {
  info: 'bg-slate-50 border-slate-200 text-slate-700',
  ok: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  warn: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-700'
};

export default function UpdatesModal({ isOpen, onClose }: UpdatesModalProps) {
  const api = typeof window !== 'undefined' ? window.mwDB?.update : undefined;
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [url, setUrl] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !api) return;
    let alive = true;
    api.getInfo().then(i => {
      if (!alive) return;
      setInfo(i);
      setUrl(i.feedUrl || '');
      setStatus(i.status);
    }).catch(() => {});
    const off = api.onStatus(s => setStatus(s));
    return () => { alive = false; off(); };
  }, [isOpen, api]);

  if (!isOpen) return null;

  const saveUrl = async () => {
    if (!api) return;
    const res = await api.setFeedUrl(url);
    setSavedMsg(res.ok ? 'Αποθηκεύτηκε.' : (res.error || 'Αποτυχία αποθήκευσης.'));
    window.setTimeout(() => setSavedMsg(''), 3000);
    if (res.ok) {
      const i = await api.getInfo();
      setInfo(i);
    }
  };

  const check = async () => {
    if (!api) return;
    // make sure the typed address is the one being used
    if ((info?.feedUrl || '') !== url.trim()) await saveUrl();
    setStatus(await api.check());
  };

  const st = statusText(status);
  const effective = (info?.feedUrl || info?.bundledFeedUrl || '').trim();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <RefreshCw size={24} className="text-emerald-600" /> Ενημερώσεις εφαρμογής
            </h2>
            {info && <p className="text-sm text-slate-500 mt-1">Τρέχουσα έκδοση: <span className="font-semibold">{info.version}</span></p>}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!api ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3">
              Οι ενημερώσεις είναι διαθέσιμες μόνο στην εφαρμογή Windows (EXE).
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Διεύθυνση φακέλου ενημερώσεων</label>
                <div className="flex gap-2">
                  <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://example.com/doukas-updates/"
                    className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
                  />
                  <button onClick={saveUrl} className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-semibold">
                    Αποθήκευση
                  </button>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Ο φάκελος (https:// ή http://) που περιέχει τα αρχεία <b>latest.yml</b>, <b>Setup .exe</b> και <b>.blockmap</b> κάθε νέας έκδοσης.
                  {savedMsg && <span className="ml-2 text-emerald-700 font-semibold">{savedMsg}</span>}
                </div>
                {!info?.feedUrl && info?.bundledFeedUrl && (
                  <div className="text-[11px] text-slate-500 mt-1">Προεπιλογή από την εγκατάσταση: {info.bundledFeedUrl}</div>
                )}
              </div>

              <div className={`border rounded-lg p-3 text-sm ${toneCls[st.tone]}`}>{st.text}</div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={check}
                  disabled={!effective && !url.trim()}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold text-sm flex items-center gap-2"
                >
                  <RefreshCw size={16} /> Έλεγχος για ενημερώσεις
                </button>
                {status?.state === 'ready' && (
                  <button
                    onClick={() => api.install()}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center gap-2"
                  >
                    <Download size={16} /> Επανεκκίνηση και ενημέρωση
                  </button>
                )}
              </div>

              <div className="text-[11px] text-slate-400">
                Με ορισμένη διεύθυνση, η εφαρμογή ελέγχει αυτόματα για νέα έκδοση λίγα δευτερόλεπτα μετά την εκκίνηση. Το πρόχειρο της παραγγελίας διατηρείται κατά την ενημέρωση.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
