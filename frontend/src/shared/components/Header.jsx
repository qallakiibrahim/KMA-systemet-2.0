import React, { useState, useEffect } from 'react';
import { useAuth } from '../api/AuthContext';
import { useTasks } from '../api/useTasks';
import { getNotifications, updateNotification } from '../../apps/notification/api/notification';
import { Bell, User, Search, Menu, X } from 'lucide-react';
import '../styles/Header.css';

const Header = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await getNotifications();
        // Filter notifications for the current user
        const userNotifications = data.filter(n => n.user_id === user?.id);
        setNotifications(userNotifications);
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      }
    };
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const overdueTasksCount = tasks.filter(
    task => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
  ).length;

  const unreadCount = notifications.filter(n => !n.is_read).length + overdueTasksCount;

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  const markAsRead = async (id) => {
    try {
      await updateNotification(id, { is_read: true });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-btn" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Sök..." />
        </div>
      </div>
      <div className="header-right">
        <div className="notification-wrapper">
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
                  <div className="notification-item unread">
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
                    <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`} onClick={() => !n.is_read && markAsRead(n.id)}>
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
        <div className="user-profile">
          <span className="user-name">{user?.displayName || 'Användare'}</span>
          <User size={24} />
        </div>
      </div>
    </header>
  );
};

export default Header;
