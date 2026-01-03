import React from 'react';

interface LoadingOverlayProps {
    message: string;
}

export default function LoadingOverlay({ message }: LoadingOverlayProps) {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            backdropFilter: 'blur(4px)',
        }}>
            <div className="spinner" style={{
                width: '40px',
                height: '40px',
                border: '4px solid rgba(255, 132, 28, 0.3)',
                borderTop: '4px solid #FF841C',
                borderRadius: '50%',
                marginBottom: '16px',
                animation: 'spin 1s linear infinite',
            }} />
            <div style={{
                fontFamily: "'PressStart2P', monospace",
                color: '#FF841C',
                fontSize: '14px', // Pixel font tends to be large
                textTransform: 'uppercase',
                letterSpacing: '1px',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}>
                {message}
            </div>

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
