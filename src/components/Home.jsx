import React from 'react';
import { useNavigate } from 'react-router-dom';
import ParticleBackground from './ParticleBackground';

const Home = () => {
  const navigate = useNavigate();

  const handleArrowClick = () => {
    navigate('/auth');
  };

  return (
    <div className="home-container">
      <ParticleBackground />
      <div className="brand-logo">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M30 12C30 8 26 8 20 8C14 8 10 10 10 14C10 18 14 20 20 20C26 20 30 22 30 26C30 30 26 32 20 32C14 32 10 32 10 28" stroke="url(#logoGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <defs>
            <linearGradient id="logoGradient" x1="0" y1="0" x2="40" y2="40">
              <stop stopColor="#1976d2"/>
              <stop offset="1" stopColor="#0288d1"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <button className="menu-button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="#1976d2" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <div className="content">
        <h1>社团证书管理系统</h1>
        <p>基于区块链技术的透明、安全、不可篡改的证书管理平台</p>
        <div className="home-actions">
          <button 
            className="action-button login-btn"
            onClick={() => navigate('/auth')}
            style={{ 
              background: 'linear-gradient(45deg, #0066ff, #00ffff)',
              color: 'white',
              border: 'none',
              padding: '15px 40px',
              fontSize: '1.2rem',
              boxShadow: '0 6px 20px rgba(0, 102, 255, 0.4)'
            }}
          >
            登录系统
          </button>
        </div>
      </div>
      <div 
        className="scroll-arrow" 
        onClick={handleArrowClick}
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          cursor: 'pointer',
          animation: 'bounce 2s infinite',
          zIndex: 2
        }}
      >
        <svg 
          width="40" 
          height="40" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#1976d2"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
      <div className="sphere-effect"></div>
      <style>{`
        .home-container {
          height: 100vh;
          width: 100vw;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 30%, #90caf9 60%, #64b5f6 100%);
          position: relative;
          overflow: hidden;
        }

        .content {
          text-align: center;
          color: #1565c0;
          z-index: 2;
        }

        .content h1 {
          font-size: 4rem;
          margin-bottom: 1rem;
          background: linear-gradient(45deg, #0066ff, #0288d1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .content p {
          font-size: 1.2rem;
          color: #0277bd;
          opacity: 0.9;
          max-width: 600px;
          margin: 20px auto;
          font-weight: 500;
        }

        .home-actions {
          display: flex;
          gap: 20px;
          justify-content: center;
          margin-top: 30px;
          flex-wrap: wrap;
        }

        .action-button {
          padding: 15px 30px;
          border: 2px solid #1976d2;
          border-radius: 10px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .verify-btn {
          background: linear-gradient(45deg, #0066ff, #00ffff);
          color: white;
          border: none;
        }

        .verify-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0, 102, 255, 0.4);
        }

        .login-btn {
          background: white;
          color: #1976d2;
        }

        .login-btn:hover {
          background: #1976d2;
          color: white;
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(25, 118, 210, 0.3);
        }

        .brand-logo {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 3;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .brand-logo:hover {
          transform: scale(1.1);
        }

        .menu-button {
          position: absolute;
          top: 20px;
          right: 20px;
          background: none;
          border: none;
          cursor: pointer;
          z-index: 3;
          padding: 8px;
          border-radius: 50%;
          transition: background-color 0.3s ease;
        }

        .menu-button:hover {
          background-color: rgba(0, 102, 255, 0.15);
        }

        .sphere-effect {
          position: absolute;
          top: 50%;
          right: -15vw;
          transform: translateY(-50%);
          width: min(90vh, 90vw);
          height: min(90vh, 90vw);
          background: linear-gradient(45deg, #42a5f5, #1e88e5);
          border-radius: 50%;
          opacity: 0.3;
          animation: rotate 20s linear infinite, pulse 4s ease-in-out infinite;
          filter: blur(80px);
          transform-style: preserve-3d;
          perspective: 1000px;
          box-shadow: inset 0 0 80px rgba(33, 150, 243, 0.4),
                    0 0 120px rgba(33, 150, 243, 0.2);
        }

        @keyframes rotate {
          from { transform: translateY(-50%) rotate(0deg); }
          to { transform: translateY(-50%) rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: translateY(-50%) scale(1); opacity: 0.2; }
          50% { transform: translateY(-50%) scale(1.1); opacity: 0.35; }
        }

        @media (max-width: 768px) {
          .content h1 {
            font-size: 3rem;
          }
          .content p {
            font-size: 1rem;
            padding: 0 20px;
          }
          .sphere-effect {
            right: -30vw;
          }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateX(-50%) translateY(0);
          }
          40% {
            transform: translateX(-50%) translateY(-20px);
          }
          60% {
            transform: translateX(-50%) translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
};

export default Home;

