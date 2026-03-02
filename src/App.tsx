/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  Eye,
  Award,
  ShieldCheck,
  FileDown,
  Image as ImageIcon,
  Settings2,
  Move,
  Type,
  Mail,
  Lock,
  MailCheck,
  Send,
  User
} from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { motion, AnimatePresence } from 'motion/react';

interface Participant {
  id: string;
  name: string;
  college: string;
  kairoId: string;
  email: string;
  emailStatus?: 'pending' | 'sent' | 'failed';
  driveUrl?: string;
}

interface TextConfig {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  bold: boolean;
  fontFamily: string;
}

interface Config {
  name: TextConfig;
  college: TextConfig;
  id: TextConfig;
}

const FONTS = [
  { name: 'Serif (Classic)', value: 'serif' },
  { name: 'Sans-Serif (Modern)', value: 'sans-serif' },
  { name: 'Monospace (Tech)', value: 'monospace' },
  { name: 'Cursive (Elegant)', value: 'cursive' },
  { name: 'Fantasy (Stylized)', value: 'fantasy' },
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Playfair Display', value: '"Playfair Display", serif' },
  { name: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
  { name: 'Montserrat', value: '"Montserrat", sans-serif' },
  { name: 'Poppins', value: '"Poppins", sans-serif' },
  { name: 'Dancing Script', value: '"Dancing Script", cursive' },
  { name: 'Great Vibes', value: '"Great Vibes", cursive' },
  { name: 'Oswald', value: '"Oswald", sans-serif' },
  { name: 'Raleway', value: '"Raleway", sans-serif' },
  { name: 'Merriweather', value: '"Merriweather", serif' },
  { name: 'Lora', value: '"Lora", serif' },
  { name: 'Sacramento', value: '"Sacramento", cursive' },
  { name: 'Lobster', value: '"Lobster", cursive' },
  { name: 'Pacifico', value: '"Pacifico", cursive' },
  { name: 'Caveat', value: '"Caveat", cursive' },
  { name: 'Shadows Into Light', value: '"Shadows Into Light", cursive' },
  { name: 'Abril Fatface', value: '"Abril Fatface", cursive' },
  { name: 'Righteous', value: '"Righteous", cursive' },
  { name: 'Cinzel', value: '"Cinzel", serif' },
  { name: 'TTRuns', value: '"TTRuns", sans-serif' },
];

const DEFAULT_CONFIG: Config = {
  name: { x: 50, y: 45, fontSize: 48, color: '#0f172a', bold: true, fontFamily: 'serif' },
  college: { x: 50, y: 55, fontSize: 24, color: '#64748b', bold: false, fontFamily: 'sans-serif' },
  id: { x: 50, y: 85, fontSize: 14, color: '#94a3b8', bold: false, fontFamily: 'monospace' },
};

export default function App() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewParticipant, setPreviewParticipant] = useState<Participant | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [template, setTemplate] = useState<string | null>(null);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'data' | 'template' | 'email' | 'drive'>('data');
  const [inputMode, setInputMode] = useState<'excel' | 'manual'>('excel');
  const [customFontName, setCustomFontName] = useState('');
  const [availableFonts, setAvailableFonts] = useState(FONTS);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState({
    senderEmail: '',
    senderPassword: '',
    subject: 'Your E-Certificate from Kairo Studio',
    body: 'Dear {name},\n\nCongratulations! Please find your e-certificate attached for your participation at {college}.\n\nBest regards,\nKairo Team',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true
  });

  // Manual Input State
  const [manualInput, setManualInput] = useState({
    name: '',
    college: '',
    kairoId: '',
    email: ''
  });

  const certificateRef = useRef<HTMLDivElement>(null);

  // Add Google Fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@400;700&family=Montserrat:wght@400;700&family=Poppins:wght@400;700&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Oswald:wght@400;700&family=Raleway:wght@400;700&family=Merriweather:wght@400;700&family=Lora:wght@400;700&family=Sacramento&family=Lobster&family=Pacifico&family=Caveat:wght@400;700&family=Shadows+Into+Light&family=Abril+Fatface&family=Righteous&family=Cinzel:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Check Drive Connection
    fetch('/api/drive/status')
      .then(res => res.json())
      .then(data => setIsDriveConnected(data.connected))
      .catch(() => {});
  }, []);

  const addCustomFont = () => {
    if (!customFontName) return;
    const fontValue = `"${customFontName}", sans-serif`;
    const newFont = { name: customFontName, value: fontValue };
    
    setAvailableFonts(prev => [...prev, newFont]);
    
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${customFontName.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    setCustomFontName('');
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsDriveConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const connectDrive = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      window.open(url, 'google_auth', 'width=600,height=700');
    } catch (err) {
      setError("Failed to get Google Auth URL");
    }
  };

  const saveToDrive = async (participant: Participant) => {
    if (!isDriveConnected) {
      setError("Please connect Google Drive first.");
      setActiveTab('drive');
      return;
    }

    try {
      setIsProcessing(true);
      const blob = await generateImage(participant);
      
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const base64Image = await base64Promise;

      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${participant.kairoId}_Certificate.png`,
          content: base64Image,
          kairoId: participant.kairoId
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to upload to Drive");
      
      setParticipants(prev => prev.map(p => 
        p.id === participant.id ? { ...p, driveUrl: result.viewLink } : p
      ));
    } catch (err: any) {
      setError(`Drive upload failed for ${participant.name}: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveAllToDrive = async () => {
    if (participants.length === 0) return;
    if (!isDriveConnected) {
      setError("Please connect Google Drive first.");
      setActiveTab('drive');
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: participants.length });

    try {
      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        await saveToDrive(p);
        setProgress({ current: i + 1, total: participants.length });
      }
    } catch (err) {
      setError("Bulk Drive upload failed.");
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const exportExcelWithStatus = () => {
    const data = participants.map(p => ({
      'Name': p.name,
      'College': p.college,
      'Kairo ID': p.kairoId,
      'Email': p.email,
      'Email Status': p.emailStatus || 'Not Sent',
      'Drive Link': p.driveUrl || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participants");
    XLSX.writeFile(wb, "Kairo_Participants_Status.xlsx");
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.name) return;

    const newParticipant: Participant = {
      id: `m-${Date.now()}`,
      name: manualInput.name,
      college: manualInput.college,
      kairoId: manualInput.kairoId || `K-${participants.length + 1000}`,
      email: manualInput.email,
    };

    setParticipants(prev => [...prev, newParticipant]);
    setPreviewParticipant(newParticipant);
    setManualInput({ name: '', college: '', kairoId: '', email: '' });
  };

  const findColumn = (row: any, keys: string[]) => {
    const rowKeys = Object.keys(row);
    for (const key of keys) {
      const found = rowKeys.find(rk => 
        rk.toLowerCase().trim().replace(/[\s_-]/g, '') === key.toLowerCase().trim().replace(/[\s_-]/g, '')
      );
      if (found) return row[found];
    }
    return '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const parsed: Participant[] = data.map((row, index) => {
          const name = findColumn(row, ['Participant Name', 'Name', 'FullName', 'Student Name', 'Participant']);
          const college = findColumn(row, ['College Name', 'College', 'Institution', 'Organization', 'School']);
          const kairoId = findColumn(row, ['Kairo ID', 'ID', 'Registration ID', 'Roll No', 'KairoID']);
          const email = findColumn(row, ['Email', 'Mail', 'Email Address', 'Participant Email']);

          return {
            id: `p-${index}`,
            name: String(name || '').trim(),
            college: String(college || '').trim(),
            kairoId: String(kairoId || `K-${index + 1000}`).trim(),
            email: String(email || '').trim(),
          };
        }).filter(p => p.name);

        if (parsed.length === 0) {
          setError("No valid names found. Ensure your Excel has a 'Name' column.");
        } else {
          setParticipants(parsed);
          setPreviewParticipant(parsed[0]);
          setActiveTab('data');
        }
      } catch (err) {
        setError("Failed to parse Excel file. Please use a standard .xlsx or .xls file.");
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      setTemplate(evt.target?.result as string);
      setActiveTab('template');
    };
    reader.readAsDataURL(file);
  };

  const generateImage = async (participant: Participant): Promise<Blob> => {
    setPreviewParticipant(participant);
    await new Promise(resolve => setTimeout(resolve, 150));

    if (!certificateRef.current) throw new Error("Certificate element not found");

    const canvas = await html2canvas(certificateRef.current, {
      scale: 3, // High resolution
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to generate blob"));
      }, 'image/png', 1.0);
    });
  };

  const downloadSingle = async (participant: Participant) => {
    try {
      setIsProcessing(true);
      const blob = await generateImage(participant);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${participant.kairoId}_Certificate.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to generate certificate.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAll = async () => {
    if (participants.length === 0) return;
    
    setIsProcessing(true);
    setProgress({ current: 0, total: participants.length });
    const zip = new JSZip();

    try {
      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        const blob = await generateImage(p);
        zip.file(`${p.kairoId}_Certificate.png`, blob);
        setProgress({ current: i + 1, total: participants.length });
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = "Kairo_Certificates.zip";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Bulk generation failed.");
      console.error(err);
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const sendEmail = async (participant: Participant) => {
    if (!participant.email) {
      setError(`No email found for ${participant.name}`);
      return;
    }
    if (!emailSettings.senderEmail || !emailSettings.senderPassword) {
      setError("Please configure sender email and password in the Email tab.");
      setActiveTab('email');
      return;
    }

    try {
      setIsProcessing(true);
      const blob = await generateImage(participant);
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const base64Image = await base64Promise;

      const subject = emailSettings.subject.replace('{name}', participant.name).replace('{college}', participant.college);
      const body = emailSettings.body.replace('{name}', participant.name).replace('{college}', participant.college);

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: participant.email,
          subject,
          body,
          attachment: base64Image,
          senderEmail: emailSettings.senderEmail,
          senderPassword: emailSettings.senderPassword,
          senderHost: emailSettings.host,
          senderPort: emailSettings.port,
          senderSecure: emailSettings.secure
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to send email");
      
      setParticipants(prev => prev.map(p => 
        p.id === participant.id ? { ...p, emailStatus: 'sent' } : p
      ));
      console.log(`Email sent to ${participant.email}`);
    } catch (err: any) {
      setParticipants(prev => prev.map(p => 
        p.id === participant.id ? { ...p, emailStatus: 'failed' } : p
      ));
      setError(`Email failed for ${participant.name}: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const sendAllEmails = async () => {
    if (participants.length === 0) return;
    if (!emailSettings.senderEmail || !emailSettings.senderPassword) {
      setError("Please configure sender email and password in the Email tab.");
      setActiveTab('email');
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: participants.length });

    try {
      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        if (p.email) {
          await sendEmail(p);
        }
        setProgress({ current: i + 1, total: participants.length });
      }
    } catch (err) {
      setError("Bulk email sending failed.");
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const updateConfig = (key: keyof Config, field: keyof TextConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#1e293b] font-sans">
      <div className="max-w-[1400px] mx-auto p-4 md:p-8">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
        >
          <div>
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <Award className="w-6 h-6" />
              <span className="text-xs font-black tracking-[0.2em] uppercase">Kairo Pro</span>
            </div>
            <h1 className="text-4xl font-light tracking-tight text-slate-900">
              E-Certificate <span className="font-bold">Studio</span>
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Professional bulk certificate generation with custom templates.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {participants.length > 0 && (
              <div className="flex gap-2">
                <button 
                  onClick={downloadAll}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                  Download All ({participants.length})
                </button>
                <button 
                  onClick={sendAllEmails}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <MailCheck className="w-5 h-5" />}
                  Email All
                </button>
                {isDriveConnected && (
                  <button 
                    onClick={saveAllToDrive}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    Save to Drive
                  </button>
                )}
                <button 
                  onClick={exportExcelWithStatus}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold transition-all shadow-lg shadow-slate-700/20"
                >
                  <FileDown className="w-5 h-5" />
                  Export Status
                </button>
              </div>
            )}
            <button 
              onClick={() => { setParticipants([]); setTemplate(null); setError(null); }}
              className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-red-500 transition-colors"
              title="Reset All"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Controls */}
          <div className="lg:col-span-4 space-y-6">
            {/* Tabs */}
            <div className="flex p-1 bg-slate-200 rounded-xl">
              <button 
                onClick={() => setActiveTab('data')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'data' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Data
              </button>
              <button 
                onClick={() => setActiveTab('template')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'template' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Settings2 className="w-4 h-4" />
                Template
              </button>
              <button 
                onClick={() => setActiveTab('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'email' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
              <button 
                onClick={() => setActiveTab('drive')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'drive' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ShieldCheck className="w-4 h-4" />
                Drive
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'data' ? (
                <motion.div 
                  key="data-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  {/* Input Mode Toggle */}
                  <div className="flex p-1 bg-slate-100 rounded-lg mb-4">
                    <button 
                      onClick={() => setInputMode('excel')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${inputMode === 'excel' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                    >
                      Excel Upload
                    </button>
                    <button 
                      onClick={() => setInputMode('manual')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${inputMode === 'manual' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                    >
                      Manual Entry
                    </button>
                  </div>

                  {/* Excel Upload */}
                  {inputMode === 'excel' ? (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        1. Upload Participant List
                      </h3>
                      <div className="relative group">
                        <input 
                          type="file" 
                          accept=".xlsx, .xls" 
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="border-2 border-dashed border-slate-200 group-hover:border-indigo-400 rounded-xl p-8 text-center transition-all bg-slate-50 group-hover:bg-indigo-50/30">
                          <FileSpreadsheet className="w-10 h-10 text-slate-300 group-hover:text-indigo-500 mx-auto mb-3 transition-colors" />
                          <p className="text-sm font-bold text-slate-600">Drop Excel file here</p>
                          <p className="text-xs text-slate-400 mt-1">or click to browse</p>
                        </div>
                      </div>
                      {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-600">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <p className="text-xs font-bold leading-tight">{error}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <Type className="w-4 h-4" />
                        1. Manual Entry
                      </h3>
                      <form onSubmit={handleManualSubmit} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Participant Name</label>
                          <input 
                            type="text" 
                            required
                            value={manualInput.name}
                            onChange={(e) => setManualInput({ ...manualInput, name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm"
                            placeholder="John Doe"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">College Name</label>
                          <input 
                            type="text" 
                            value={manualInput.college}
                            onChange={(e) => setManualInput({ ...manualInput, college: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm"
                            placeholder="University of Kairo"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kairo ID (Optional)</label>
                          <input 
                            type="text" 
                            value={manualInput.kairoId}
                            onChange={(e) => setManualInput({ ...manualInput, kairoId: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm"
                            placeholder="K-1001"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                          <input 
                            type="email" 
                            value={manualInput.email}
                            onChange={(e) => setManualInput({ ...manualInput, email: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm"
                            placeholder="john@example.com"
                          />
                        </div>
                        <button 
                          type="submit"
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                        >
                          <Award className="w-4 h-4" />
                          Add Participant
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Participants List */}
                  {participants.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Participants</h3>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-400 font-black">
                          {participants.length}
                        </span>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
                        {participants.map((p, index) => (
                          <motion.div 
                            key={p.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: Math.min(index * 0.02, 0.5) }}
                            onClick={() => setPreviewParticipant(p)}
                            className={`p-4 cursor-pointer transition-all flex items-center justify-between group ${previewParticipant?.id === p.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                          >
                            <div className="min-w-0">
                              <p className={`text-sm font-bold truncate ${previewParticipant?.id === p.id ? 'text-indigo-600' : 'text-slate-700'}`}>{p.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono uppercase truncate">
                                {p.kairoId} • {p.email || 'No Email'} • 
                                <span className={`ml-1 ${p.emailStatus === 'sent' ? 'text-emerald-500' : p.emailStatus === 'failed' ? 'text-red-500' : 'text-slate-400'}`}>
                                  {p.emailStatus || 'pending'}
                                </span>
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); saveToDrive(p); }}
                                className={`p-1.5 rounded-lg transition-all ${p.driveUrl ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 hover:text-indigo-500'}`}
                                title="Save to Drive"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); sendEmail(p); }}
                                className={`p-1.5 rounded-lg transition-all ${previewParticipant?.id === p.id ? 'text-emerald-600 hover:bg-emerald-100' : 'text-slate-300 hover:text-emerald-500'}`}
                                title="Send Email"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                              <Download className={`w-4 h-4 transition-all ${previewParticipant?.id === p.id ? 'text-indigo-400 opacity-100' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : activeTab === 'template' ? (
                <motion.div 
                  key="template-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                  {/* Template Upload */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      2. Upload Template Image
                    </h3>
                    <div className="relative group">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleTemplateUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="border-2 border-dashed border-slate-200 group-hover:border-indigo-400 rounded-xl p-8 text-center transition-all bg-slate-50 group-hover:bg-indigo-50/30">
                        {template ? (
                          <img src={template} className="w-20 h-auto mx-auto mb-2 rounded shadow-sm" referrerPolicy="no-referrer" />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-slate-300 group-hover:text-indigo-500 mx-auto mb-3 transition-colors" />
                        )}
                        <p className="text-sm font-bold text-slate-600">{template ? 'Change Template' : 'Upload Image'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Positioning Controls */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Move className="w-4 h-4" />
                      3. Adjust Text Layout
                    </h3>
                    
                    {(['name', 'college', 'id'] as const).map((field) => (
                      <div key={field} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500">{field}</span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => updateConfig(field, 'bold', !config[field].bold)}
                              className={`p-1.5 rounded-md transition-all ${config[field].bold ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}
                            >
                              <Type className="w-3 h-3" />
                            </button>
                            <input 
                              type="color" 
                              value={config[field].color}
                              onChange={(e) => updateConfig(field, 'color', e.target.value)}
                              className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                              <span>Font Style</span>
                            </div>
                            <select 
                              value={config[field].fontFamily}
                              onChange={(e) => updateConfig(field, 'fontFamily', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-indigo-500"
                            >
                              {availableFonts.map(f => (
                                <option key={f.value} value={f.value}>{f.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                              <span>Add Google Font</span>
                            </div>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={customFontName}
                                onChange={(e) => setCustomFontName(e.target.value)}
                                placeholder="e.g. Roboto"
                                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-indigo-500"
                              />
                              <button 
                                onClick={addCustomFont}
                                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                              <span>Horizontal Position (X)</span>
                              <span>{config[field].x}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="100" 
                              value={config[field].x}
                              onChange={(e) => updateConfig(field, 'x', parseInt(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                              <span>Vertical Position (Y)</span>
                              <span>{config[field].y}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="100" 
                              value={config[field].y}
                              onChange={(e) => updateConfig(field, 'y', parseInt(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                              <span>Font Size</span>
                              <span>{config[field].fontSize}px</span>
                            </div>
                            <input 
                              type="range" min="8" max="120" 
                              value={config[field].fontSize}
                              onChange={(e) => updateConfig(field, 'fontSize', parseInt(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : activeTab === 'drive' ? (
                <motion.div 
                  key="drive-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Google Drive Integration
                    </h3>
                    
                    {!isDriveConnected ? (
                      <div className="space-y-4">
                        <p className="text-sm text-slate-600">Connect your Google Drive to automatically save certificates and provide download links to participants.</p>
                        <button 
                          onClick={connectDrive}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Connect Google Drive
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                          <ShieldCheck className="w-6 h-6 text-emerald-500" />
                          <div>
                            <p className="text-sm font-bold text-emerald-700">Drive Connected</p>
                            <p className="text-xs text-emerald-600">Certificates will be saved to "Kairo Certificates" folder.</p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={saveAllToDrive}
                          disabled={isProcessing}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          Save All to Drive
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Participant Download Portal
                    </h3>
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">Once certificates are uploaded to Drive, participants can download them using this link:</p>
                      <div className="flex gap-2">
                        <div className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs break-all">
                          {window.location.origin}/download/{"{KAIRO_ID}"}
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/download/`);
                            alert("Base link copied! Participants just need to add their 4-digit ID at the end.");
                          }}
                          className="px-4 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 italic">Example: {window.location.origin}/download/1001</p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="email-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                  {/* Sender Login */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      1. Sender Credentials
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sender Email (Gmail)</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="email" 
                            value={emailSettings.senderEmail}
                            onChange={(e) => setEmailSettings({ ...emailSettings, senderEmail: e.target.value })}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                            placeholder="your-email@gmail.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">App Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                          type="password" 
                          value={emailSettings.senderPassword}
                          onChange={(e) => setEmailSettings({ ...emailSettings, senderPassword: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                          placeholder="••••••••••••••••"
                        />
                        </div>
                      </div>
                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                        <p className="text-[10px] text-amber-700 font-bold mb-1">⚠️ Important for Gmail Users:</p>
                        <p className="text-[10px] text-amber-600 leading-tight">
                          You cannot use your regular password. You must generate a 16-character <strong>App Password</strong> from your Google Account settings.
                        </p>
                        <a 
                          href="https://myaccount.google.com/apppasswords" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] text-indigo-600 font-bold underline mt-1 block"
                        >
                          Generate App Password here →
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Email Content */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      2. Email Content
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Line</label>
                        <input 
                          type="text" 
                          value={emailSettings.subject}
                          onChange={(e) => setEmailSettings({ ...emailSettings, subject: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                          placeholder="Your Certificate"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message Body</label>
                        <textarea 
                          rows={5}
                          value={emailSettings.body}
                          onChange={(e) => setEmailSettings({ ...emailSettings, body: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm resize-none"
                          placeholder="Dear {name}..."
                        />
                        <p className="text-[10px] text-slate-400 mt-1 italic">Use {'{name}'} and {'{college}'} as placeholders.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 sticky top-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <Eye className="w-6 h-6 text-indigo-600" />
                  Live Preview
                </h2>
                {isProcessing && progress.total > 0 && (
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                      Processing {progress.current} / {progress.total}
                    </span>
                    <div className="w-40 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-indigo-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="relative aspect-[1.414/1] w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center group">
                <AnimatePresence mode="wait">
                  {previewParticipant ? (
                    <motion.div 
                      key={previewParticipant.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                      ref={certificateRef}
                      className="w-[1000px] h-[707px] bg-white relative overflow-hidden"
                    >
                      {template ? (
                        <img 
                          src={template} 
                          className="absolute inset-0 w-full h-full object-cover" 
                          alt="Template"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-20 text-center bg-white">
                          <div className="absolute inset-10 border-[20px] border-indigo-50 rounded-sm" />
                          <div className="absolute inset-16 border border-indigo-100" />
                          <Award className="w-24 h-24 text-indigo-100 mb-6" />
                          <h3 className="text-xs font-black tracking-[0.4em] uppercase text-indigo-200 mb-20">Certificate of Achievement</h3>
                          <div className="w-40 h-px bg-slate-100 mt-40" />
                        </div>
                      )}

                      {/* Dynamic Text Layers */}
                      <div 
                        className="absolute w-full text-center pointer-events-none transition-all duration-200"
                        style={{ 
                          top: `${config.name.y}%`, 
                          left: `${config.name.x}%`, 
                          transform: 'translate(-50%, -50%)',
                          fontSize: `${config.name.fontSize}px`,
                          color: config.name.color,
                          fontWeight: config.name.bold ? 'bold' : 'normal',
                          fontFamily: config.name.fontFamily
                        }}
                      >
                        {previewParticipant.name}
                      </div>

                      <div 
                        className="absolute w-full text-center pointer-events-none transition-all duration-200"
                        style={{ 
                          top: `${config.college.y}%`, 
                          left: `${config.college.x}%`, 
                          transform: 'translate(-50%, -50%)',
                          fontSize: `${config.college.fontSize}px`,
                          color: config.college.color,
                          fontWeight: config.college.bold ? 'bold' : 'normal',
                          fontFamily: config.college.fontFamily
                        }}
                      >
                        {previewParticipant.college}
                      </div>

                      <div 
                        className="absolute w-full text-center pointer-events-none transition-all duration-200"
                        style={{ 
                          top: `${config.id.y}%`, 
                          left: `${config.id.x}%`, 
                          transform: 'translate(-50%, -50%)',
                          fontSize: `${config.id.fontSize}px`,
                          color: config.id.color,
                          fontWeight: config.id.bold ? 'bold' : 'normal',
                          fontFamily: config.id.fontFamily
                        }}
                      >
                        {previewParticipant.kairoId}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center p-20">
                      <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <FileSpreadsheet className="w-10 h-10 text-slate-500" />
                      </div>
                      <p className="text-slate-400 font-bold text-lg">Waiting for data...</p>
                      <p className="text-slate-600 text-sm mt-2">Upload an Excel file to start generating.</p>
                    </div>
                  )}
                </AnimatePresence>
                
                {previewParticipant && (
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => downloadSingle(previewParticipant)}
                      className="bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg text-indigo-600 hover:bg-white transition-all"
                    >
                      <Download className="w-6 h-6" />
                    </button>
                  </div>
                )}
              </div>

              {previewParticipant && (
                <div className="mt-10 flex flex-col items-center gap-4">
                  <button 
                    onClick={() => downloadSingle(previewParticipant)}
                    disabled={isProcessing}
                    className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-slate-900 hover:bg-black text-white font-black transition-all shadow-2xl shadow-slate-900/40 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                    Download PNG
                  </button>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">High Resolution 300DPI Output</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 py-12 border-t border-slate-200 text-center bg-white">
        <div className="flex items-center justify-center gap-2 text-indigo-600 mb-4">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-sm font-black tracking-widest uppercase">Kairo Certified</span>
        </div>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          The professional standard for automated event certification. 
          Secure, fast, and fully customizable.
        </p>
      </footer>
    </div>
  );
}
