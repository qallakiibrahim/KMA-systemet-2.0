import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../api/AuthContext';
import { getTasks } from '../../apps/task/api/tasksApi';
import { getNotifications, updateNotification } from '../../apps/notification/api/notification';
import { Bell, User, Search, Menu, X } from 'lucide-react';
import { useSearch } from '../context/SearchContext';
import { useHeaderActions } from '../context/HeaderActionsContext';
import '../styles/Header.css';

const Header = ({ onMenuClick }) => {
  const queryClient = useQueryClient();
  const { user, userProfile } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const { actions } = useHeaderActions();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Determine current app for search placeholder
  const getSearchPlaceholder = () => {
    const path = location.pathname;
    if (path.startsWith('/process')) return 'Sök i processer...';
    if (path.startsWith('/avvikelse')) return 'Sök i avvikelser...';
    if (path.startsWith('/risk')) return 'Sök i risker...';
    if (path.startsWith('/dokument')) return 'Sök i dokument...';
    if (path.startsWith('/tasks')) return 'Sök i uppgifter...';
    return 'Sök...';
  };

  // TanStack Query for tasks
  const { data: tasksData } = useQuery({
    queryKey: ['tasks', 1, -1],
    queryFn: () => getTasks(1, -1),
    enabled: !!user,
  });

  const tasks = tasksData?.data || (Array.isArray(tasksData) ? tasksData : []);

  // TanStack Query for notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const data = await getNotifications();
      return data.filter(n => n.user_id === user?.id);
    },
    enabled: !!user,
  });

  const notifications = notificationsData || [];

  const markAsReadMutation = useMutation({
    mutationFn: ({ id, data }) => updateNotification(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const overdueTasksCount = tasks.filter(
    task => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
  ).length;

  const unreadCount = notifications.filter(n => !n.is_read).length + overdueTasksCount;

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const markAsRead = async (id, link) => {
    try {
      markAsReadMutation.mutate({ id, data: { is_read: true } });
      
      if (link) {
        navigate(link);
      }
      setShowNotifications(false);
    } catch (error) {
      console.error('Failed to mark notification as read', error);
      if (link) {
        navigate(link);
      }
      setShowNotifications(false);
    }
  };

  const handleOverdueClick = () => {
    navigate('/process'); // Assuming tasks are related to processes or there's a task view
    setShowNotifications(false);
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-btn" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <div className="search-bar">
          <Search size={18} />
          <input 
            type="text" 
            placeholder={getSearchPlaceholder()} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="header-right">
        {actions && <div className="header-app-actions">{actions}</div>}
        <div className="notification-wrapper" ref={notificationRef}>
          <button className="icon-btn notification-btn" onClick={handleNotificationClick}>
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>
          
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h3>Notiser</h3>
                <button onClick={() => setShowNotifications(false)}><X size={16} /></button>
              </div>
              <div className="notification-list">
                {overdueTasksCount > 0 && (
                  <div className="notification-item unread" onClick={handleOverdueClick}>
                    <div className="notification-content">
                      <strong>Försenade uppgifter</strong>
                      <p>Du har {overdueTasksCount} försenade uppgifter.</p>
                    </div>
                  </div>
                )}
                {notifications.length === 0 && overdueTasksCount === 0 ? (
                  <div className="notification-empty">Inga nya notiser</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`} onClick={() => markAsRead(n.id, n.link)}>
                      <div className="notification-content">
                        <strong>{n.title}</strong>
                        <p>{n.message}</p>
                        <span className="notification-time">{new Date(n.created_at || new Date()).toLocaleDateString('sv-SE')}</span>
                      </div>
                      {!n.is_read && <div className="unread-dot"></div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="user-profile" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
          <div className="user-info-text">
            <span className="user-name">{userProfile?.display_name || userProfile?.username || user?.email?.split('@')[0] || 'Användare'}</span>
            <span className="user-role-badge">{userProfile?.role === 'superadmin' ? 'Superadmin' : userProfile?.role === 'admin' ? 'Admin' : ''}</span>
          </div>
          <User size={24} />
        </div>
      </div>
    </header>
  );
};

export default Header;
