"use client";

import Image from "next/image";

interface HeaderProps {
    username: string | null;
    score: number;
    level: number;
    isConnected: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
}

export function Header({
    username,
    score,
    level,
    isConnected,
    onConnect,
    onDisconnect
}: HeaderProps) {
    return (
        <>
            <header className="header">
                <div className="header-content">
                    {/* Logo */}
                    <div className="logo-container">
                        <Image
                            src="/images/abyss-logo.png"
                            alt="ABYSS"
                            width={120}
                            height={40}
                            className="logo"
                        />
                    </div>

                    {/* Stats */}
                    {isConnected && (
                        <div className="stats">
                            <div className="stat">
                                <span className="stat-label">LVL</span>
                                <span className="stat-value">{level}</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">SCORE</span>
                                <span className="stat-value">{score}</span>
                            </div>
                        </div>
                    )}

                    {/* Wallet */}
                    <div className="wallet-section">
                        {isConnected ? (
                            <div className="wallet-connected">
                                <div className="wallet-indicator" />
                                <span className="wallet-name">{username || "CONNECTED"}</span>
                                <button onClick={onDisconnect} className="wallet-disconnect">
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <button onClick={onConnect} className="connect-button">
                                CONNECT
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <style jsx>{`
        .header {
          width: 100%;
          padding: var(--spacing-md);
          background: rgba(0, 0, 0, 0.9);
          border-bottom: 2px solid var(--color-primary);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo-container {
          flex-shrink: 0;
        }

        .stats {
          display: flex;
          gap: var(--spacing-xl);
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .stat-label {
          font-family: var(--font-body);
          font-size: 8px;
          color: var(--color-primary);
          letter-spacing: 2px;
        }

        .stat-value {
          font-family: var(--font-body);
          font-size: 16px;
          color: var(--color-white);
        }

        .wallet-section {
          display: flex;
          align-items: center;
        }

        .wallet-connected {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          background: rgba(255, 132, 28, 0.1);
          border: 1px solid var(--color-primary);
          border-radius: 4px;
        }

        .wallet-indicator {
          width: 8px;
          height: 8px;
          background: var(--color-primary);
          border-radius: 50%;
          animation: orange-pulse 2s ease-in-out infinite;
        }

        .wallet-name {
          font-family: var(--font-body);
          font-size: 8px;
          color: var(--color-primary);
          text-transform: uppercase;
        }

        .wallet-disconnect {
          color: var(--color-primary);
          font-size: 14px;
          padding: var(--spacing-xs);
          transition: opacity 0.2s;
        }

        .wallet-disconnect:hover {
          opacity: 0.7;
        }

        .connect-button {
          padding: var(--spacing-sm) var(--spacing-lg);
          font-family: var(--font-body);
          font-size: 10px;
          color: var(--color-background);
          background: var(--color-primary);
          border-radius: 4px;
          transition: all 0.2s;
        }

        .connect-button:hover {
          box-shadow: 0 0 15px var(--color-primary-glow);
        }

        @media (max-width: 640px) {
          .stats {
            gap: var(--spacing-md);
          }
          
          .stat-value {
            font-size: 12px;
          }
        }
      `}</style>
        </>
    );
}
