import React, { useEffect, useState } from 'react';
import { getUsers } from '../api/users';
import '../styles/AdminPanel.css';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getUsers();
        setUsers(data);
      } catch (error) {
        console.error('Failed to fetch users', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) return <div>Laddar användare...</div>;

  return (
    <div className="admin-panel-container">
      <h1>Adminpanel</h1>
      <div className="user-list">
        {users.map((u) => (
          <div key={u.id} className="user-item">
            <div className="user-info">
              <span className="user-email">{u.email}</span>
              <span className="user-role">{u.role} - {u.username}</span>
            </div>
            <div className="user-actions">
              <button className="btn-secondary btn-sm">Redigera</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPanel;
