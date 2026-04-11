import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../api/auditLog';
import { Clock, User, Tag, Info, ChevronLeft, ChevronRight, Search, Filter, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const AuditTrailPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({ entity_type: '', user_id: '' });
  const [selectedLog, setSelectedLog] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-logs', page, pageSize, filters],
    queryFn: () => getAuditLogs(page, pageSize, filters),
  });

  const logs = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-700 border-green-200';
      case 'UPDATE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Händelselogg</h1>
          <p className="text-gray-500 dark:text-gray-400">Spårbarhet för alla ändringar i systemet</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select 
            className="bg-transparent border-none text-sm focus:ring-0 text-gray-700 dark:text-gray-200"
            value={filters.entity_type}
            onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
          >
            <option value="">Alla typer</option>
            <option value="PROCESS">Processer</option>
            <option value="DOCUMENT">Dokument</option>
            <option value="RISK">Risker</option>
            <option value="ISSUE">Avvikelser</option>
            <option value="TASK">Uppgifter</option>
          </select>
        </div>
        
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
          <span>Totalt: {totalCount} händelser</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-900/50 border-bottom border-gray-200 dark:border-slate-700">
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tidpunkt</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Användare</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Händelse</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Objekt</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Detaljer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {isLoading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">Laddar loggar...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">Inga händelser hittades</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Clock size={14} className="text-gray-400" />
                      {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss', { locale: sv })}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{log.user_email}</span>
                      <span className="text-xs text-gray-500">ID: {log.user_id?.substring(0, 8)}...</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900 dark:text-white font-medium">{log.entity_name}</span>
                      <span className="text-xs text-gray-500">{log.entity_type}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="p-2 text-gray-400 hover:text-primary-color transition-colors"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30"
          >
            <ChevronLeft size={16} /> Föregående
          </button>
          <span className="text-sm text-gray-500">Sida {page} av {totalPages || 1}</span>
          <button 
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30"
          >
            Nästa <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Händelsedetaljer</h3>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tidpunkt</label>
                  <p className="text-gray-900 dark:text-white">{format(new Date(selectedLog.created_at), 'PPPP p', { locale: sv })}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Användare</label>
                  <p className="text-gray-900 dark:text-white">{selectedLog.user_email}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {selectedLog.user_id}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Handling</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getActionColor(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Objekt-ID</label>
                  <p className="text-gray-900 dark:text-white font-mono text-xs">{selectedLog.entity_id}</p>
                </div>
              </div>

              {selectedLog.changes && selectedLog.changes.old && selectedLog.changes.new && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Ändringar</label>
                  <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 overflow-x-auto">
                    <div className="space-y-2">
                      {Object.keys(selectedLog.changes.new).map(key => {
                        const oldVal = selectedLog.changes.old[key];
                        const newVal = selectedLog.changes.new[key];
                        if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return null;
                        if (['updated_at', 'attachments', 'problemdefinition'].includes(key)) return null;

                        if (key === 'uppfoljning') {
                          const oldU = oldVal || {};
                          const newU = newVal || {};
                          return Object.keys(newU).map(uKey => {
                            if (JSON.stringify(oldU[uKey]) !== JSON.stringify(newU[uKey])) {
                              return (
                                <div key={`${key}-${uKey}`} className="flex flex-col text-xs border-b border-gray-100 dark:border-slate-800 pb-2 last:border-0">
                                  <span className="font-semibold text-gray-500 mb-1">{uKey}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-red-500 line-through opacity-70">{String(oldU[uKey] || 'n/a')}</span>
                                    <ChevronRight size={12} className="text-gray-400" />
                                    <span className="text-green-600 font-medium">{String(newU[uKey] || 'n/a')}</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          });
                        }

                        if (key === 'steps') {
                          return (
                            <div key={key} className="flex flex-col text-xs border-b border-gray-100 dark:border-slate-800 pb-2 last:border-0">
                              <span className="font-semibold text-gray-500 mb-1">Processkarta</span>
                              <div className="flex items-center gap-2">
                                <span className="text-blue-600 font-medium">Kartan har uppdaterats</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={key} className="flex flex-col text-xs border-b border-gray-100 dark:border-slate-800 pb-2 last:border-0">
                            <span className="font-semibold text-gray-500 mb-1">{key}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-red-500 line-through opacity-70">{String(oldVal || 'n/a')}</span>
                              <ChevronRight size={12} className="text-gray-400" />
                              <span className="text-green-600 font-medium">{String(newVal || 'n/a')}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {selectedLog.changes && (!selectedLog.changes.old || !selectedLog.changes.new) && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Data</label>
                  <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 overflow-x-auto">
                    <pre className="text-xs text-gray-700 dark:text-gray-300 font-mono">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 bg-gray-50 dark:bg-slate-900/50 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-6 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-colors"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrailPage;
