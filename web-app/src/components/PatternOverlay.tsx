import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pattern } from '@/utils/patternDetector';

interface PatternOverlayProps {
    patterns: Pattern[];
    onPatternShow?: () => void; // Callback to play sound per pattern
    onComplete?: () => void;
}

export default function PatternOverlay({ patterns, onPatternShow, onComplete }: PatternOverlayProps) {
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [phase, setPhase] = useState<'highlight' | 'score' | 'alert'>('highlight');
    const [subCycle, setSubCycle] = useState(0); // Tracks repetitions (0 to retriggerMultiplier-1)
    const [flash, setFlash] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset when patterns input changes (new spin)
    useEffect(() => {
        if (patterns && patterns.length > 0) {
            setCurrentIndex(0);
            setSubCycle(0);
            setPhase('highlight');
        } else {
            setCurrentIndex(-1);
        }
    }, [patterns]);

    // Manage Sequence
    useEffect(() => {
        if (currentIndex === -1 || !patterns || currentIndex >= patterns.length) return;

        const pattern = patterns[currentIndex];
        const retriggerCount = pattern.retriggerMultiplier || 1;

        // 1. Play sound at start of highlight phase (only if beginning of a cycle)
        if (phase === 'highlight') {
            if (onPatternShow) onPatternShow();

            // Trigger Flash
            setFlash(true);
            const flashTimer = setTimeout(() => setFlash(false), 50);

            // Move to Score
            const timerScore = setTimeout(() => {
                setPhase('score');
            }, 100); // 0.1s highlight duration

            return () => {
                clearTimeout(flashTimer);
                clearTimeout(timerScore);
            };
        }

        // 2. Score Phase
        if (phase === 'score') {
            const timerNext = setTimeout(() => {
                // Check if we need to retrigger
                if (subCycle < retriggerCount - 1) {
                    setPhase('alert');
                } else {
                    // Move to next pattern
                    if (currentIndex < patterns.length - 1) {
                        setCurrentIndex(prev => prev + 1);
                        setSubCycle(0);
                        setPhase('highlight');
                    } else {
                        if (onComplete) onComplete();
                        setCurrentIndex(-1); // Finished
                    }
                }
            }, 300); // 0.5s score duration

            return () => clearTimeout(timerNext);
        }

        // 3. Alert Phase (AGAIN!)
        if (phase === 'alert') {
            const timerRestart = setTimeout(() => {
                setSubCycle(prev => prev + 1);
                setPhase('highlight');
            }, 300); // 0.3s alert duration

            return () => clearTimeout(timerRestart);
        }

    }, [currentIndex, phase, patterns, subCycle, onPatternShow]);

    const renderFlash = () => {
        if (!mounted || !flash) return null;
        return createPortal(
            <div style={{
                position: 'fixed', /* Fixed relative to viewport */
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: '#fff',
                opacity: 0.15,
                zIndex: 99999, /* Top of the world */
                pointerEvents: 'none',
                animation: 'flashFade 0.1s ease-out forwards'
            }}>
                <style jsx>{`
                    @keyframes flashFade {
                        from { opacity: 0.3; }
                        to { opacity: 0; }
                    }
                `}</style>
            </div>,
            document.body
        );
    };

    if (currentIndex === -1 || !patterns || !patterns[currentIndex]) return null;

    const pattern = patterns[currentIndex];
    const animKey = `${currentIndex}`;

    return (
        <>
            {renderFlash()}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 50
            }}>
                <div key={animKey} style={{ position: 'absolute', width: '100%', height: '100%' }}>
                    {/* Highlight Boxes - Visible in 'highlight' and 'score' phases */}
                    {pattern.positions.map(([row, col]) => (
                        <div
                            key={`box-${row}-${col}`}
                            className="anim-box"
                            style={{
                                position: 'absolute',
                                top: `${(row / 3) * 100}%`,
                                left: `${(col / 5) * 100}%`,
                                width: '20%',
                                height: '33.33%',
                                padding: '4px',
                                boxSizing: 'border-box',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                animation: `fadeInPulse 0.2s ease-out forwards`
                            }}
                        >
                            <div style={{
                                width: '100%',
                                height: '100%',
                                border: '3px solid #FF841C',
                                borderRadius: '8px',
                                /* Solid Style */
                                background: 'rgba(255, 132, 28, 0.1)',
                            }} />
                        </div>
                    ))}

                    {/* Score Popup - Visible only in 'score' phase */}
                    {phase === 'score' && (
                        <div
                            className="anim-popup"
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: '#000',
                                border: '3px solid #FF841C',
                                borderRadius: '12px',
                                padding: '12px 24px',
                                zIndex: 100,
                                boxShadow: '0 8px 20px rgba(0,0,0,0.8)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                minWidth: '80px',
                                animation: `popInCenter 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`
                            }}
                        >
                            <span style={{
                                fontFamily: "'PressStart2P', monospace",
                                color: '#FFEA00',
                                fontSize: '3vmin',
                                textShadow: '2px 2px 0px #000'
                            }}>
                                +{(pattern.score / (pattern.retriggerMultiplier || 1)).toFixed(0)}
                            </span>
                        </div>
                    )}

                    {/* Alert Popup - Visible in 'alert' phase */}
                    {phase === 'alert' && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 101,
                                animation: `popInCenter 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`
                            }}
                        >
                            <span style={{
                                fontFamily: "'PressStart2P', monospace",
                                color: '#fff',
                                fontSize: '4vmin',
                                whiteSpace: 'nowrap'
                            }}>
                                AGAIN!
                            </span>
                        </div>
                    )}
                </div>

                <style jsx>{`
                    @keyframes fadeInPulse {
                        0% { opacity: 0; transform: scale(0.9); }
                        100% { opacity: 1; transform: scale(1); }
                    }

                    @keyframes popInCenter {
                        0% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
                        60% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                        100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    }
                `}</style>
            </div>
        </>
    );
}
