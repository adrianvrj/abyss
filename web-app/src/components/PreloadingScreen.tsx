import React from 'react';

interface PreloadingScreenProps {
    progress: number;
    statusText?: string;
}

export default function PreloadingScreen({ progress, statusText = "Entering the Abyss..." }: PreloadingScreenProps) {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <h1 style={{
                fontFamily: 'var(--font-title)',
                fontSize: '48px',
                color: '#fff',
                marginBottom: '20px',
                letterSpacing: '2px',
                textTransform: 'uppercase'
            }}>
                {statusText}
            </h1>

            <div style={{
                width: '300px',
                height: '4px',
                background: '#333',
                borderRadius: '2px',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${progress}%`,
                    background: '#FF841C', // Abyss Orange
                    transition: 'width 0.2s ease-out'
                }} />
            </div>

            <p style={{
                fontFamily: "'PressStart2P', monospace",
                fontSize: '12px',
                color: '#666',
                marginTop: '16px'
            }}>
                {progress}%
            </p>
        </div>
    );
}
