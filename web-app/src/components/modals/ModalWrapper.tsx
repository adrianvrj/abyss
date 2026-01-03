import React, { ReactNode } from 'react';
import { FaArrowLeft } from 'react-icons/fa6';

interface ModalWrapperProps {
    children: ReactNode;
    onClose: () => void;
    title?: string;
}

export default function ModalWrapper({ children, onClose, title }: ModalWrapperProps) {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0, 0, 0, 0.75)', // Semi-transparent to see game behind
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(3px)',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '90%',
                    maxWidth: 400,
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 20,
                    background: 'rgba(20, 20, 20, 0.95)', // Slightly transparent dark
                    borderRadius: 12,
                    border: '2px solid #FF841C',
                    overflow: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 15,
                    paddingBottom: 10,
                    borderBottom: '1px solid rgba(255, 132, 28, 0.3)',
                }}>
                    <button
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 8,
                        }}
                        onClick={onClose}
                    >
                        <FaArrowLeft size={24} color="#FF841C" />
                    </button>
                    {title && (
                        <h2 style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: 14,
                            color: '#FF841C',
                            margin: 0,
                        }}>{title}</h2>
                    )}
                    <div style={{ width: 24 }}></div>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
