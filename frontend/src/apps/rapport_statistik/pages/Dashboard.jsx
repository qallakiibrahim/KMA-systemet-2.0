import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Shield, CheckSquare, FileText, Bot, RefreshCw, Sparkles } from 'lucide-react';
import { getAvvikelser } from '../../avvikelse/api/avvikelse';
import { getRisker } from '../../risk/api/risk';
import { getTasks } from '../../task/api/tasksApi';
import { getDokuments } from '../../dokument/api/dokument';
import { getAiInstance } from '../../../shared/utils/aiUtils';
import { getCompanyAuditLogs } from '../../../shared/api/auditLog';
import { useAuth } from '../../../shared/api/AuthContext';
import '../styles/Dashboard.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    avvikelser: [],
    risker: [],
    tasks: [],
    dokument: []
  });
  const [aiInsight, setAiInsight] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const { userProfile } = useAuth();
  const [selectedMatrixCell, setSelectedMatrixCell] = useState(null);

  const generateAiInsight = async (currentStats) => {
    setIsAiLoading(true);
    setAiError('');
    try {
      const ai = await getAiInstance();
      if (!ai) {
        setAiError('AI-nyckel saknas. Anslut en nyckel för att få insikter. Om du nyss har anslutit den, prova att ladda om sidan.');
        return;
      }

      const prompt = `Analysera följande data från ett ledningssystem och ge en kort, proaktiv "Dagens AI-insikt" (max 3 meningar). Ge konkreta råd om vad ledningen bör fokusera på idag baserat på siffrorna. Svara på svenska.

Data:
- Antal avvikelser: ${currentStats.avvikelser.length} (${currentStats.avvikelser.filter(a => a.status === 'open').length} öppna)
- Antal risker: ${currentStats.risker.length}
- Antal uppgifter: ${currentStats.tasks.length} (${currentStats.tasks.filter(t => t.status !== 'done').length} ej klara)
- Antal dokument: ${currentStats.dokument.length}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      if (response && response.text) {
        setAiInsight(response.text);
      } else {
        throw new Error('Inget svar från AI');
      }
    } catch (error) {
      console.error('AI Insight Error:', error);
      setAiError('Kunde inte generera AI-insikt.');
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile?.company_id && userProfile?.role !== 'superadmin') return;
      try {
        const companyId = userProfile?.company_id;
        const [avvikelserData, riskerData, tasksData, dokumentData] = await Promise.all([
          getAvvikelser(companyId, 1, -1),
          getRisker(companyId, 1, -1),
          getTasks(companyId, 1, -1),
          getDokuments(companyId, 1, -1)
        ]);
        
        const newStats = {
          avvikelser: avvikelserData || [],
          risker: riskerData || [],
          tasks: tasksData || [],
          dokument: dokumentData || []
        };
        
        setStats(newStats);
        generateAiInsight(newStats);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="loading-spinner">Laddar statistik...</div>;
  }

  // KPI Calculations
  const totalAvvikelser = stats.avvikelser.length;
  const totalRisker = stats.risker.length;
  const totalTasks = stats.tasks.length;
  const totalDokument = stats.dokument.length;

  // Revisionshälsa calculations
  const totalDocs = stats.dokument.length;
  const approvedDocs = stats.dokument.filter(d => d.status === 'godkänd');
  const activeDocsCount = approvedDocs.length;
  
  let overdueCount = 0;
  let normalReviewCount = 0;
  let soonReviewCount = 0;
  
  approvedDocs.forEach(d => {
    if (!d.next_review_date) {
      normalReviewCount++;
      return;
    }
    const nextReview = new Date(d.next_review_date);
    const today = new Date();
    const diffTime = nextReview - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      overdueCount++;
    } else if (diffDays <= 30) {
      soonReviewCount++;
    } else {
      normalReviewCount++;
    }
  });

  const draftDocsCount = stats.dokument.filter(d => d.status === 'utkast').length;
  const reviewDocsCount = stats.dokument.filter(d => d.status === 'granskning').length;
  const archivedDocsCount = stats.dokument.filter(d => d.status === 'arkiverad').length;

  // Risk matrix grid
  const riskMatrix = Array(5).fill(0).map(() => Array(5).fill(0));
  stats.risker.forEach(r => {
    const l = Math.min(5, Math.max(1, parseInt(r.likelihood) || 1));
    const i = Math.min(5, Math.max(1, parseInt(r.impact) || 1));
    riskMatrix[5 - i][l - 1]++;
  });

  // Filter risks matching the selected cell
  const filteredCellRisks = selectedMatrixCell 
    ? stats.risker.filter(r => {
        const l = Math.min(5, Math.max(1, parseInt(r.likelihood) || 1));
        const i = Math.min(5, Math.max(1, parseInt(r.impact) || 1));
        return l === selectedMatrixCell.likelihood && i === selectedMatrixCell.impact;
      })
    : [];

  // Process data for charts
  
  // 1. Avvikelser by Status
  const avvikelseStatusCount = stats.avvikelser.reduce((acc, curr) => {
    const status = curr.status || 'open';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  const avvikelsePieData = Object.keys(avvikelseStatusCount).map(key => ({
    name: key === 'open' ? 'Öppna' : key === 'in-progress' ? 'Pågående' : 'Stängda',
    value: avvikelseStatusCount[key]
  }));

  // 2. Tasks by Status
  const taskStatusCount = stats.tasks.reduce((acc, curr) => {
    const status = curr.status || 'todo';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  const taskPieData = Object.keys(taskStatusCount).map(key => ({
    name: key === 'todo' ? 'Att göra' : key === 'in-progress' ? 'Pågående' : 'Klara',
    value: taskStatusCount[key]
  }));

  // 3. Trend over time (last 6 months)
  const getMonthName = (dateString) => {
    if (!dateString) return 'Okänt';
    const date = new Date(dateString);
    return date.toLocaleString('sv-SE', { month: 'short' });
  };

  const trendDataMap = {};
  
  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthName = d.toLocaleString('sv-SE', { month: 'short' });
    trendDataMap[monthName] = { name: monthName, avvikelser: 0, risker: 0 };
  }

  stats.avvikelser.forEach(item => {
    const month = getMonthName(item.created_at);
    if (trendDataMap[month]) {
      trendDataMap[month].avvikelser += 1;
    }
  });

  stats.risker.forEach(item => {
    const month = getMonthName(item.created_at);
    if (trendDataMap[month]) {
      trendDataMap[month].risker += 1;
    }
  });

  const trendData = Object.values(trendDataMap);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Statistik & Rapporter</h1>
        <p>Övergripande översikt över systemets data</p>
      </div>

      <div className="ai-insight-card">
        <div className="ai-insight-icon">
          <Bot size={28} />
        </div>
        <div className="ai-insight-content">
          <h2><Sparkles size={18} /> Dagens AI-insikt</h2>
          {isAiLoading ? (
            <div className="ai-insight-loading">
              <RefreshCw size={16} className="animate-spin" /> Analyserar systemdata...
            </div>
          ) : aiError ? (
            <p className="ai-insight-error">{aiError}</p>
          ) : (
            <>
              <p className="ai-insight-text">{aiInsight || 'Välj en API-nyckel i Admin-panelen för att få proaktiva insikter.'}</p>
              <button className="btn btn-secondary btn-sm" onClick={() => generateAiInsight(stats)}>
                <RefreshCw size={14} /> Uppdatera insikt
              </button>
            </>
          )}
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon avvikelse-icon"><AlertTriangle size={24} /></div>
          <div className="kpi-content">
            <h3>Avvikelser</h3>
            <p className="kpi-value">{totalAvvikelser}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon risk-icon"><Shield size={24} /></div>
          <div className="kpi-content">
            <h3>Risker</h3>
            <p className="kpi-value">{totalRisker}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon task-icon"><CheckSquare size={24} /></div>
          <div className="kpi-content">
            <h3>Uppgifter</h3>
            <p className="kpi-value">{totalTasks}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon doc-icon"><FileText size={24} /></div>
          <div className="kpi-content">
            <h3>Dokument</h3>
            <p className="kpi-value">{totalDokument}</p>
          </div>
        </div>
      </div>

      {/* Brand new interactive ISO Compliance & Risk Matrix Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-8">
        {/* Risk Heatmap (5x5 Grid) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-[0.625rem] border border-slate-200 dark:border-slate-700/85 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2 m-0">
                  <Shield size={18} className="text-emerald-500" />
                  ISO 31000 Riskmatris (Heatmap)
                </h2>
                <p className="text-xs text-slate-400 mt-1 m-0">Realtidskartläggning av konsekvens och sannolikhet</p>
              </div>
              {selectedMatrixCell && (
                <button 
                  onClick={() => setSelectedMatrixCell(null)}
                  className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 py-1 px-2.5 rounded-md font-semibold transition"
                  style={{ borderRadius: '0.625rem' }}
                >
                  Visa alla risker
                </button>
              )}
            </div>

            {/* Matrix Visual Grid */}
            <div className="flex flex-col items-center justify-center my-4">
              <div className="flex w-full max-w-sm justify-between text-[9px] text-slate-400 font-bold mb-1 pl-12 pr-4 select-none">
                <span>LIKELIHOOD / SANNOLIKHET →</span>
              </div>
              <div className="flex gap-2 w-full max-w-sm">
                {/* Y-Axis Label */}
                <div className="flex flex-col justify-between items-center text-[9px] text-slate-400 font-bold w-10 shrink-0 uppercase py-6 pr-1 select-none">
                  <span className="transform -rotate-90 origin-center whitespace-nowrap">CONSEQUENCE / KONSEKVENS</span>
                </div>

                {/* 5x5 Grid Container */}
                <div className="flex-1 space-y-1">
                  {riskMatrix.map((row, iIdx) => {
                    const impactVal = 5 - iIdx;
                    return (
                      <div key={iIdx} className="grid grid-cols-5 gap-1">
                        {row.map((count, lIdx) => {
                          const likelihoodVal = lIdx + 1;
                          const score = impactVal * likelihoodVal;
                          
                          // Determine cell colors
                          let bgClass = "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40 hover:bg-emerald-100/80";
                          if (score >= 12) {
                            bgClass = "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/40 hover:bg-rose-100/80";
                          } else if (score >= 5) {
                            bgClass = "bg-amber-50 dark:bg-amber-950/25 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/40 hover:bg-amber-100/80";
                          }

                          const isSelected = selectedMatrixCell?.likelihood === likelihoodVal && selectedMatrixCell?.impact === impactVal;
                          const borderClass = isSelected ? 'border-2 border-slate-800 dark:border-white scale-105 z-10' : 'border border-transparent';

                          return (
                            <button
                              key={lIdx}
                              onClick={() => {
                                if (isSelected) setSelectedMatrixCell(null);
                                else setSelectedMatrixCell({ likelihood: likelihoodVal, impact: impactVal });
                              }}
                              className={`aspect-square rounded-md p-0 flex flex-col items-center justify-center relative transition-all duration-150 ${bgClass} ${borderClass}`}
                              title={`Sannolikhet: ${likelihoodVal}, Konsekvens: ${impactVal} (Riskpoäng: ${score}) - ${count} risk(er)`}
                            >
                              <span className="text-[10px] opacity-25 font-bold">{score}</span>
                              {count > 0 && (
                                <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold flex items-center justify-center shadow-sm">
                                  {count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                  
                  {/* Bottom Column Labels */}
                  <div className="grid grid-cols-5 gap-1 pt-1.5 text-center text-[10px] font-bold text-slate-500">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Drilldown List for Risks in Selected Matrix Cell */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/80">
            {selectedMatrixCell ? (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 m-0">
                  Risker med Sannolikhet {selectedMatrixCell.likelihood} &amp; Konsekvens {selectedMatrixCell.impact} ({filteredCellRisks.length} st)
                </h3>
                {filteredCellRisks.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic m-0">Inga aktiva risker i denna rörliga cell.</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {filteredCellRisks.map(r => (
                      <div key={r.id} className="p-2 border border-slate-100 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900/40 flex justify-between items-center text-xs">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate m-0">{r.title}</p>
                          <p className="text-[10px] text-slate-400 m-0">Kategori: {r.category} | Ansvarig: {r.responsible_name || 'Ej tillsatt'}</p>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded-[0.625rem] text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                          r.status === 'open' ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-950/20'
                        }`}>
                          {r.status === 'open' ? 'Aktiv' : 'Hanterad'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic m-0 text-center">Klicka på en ruta i riskmatrisen ovan för att se de specifika riskerna i den nivån.</p>
            )}
          </div>
        </div>

        {/* Documents ISO Review Health Dashboard */}
        <div className="lg:col-span-12 xl:col-span-5 bg-white dark:bg-slate-800 p-6 rounded-[0.625rem] border border-slate-200 dark:border-slate-700/85 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-1 m-0">
              <FileText size={18} className="text-blue-500" />
              Ledningssystemets Revisionshälsa
            </h2>
            <p className="text-xs text-slate-400 mb-4 m-0">ISO-revisionsefterlevnad för publicerade dokument</p>

            {/* Document Health Indicators */}
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-3 rounded-[0.625rem] border border-emerald-100 dark:border-emerald-900/30 text-center">
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide block">Giltiga utgåvor</span>
                <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 block mt-1">{normalReviewCount}</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block">Utan anmärkning</span>
              </div>
              
              <div className="bg-rose-50/50 dark:bg-rose-950/10 p-3 rounded-[0.625rem] border border-rose-100 dark:border-rose-900/30 text-center">
                <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wide block">Förfallen översyn</span>
                <span className="text-2xl font-extrabold text-rose-700 dark:text-rose-400 block mt-1">{overdueCount}</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block">Kräver omedelbar åtgärd</span>
              </div>

              <div className="bg-amber-50/50 dark:bg-amber-950/10 p-3 rounded-[0.625rem] border border-amber-100 dark:border-amber-900/30 text-center col-span-2">
                <div className="flex justify-between items-center">
                  <div className="text-left">
                    <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wide block">Kommande granskning (inom 30 d)</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block">Ledningsfiler som förfaller inom kort</span>
                  </div>
                  <span className="text-lg font-extrabold text-amber-700 dark:text-amber-400">{soonReviewCount} st</span>
                </div>
              </div>
            </div>

            {/* State indicators breakdown progress bars */}
            <div className="mt-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-350 m-0 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                Dokumentbibliotekets Fördelning ({totalDocs} st)
              </h3>
              
              <div className="space-y-1.5">
                <div>
                   <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <span>Aktivt Godkända</span>
                    <span>{activeDocsCount} st ({totalDocs ? Math.round((activeDocsCount / totalDocs) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${totalDocs ? (activeDocsCount / totalDocs) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <span>Under Aktiv Granskning</span>
                    <span>{reviewDocsCount} st ({totalDocs ? Math.round((reviewDocsCount / totalDocs) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${totalDocs ? (reviewDocsCount / totalDocs) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <span>Under Konstruktion (Utkast)</span>
                    <span>{draftDocsCount} st ({totalDocs ? Math.round((draftDocsCount / totalDocs) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-slate-400 h-full transition-all duration-300" style={{ width: `${totalDocs ? (draftDocsCount / totalDocs) * 100 : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 dark:text-slate-500 italic text-center">
            ISO-standarder (§7.5.3) kräver styrning och signering av utgåvor.
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container full-width">
          <h2>Registrerade ärenden (Senaste 6 månaderna)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Legend />
              <Bar dataKey="avvikelser" name="Avvikelser" fill="var(--warning-color)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="risker" name="Risker" fill="var(--danger-color)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h2>Avvikelser per status</h2>
          {avvikelsePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={avvikelsePieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {avvikelsePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data-text">Ingen data tillgänglig</p>
          )}
        </div>

        <div className="chart-container">
          <h2>Uppgifter per status</h2>
          {taskPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taskPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taskPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data-text">Ingen data tillgänglig</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
