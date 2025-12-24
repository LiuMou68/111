import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { authService } from '../../services/authService';
import './MainLayout.css';

const MainLayout = () => {
  const isAuthenticated = authService.isLoggedIn();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="layout-container">
      <Navbar />
      <main className="content-container">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;

