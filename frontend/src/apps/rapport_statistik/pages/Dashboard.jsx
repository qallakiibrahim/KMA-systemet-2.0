import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/Dashboard.css';

const data = [
  { name: 'Jan', avvikelser: 4, risker: 2 },
  { name: 'Feb', avvikelser: 3, risker: 5 },
  { name: 'Mar', avvikelser: 2, risker: 3 },
  { name: 'Apr', avvikelser: 6, risker: 4 },
];

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Statistik & Rapporter</h1>
        <p>Översikt över avvikelser och risker</p>
      </div>
      <div className="chart-container">
        <h2>Utveckling över tid</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avvikelser" fill="var(--primary-color)" />
            <Bar dataKey="risker" fill="var(--danger-color)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;
