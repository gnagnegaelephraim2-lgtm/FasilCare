/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  FileUp, 
  Send, 
  RotateCcw, 
  Check, 
  X, 
  ChevronRight,
  MessageSquarePlus,
  Type as TypeIcon,
  Loader2,
  Plus,
  Search,
  Bell,
  User,
  History,
  Settings,
  ArrowRight,
  Stethoscope,
  Clock,
  AlertCircle,
  MessageSquare,
  FileText
} from 'lucide-react';
import { cn } from './lib/utils';
import { generateInitialContent, iterateOnText, generateBilingualSMS, analyzePatientDelays } from './lib/ai';

type View = 'landing' | 'patient' | 'staff';

interface Test {
  id: string;
  name: string;
  date: string;
  ref: string;
  status: 'Results ready' | 'In progress' | 'Pending' | 'Delayed';
  waitingDays?: number;
}

interface Patient {
  id: string;
  name: string;
  ref: string;
  tests: Test[];
}

const MOCK_PATIENT: Patient = {
  id: 'p1',
  name: 'Aisha Mohamad',
  ref: 'SSRN-2024-0312',
  tests: [
    { id: 't1', name: 'Blood test — full panel', date: '12 March', ref: 'SSRN-0312', status: 'Results ready' },
    { id: 't2', name: 'Chest X-ray', date: '18 March', ref: 'SSRN-0298', status: 'In progress' },
    { id: 't3', name: 'Referral — cardiology', date: '20 March', ref: 'SSRN-0315', status: 'Pending' },
    { id: 'h1', name: 'Urinalysis', date: '15 Jan 2026', ref: 'SSRN-0102', status: 'Results ready' },
    { id: 'h2', name: 'ECG Scan', date: '02 Dec 2025', ref: 'SSRN-0045', status: 'Results ready' },
    { id: 'h3', name: 'General Consultation', date: '10 Nov 2025', ref: 'SSRN-0012', status: 'Results ready' },
  ]
};

const MOCK_STAFF_PATIENTS: Patient[] = [
  { id: 'p1', name: 'Aisha Mohamad', ref: 'SSRN-0312', tests: [{ id: 't1', name: 'Blood test', date: '12 March', ref: 'SSRN-0312', status: 'Results ready', waitingDays: 4 }] },
  { id: 'p2', name: 'Ravi Goburdhun', ref: 'SSRN-0287', tests: [{ id: 't2', name: 'MRI scan', date: '15 March', ref: 'SSRN-0287', status: 'Delayed', waitingDays: 18 }] },
  { id: 'p3', name: 'Fatima Sulliman', ref: 'SSRN-0301', tests: [{ id: 't3', name: 'Lab results', date: '16 March', ref: 'SSRN-0301', status: 'In progress', waitingDays: 7 }] },
  { id: 'p4', name: 'Jean-Paul Labonte', ref: 'SSRN-0315', tests: [{ id: 't4', name: 'Referral — cardiology', date: '20 March', ref: 'SSRN-0315', status: 'Pending', waitingDays: 2 }] },
];

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [selectedPatientForSms, setSelectedPatientForSms] = useState<Patient | null>(null);
  const [selectedPatientForAssign, setSelectedPatientForAssign] = useState<Patient | null>(null);
  const [generatedSms, setGeneratedSms] = useState<{ english: string, creole: string } | null>(null);
  const [isGeneratingSms, setIsGeneratingSms] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAiAnalysis = async () => {
    setIsAiAnalyzing(true);
    try {
      const dataStr = JSON.stringify(MOCK_STAFF_PATIENTS);
      const result = await analyzePatientDelays(dataStr);
      setAiAnalysis(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleGenerateSms = async (patient: Patient) => {
    setSelectedPatientForSms(patient);
    setIsGeneratingSms(true);
    try {
      const test = patient.tests[0];
      const portalLink = `https://fasilcare.mu/portal/${patient.ref}`;
      const result = await generateBilingualSMS(
        `${test.name} for ${patient.name}. Status: ${test.status}`,
        test.status === 'Results ready' ? portalLink : undefined
      );
      setGeneratedSms(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingSms(false);
    }
  };

  const handleAssignTest = (patient: Patient) => {
    setSelectedPatientForAssign(patient);
  };

  const confirmAssignment = () => {
    setIsAssigning(true);
    setTimeout(() => {
      setIsAssigning(false);
      setSelectedPatientForAssign(null);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1a1a1a] font-sans">
      {view === 'landing' && (
        <LandingPage onTrack={() => setView('patient')} onStaff={() => setView('staff')} />
      )}
      
      {view === 'patient' && (
        <PatientDashboard patient={MOCK_PATIENT} onBack={() => setView('landing')} />
      )}

      {view === 'staff' && (
        <StaffDashboard 
          patients={MOCK_STAFF_PATIENTS} 
          onBack={() => setView('landing')} 
          onAiAnalysis={handleAiAnalysis}
          isAiAnalyzing={isAiAnalyzing}
          aiAnalysis={aiAnalysis}
          onSendSms={handleGenerateSms}
          onAssign={handleAssignTest}
        />
      )}

      {/* SMS Modal */}
      <AnimatePresence>
        {selectedPatientForSms && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPatientForSms(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Send SMS Update</h3>
                  <p className="text-sm text-gray-500">To: {selectedPatientForSms.name} ({selectedPatientForSms.ref})</p>
                </div>
                <button onClick={() => setSelectedPatientForSms(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isGeneratingSms ? (
                <div className="flex flex-col items-center py-12 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  <p className="text-sm text-gray-500 font-medium">Generating bilingual message...</p>
                </div>
              ) : generatedSms ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2 block">English</span>
                      <p className="text-gray-800">{generatedSms.english}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-2 block">Mauritian Creole</span>
                      <p className="text-gray-800">{generatedSms.creole}</p>
                    </div>
                  </div>
                  <button className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Send Now
                  </button>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Modal */}
      <AnimatePresence>
        {selectedPatientForAssign && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPatientForAssign(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Assign Diagnostic Test</h3>
                  <p className="text-sm text-gray-500">Patient: {selectedPatientForAssign.name}</p>
                </div>
                <button onClick={() => setSelectedPatientForAssign(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Select Department</label>
                  <select className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 focus:ring-2 focus:ring-emerald-500/20 outline-none">
                    <option>Radiology</option>
                    <option>Pathology</option>
                    <option>Cardiology</option>
                    <option>General Medicine</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Priority Level</label>
                  <div className="flex gap-2">
                    {['Routine', 'Urgent', 'Emergency'].map(p => (
                      <button key={p} className="flex-1 py-2 rounded-lg border border-gray-100 text-xs font-bold hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={confirmAssignment}
                disabled={isAssigning}
                className="w-full py-3 bg-emerald-900 text-white rounded-xl font-bold hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
              >
                {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Confirm Assignment
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LandingPage({ onTrack, onStaff }: { onTrack: () => void, onStaff: () => void }) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="h-20 px-8 flex items-center justify-between bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-emerald-900">FasilCare</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
          <a href="#" className="hover:text-emerald-600">How it works</a>
          <a href="#" className="hover:text-emerald-600">For hospitals</a>
          <a href="#" className="hover:text-emerald-600">About</a>
          <button onClick={onTrack} className="px-6 py-2 bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 transition-colors">
            Track my test
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row items-center px-8 md:px-24 py-12 gap-16">
        <div className="flex-1 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Public hospitals · Mauritius
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-emerald-950 leading-tight">
            Know where your health test is — <span className="text-emerald-600">always</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-lg leading-relaxed">
            FasilCare sends automatic SMS updates when your scan is scheduled, results are ready, or you need to return.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={onTrack} className="px-8 py-4 bg-emerald-700 text-white rounded-xl font-bold text-lg hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-200">
              Track my test
            </button>
            <button onClick={onStaff} className="px-8 py-4 bg-white text-emerald-700 border-2 border-emerald-100 rounded-xl font-bold text-lg hover:bg-emerald-50 transition-all">
              I am a healthcare worker
            </button>
          </div>
        </div>

        <div className="flex-1 relative">
          <div className="bg-emerald-950 rounded-[2rem] p-8 shadow-2xl transform md:rotate-2">
            <div className="space-y-6">
              <div className="flex items-center justify-between text-emerald-400 text-xs font-bold uppercase tracking-widest">
                <span>FasilCare — Your test updates</span>
                <Bell className="w-4 h-4" />
              </div>
              <div className="space-y-4">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
                  <p className="text-white text-sm leading-relaxed">
                    Your blood test results are ready. Return to SSRN Hospital, Room 4, 8am-12pm. Ref: SSRN-0312
                  </p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
                  <p className="text-white text-sm leading-relaxed">
                    Chest X-ray scheduled Tuesday 25 March at 10:00am. Arrive 15 mins early.
                  </p>
                </div>
                <div className="bg-emerald-500/20 p-4 rounded-2xl border border-emerald-500/20">
                  <p className="text-emerald-100 text-sm leading-relaxed">
                    Ou bann rezilta tess disang pare. Al SSRN Hospital, Lasal 4. Ref: SSRN-0312
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Stats overlay */}
          <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 flex gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-900">60%</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hospitals</div>
            </div>
            <div className="w-px h-10 bg-gray-100" />
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-900">SMS</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No App</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function PatientDashboard({ patient, onBack }: { patient: Patient, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'tests' | 'sms' | 'profile' | 'settings'>('tests');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const activeTests = patient.tests.filter(t => t.status !== 'Results ready' || t.id.startsWith('t'));
  const historicalTests = patient.tests.filter(t => t.id.startsWith('h'));

  const navItems = [
    { id: 'tests', label: 'My tests', icon: FileText },
    { id: 'sms', label: 'SMS history', icon: History },
    { id: 'profile', label: 'My profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const SidebarContent = () => (
    <>
      <div className="p-8">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-emerald-900">FasilCare</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all",
                activeTab === item.id 
                  ? "bg-emerald-50 text-emerald-700" 
                  : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-8 border-t border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">
            AM
          </div>
          <div>
            <div className="text-sm font-bold">{patient.name}</div>
            <div className="text-[10px] text-gray-400 font-medium">{patient.ref}</div>
          </div>
        </div>
        <button onClick={onBack} className="mt-6 w-full py-2 text-xs font-bold text-gray-400 hover:text-emerald-600 transition-colors">
          Log out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Mobile Header */}
      <header className="lg:hidden h-16 px-6 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-emerald-900">FasilCare</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className="w-6 h-0.5 bg-gray-600 mb-1.5" />
          <div className="w-6 h-0.5 bg-gray-600 mb-1.5" />
          <div className="w-6 h-0.5 bg-gray-600" />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-100 flex-col sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-[70] flex flex-col shadow-2xl lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-12">
          {activeTab === 'tests' && (
            <>
              <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-emerald-950">Good morning, Aisha</h2>
                  <p className="text-gray-500 font-medium">Monday, 23 March 2026 · SSRN Hospital</p>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-start md:items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1.5 md:mt-0 shrink-0" />
                <p className="text-emerald-800 text-sm font-medium">
                  Action needed: Your blood test results are ready. Return to SSRN Hospital, Room 4, between 8am–12pm.
                </p>
              </div>

              {/* Active Tests */}
              <section className="space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 px-2">Active Tests</h3>
                <div className="grid grid-cols-1 gap-4">
                  {activeTests.map((test) => (
                    <div key={test.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div>
                          <h3 className="font-bold text-gray-900">{test.name}</h3>
                          <p className="text-xs text-gray-400 font-medium">Requested {test.date} · Ref {test.ref}</p>
                        </div>
                        <span className={cn(
                          "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap",
                          test.status === 'Results ready' ? "bg-emerald-100 text-emerald-700" :
                          test.status === 'In progress' ? "bg-blue-100 text-blue-700" :
                          "bg-orange-100 text-orange-700"
                        )}>
                          {test.status}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: test.status === 'Results ready' ? '100%' : test.status === 'In progress' ? '60%' : '20%' }}
                          className={cn(
                            "h-full rounded-full",
                            test.status === 'Results ready' ? "bg-emerald-500" :
                            test.status === 'In progress' ? "bg-blue-500" :
                            "bg-orange-500"
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Test History */}
              <section className="space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 px-2">Test History</h3>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                  <table className="w-full text-left min-w-[500px]">
                    <thead>
                      <tr className="border-b border-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        <th className="px-6 py-4">Test Name</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Reference</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {historicalTests.map((test) => (
                        <tr key={test.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">{test.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{test.date}</td>
                          <td className="px-6 py-4 text-xs font-mono text-gray-400">{test.ref}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              Completed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {activeTab === 'sms' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-emerald-950">SMS History</h2>
                <p className="text-gray-500 font-medium">View all updates sent to your phone</p>
              </div>
              <div className="space-y-4">
                {[
                  { date: '23 March, 08:30', msg: 'Your blood test results are ready. Return to SSRN Hospital, Room 4, between 8am–12pm.', type: 'Update' },
                  { date: '18 March, 10:15', msg: 'Chest X-ray scheduled Tuesday 25 March at 10:00am. Arrive 15 mins early.', type: 'Schedule' },
                  { date: '12 March, 09:00', msg: 'Blood test — full panel requested at SSRN Hospital. Ref: SSRN-0312', type: 'Request' },
                ].map((sms, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">{sms.type}</span>
                      <span className="text-[10px] font-medium text-gray-400">{sms.date}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{sms.msg}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-emerald-950">My Profile</h2>
                <p className="text-gray-500 font-medium">Personal information and medical ID</p>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center gap-6 pb-6 border-b border-gray-50">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-3xl text-emerald-700 font-bold">
                    AM
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{patient.name}</h3>
                    <p className="text-gray-500 font-medium">Patient Reference: {patient.ref}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Phone Number</label>
                    <p className="font-bold text-gray-900">+230 5123 4567</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Date of Birth</label>
                    <p className="font-bold text-gray-900">14 May 1988</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Blood Type</label>
                    <p className="font-bold text-gray-900">O Positive</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Primary Hospital</label>
                    <p className="font-bold text-gray-900">SSRN Hospital</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-emerald-950">Settings</h2>
                <p className="text-gray-500 font-medium">Manage your preferences and notifications</p>
              </div>
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900">SMS Notifications</h4>
                    <p className="text-xs text-gray-500">Receive real-time updates on your phone</p>
                  </div>
                  <div className="w-12 h-6 bg-emerald-600 rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900">Biometric Login</h4>
                    <p className="text-xs text-gray-500">Use FaceID or Fingerprint to unlock</p>
                  </div>
                  <div className="w-12 h-6 bg-gray-200 rounded-full relative">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
                <div className="p-6">
                  <button className="text-sm font-bold text-red-600 hover:text-red-700">
                    Delete medical history
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StaffDashboard({ 
  patients, 
  onBack, 
  onAiAnalysis, 
  isAiAnalyzing, 
  aiAnalysis,
  onSendSms,
  onAssign
}: { 
  patients: Patient[], 
  onBack: () => void,
  onAiAnalysis: () => void,
  isAiAnalyzing: boolean,
  aiAnalysis: string | null,
  onSendSms: (p: Patient) => void,
  onAssign: (p: Patient) => void
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="h-20 bg-emerald-900 text-white px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="font-bold text-xl">FasilCare — Staff Portal</span>
        </div>
        <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-emerald-300">
          <span>SSRN Hospital</span>
          <div className="w-px h-4 bg-emerald-800" />
          <span>Dr. Patel</span>
          <div className="w-px h-4 bg-emerald-800" />
          <span>Diagnostics</span>
          <button onClick={onBack} className="ml-4 p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="p-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard label="Active patients" value="24" color="emerald" />
          <StatCard label="Results ready" value="8" color="emerald" />
          <StatCard label="Tests pending" value="11" color="blue" />
          <StatCard label="Delayed — action!" value="3" color="red" />
        </div>

        {/* AI Analysis Section */}
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-emerald-50/30">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-emerald-900">AI Workflow Assistant</h3>
            </div>
            <button 
              onClick={onAiAnalysis}
              disabled={isAiAnalyzing}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isAiAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Analyze Bottlenecks
            </button>
          </div>
          <div className="p-6">
            {aiAnalysis ? (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                {aiAnalysis}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 italic text-sm">
                Click analyze to get AI-powered insights on patient delays and workflow optimizations.
              </div>
            )}
          </div>
        </div>

        {/* Patient Table */}
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-6 bg-red-50/50 border-b border-red-100 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm font-bold text-red-800">
              3 patients have tests delayed over 14 days. Please review and update their status to resume SMS notifications.
            </p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-50">
                <th className="px-8 py-6">Patient</th>
                <th className="px-8 py-6">Test</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Waiting</th>
                <th className="px-8 py-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="font-bold text-gray-900">{p.name}</div>
                    <div className="text-[10px] text-gray-400 font-medium">{p.ref}</div>
                  </td>
                  <td className="px-8 py-6 text-sm font-medium text-gray-600">
                    {p.tests[0].name}
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      p.tests[0].status === 'Results ready' ? "bg-emerald-100 text-emerald-700" :
                      p.tests[0].status === 'Delayed' ? "bg-red-100 text-red-700" :
                      p.tests[0].status === 'In progress' ? "bg-blue-100 text-blue-700" :
                      "bg-orange-100 text-orange-700"
                    )}>
                      {p.tests[0].status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className={cn(
                      "text-sm font-bold",
                      (p.tests[0].waitingDays || 0) > 10 ? "text-red-600" : "text-gray-600"
                    )}>
                      {p.tests[0].waitingDays} days
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <button 
                      onClick={() => {
                        if (p.tests[0].status === 'Pending') {
                          onAssign(p);
                        } else {
                          onSendSms(p);
                        }
                      }}
                      className={cn(
                        "px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                        p.tests[0].status === 'Results ready' ? "bg-emerald-600 text-white hover:bg-emerald-700" :
                        p.tests[0].status === 'Delayed' ? "bg-red-600 text-white hover:bg-red-700" :
                        p.tests[0].status === 'Pending' ? "bg-blue-600 text-white hover:bg-blue-700" :
                        "bg-emerald-900 text-white hover:bg-emerald-800"
                      )}
                    >
                      {p.tests[0].status === 'Results ready' ? <MessageSquare className="w-3 h-3" /> : 
                       p.tests[0].status === 'Pending' ? <Plus className="w-3 h-3" /> : null}
                      {p.tests[0].status === 'Results ready' ? 'Send SMS' : 
                       p.tests[0].status === 'Delayed' ? 'Update' : 
                       p.tests[0].status === 'In progress' ? 'Mark done' : 'Assign'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string, value: string, color: 'emerald' | 'blue' | 'red' }) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm text-center space-y-2">
      <div className={cn(
        "text-4xl font-bold",
        color === 'emerald' ? "text-emerald-600" :
        color === 'blue' ? "text-blue-600" : "text-red-600"
      )}>
        {value}
      </div>
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</div>
    </div>
  );
}
