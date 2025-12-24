import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button className="theme-toggle" onClick={toggleTheme} aria-label="切换主题">
      {isDarkMode ? '☀️' : '🌙'}
    </button>
  );
};

export default ThemeToggle;

