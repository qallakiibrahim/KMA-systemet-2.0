import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Shield, CheckSquare, FileText, Bot, RefreshCw, Sparkles } from 'lucide-react';
import { getAvvikelser } from '../../avvikelse/api/avvikelse';
import { getRisker } from '../../risk/api/risk';
import { getTasks } from '../../task/api/tasksApi';
import { getDokuments } from '../../dokument/api/dokument';
import { getAiInstance, ensureApiKey, hasApiKey } from '../../../shared/utils/aiUtils';
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

  const generateAiInsight = async (currentStats) => {
    setIsAiLoading(true);
    setAiError('');
    try {
      // Check if we have a key without triggering the dialog
      const keyAvailable = await hasApiKey();
      if (!keyAvailable) {
        setAiError('AI-nyckel saknas. Klicka nedan för att välja en nyckel.');
        return;
      }

      const ai = await getAiInstance();
      if (!ai) {
        setAiError('Kunde inte initiera AI. Försök igen.');
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

  const handleConnectAi = async () => {
    try {
      const key = await ensureApiKey();
      if (key) {
        generateAiInsight(stats);
      }
    } catch (error) {
      console.error('Error connecting AI:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [avvikelserData, riskerData, tasksData, dokumentData] = await Promise.all([
          getAvvikelser(),
          getRisker(),
          getTasks(),
          getDokuments()
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
            <div className="ai-insight-error-container">
              <p className="ai-insight-error">{aiError}</p>
              <button className="ai-refresh-btn" onClick={handleConnectAi}>
                <Bot size={14} /> Anslut AI
              </button>
            </div>
          ) : (
            <>
              <p className="ai-insight-text">{aiInsight || 'Välj en API-nyckel i Admin-panelen för att få proaktiva insikter.'}</p>
              <button className="ai-refresh-btn" onClick={() => generateAiInsight(stats)}>
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
