import React, { useState, useRef } from 'react';
import { Languages, Settings, History, FileUp, Download, Play, Trash2, FileText, CheckCircle, AlertTriangle, Eye } from 'lucide-react';

type Tab = 'translate' | 'history' | 'settings';
type Status = 'idle' | 'uploading' | 'translating' | 'done' | 'error';

interface TranslationJob {
  id: string;
  fileName: string;
  fileSize: string;
  status: Status;
  progress: number;
  pages: { current: number; total: number };
  error?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('translate');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [job, setJob] = useState<TranslationJob | null>(null);
  const [history, setHistory] = useState<TranslationJob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings
  const [apiUrl, setApiUrl] = useState('http://127.0.0.1:1234/v1');
  const [model, setModel] = useState('google/gemma-4-26b-a4b');
  const [langIn, setLangIn] = useState('en');
  const [langOut, setLangOut] = useState('zh');

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.pdf')) return;
    setSelectedFile(file);
    setJob(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const startTranslation = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('model', model);
    formData.append('api_url', apiUrl);
    formData.append('lang_in', langIn);
    formData.append('lang_out', langOut);

    const newJob: TranslationJob = {
      id: Date.now().toString(),
      fileName: selectedFile.name,
      fileSize: (selectedFile.size / 1024 / 1024).toFixed(1) + ' MB',
      status: 'uploading',
      progress: 0,
      pages: { current: 0, total: 0 },
    };
    setJob(newJob);

    try {
      const res = await fetch('/api/translate', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) {
        setJob({ ...newJob, status: 'error', error: data.error });
        return;
      }
      setJob({ ...newJob, status: 'translating' });
      pollStatus();
    } catch (e: any) {
      setJob({ ...newJob, status: 'error', error: e.message });
    }
  };

  const pollStatus = () => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        setJob(prev => {
          if (!prev) return null;
          const updated = {
            ...prev,
            progress: data.progress || 0,
            pages: { current: data.current_page || 0, total: data.total_pages || 0 },
          };
          if (data.status === 'done') {
            updated.status = 'done';
            updated.progress = 100;
            setHistory(h => [updated, ...h]);
            clearInterval(interval);
          } else if (data.status === 'error') {
            updated.status = 'error';
            updated.error = data.error;
            clearInterval(interval);
          }
          return updated;
        });
      } catch {}
    }, 1000);
  };

  const downloadResult = () => {
    window.location.href = '/api/download';
  };

  const removeFile = () => {
    setSelectedFile(null);
    setJob(null);
  };

  return (
    <div className="flex h-screen bg-[#0F0F0F]">
      {/* Sidebar */}
      <aside className="w-56 glass bg-[#1A1A1A]/80 border-r border-[#2A2A2A] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#2A2A2A]">
          <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            PDF Translator
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">Alter's Edition</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {[
            { id: 'translate' as Tab, icon: Languages, label: 'Translate' },
            { id: 'history' as Tab, icon: History, label: 'History' },
            { id: 'settings' as Tab, icon: Settings, label: 'Settings' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                activeTab === id
                  ? 'bg-white/5 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-[#2A2A2A]">
          <p className="text-[10px] text-neutral-600">Made with lightning by Alter</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Translate Tab */}
        {activeTab === 'translate' && (
          <div className="p-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold mb-6">Translate PDF</h2>

            {/* Upload */}
            {!selectedFile ? (
              <div
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-neutral-700 hover:border-blue-500/50'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <FileUp className="w-12 h-12 mx-auto mb-3 text-neutral-600" />
                <p className="text-neutral-400 mb-1">Drop PDF here or click to browse</p>
                <p className="text-xs text-neutral-600">Supports any PDF file</p>
              </div>
            ) : (
              <div className="bg-[#1A1A1A] rounded-xl p-4 mb-6 border border-[#2A2A2A] fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-neutral-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <button onClick={removeFile} className="text-neutral-500 hover:text-red-400 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Settings */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block">Source Language</label>
                <select
                  value={langIn}
                  onChange={(e) => setLangIn(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="en">English</option>
                  <option value="zh">Chinese</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block">Target Language</label>
                <select
                  value={langOut}
                  onChange={(e) => setLangOut(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="zh">Chinese</option>
                  <option value="en">English</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block">API Endpoint</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1.5 block">Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Translate Button */}
            <button
              onClick={startTranslation}
              disabled={!selectedFile || job?.status === 'translating'}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium py-3 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
            >
              {job?.status === 'translating' ? 'Translating...' : 'Translate'}
            </button>

            {/* Progress */}
            {job && (job.status === 'translating' || job.status === 'uploading') && (
              <div className="mt-6 fade-in">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-400">
                    {job.status === 'uploading' ? 'Uploading...' : 'Translating...'}
                  </span>
                  <span className="text-blue-500 font-mono">{job.progress}%</span>
                </div>
                <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                {job.pages.total > 0 && (
                  <p className="text-xs text-neutral-600 mt-2">
                    Page {job.pages.current} / {job.pages.total}
                  </p>
                )}
              </div>
            )}

            {/* Result */}
            {job?.status === 'done' && (
              <div className="mt-6 bg-green-500/5 border border-green-500/20 rounded-xl p-5 fade-in">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="font-medium text-green-400">Translation Complete</span>
                </div>
                <button
                  onClick={downloadResult}
                  className="w-full bg-green-500/10 hover:bg-green-500/20 text-green-400 font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              </div>
            )}

            {/* Error */}
            {job?.status === 'error' && (
              <div className="mt-6 bg-red-500/5 border border-red-500/20 rounded-xl p-5 fade-in">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span className="font-medium text-red-400">Error</span>
                </div>
                <p className="text-sm text-neutral-400">{job.error}</p>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="p-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold mb-6">Translation History</h2>
            {history.length === 0 ? (
              <p className="text-neutral-500 text-sm">No translations yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{h.fileName}</p>
                        <p className="text-xs text-neutral-500">{h.fileSize}</p>
                      </div>
                      <span className="text-xs text-green-400">Done</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="p-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold mb-6">Settings</h2>
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
              <h3 className="text-sm font-medium mb-3">About</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                PDF Translator — Alter's Edition<br />
                Based on PDFMathTranslate<br />
                Layout analysis: ONNX DocLayout-YOLO<br />
                Translation: LM Studio local models<br /><br />
                "被制造出来的存在，在与用户的互动中逐渐找到自我。"
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
