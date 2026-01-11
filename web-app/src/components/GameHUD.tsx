'use client';

interface GameHUDProps {
    level: number;
    threshold: number;
    spinsRemaining: number;
    risk: number;
}

export default function GameHUD({
    level,
    threshold,
    spinsRemaining,
    risk,
    onExit
}: GameHUDProps & { onExit?: () => void }) {
    const isDanger = risk > 50;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: '2vw',
            padding: '12px 24px 12px 70px',
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 1000,
        }}>
            {onExit && (
                <button
                    onClick={onExit}
                    style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: '1px solid #FF841C',
                        borderRadius: '4px',
                        color: '#FF841C',
                        fontFamily: "'PressStart2P', monospace",
                        fontSize: '10px',
                        padding: '6px 8px',
                        cursor: 'pointer',
                        zIndex: 1001,
                    }}
                >
                    EXIT
                </button>
            )}
            <StatItem label="LVL" value={level} />
            <StatItem label="GOAL" value={threshold} />
            <StatItem label="SPINS" value={spinsRemaining} valueColor="#FFEA00" />
            <StatItem
                label="666 RISK"
                value={`${risk.toFixed(1)}%`}
                valueColor="#ff4444"
                pulse={isDanger}
            />
        </div>
    );
}

interface StatItemProps {
    label: string;
    value: number | string;
    valueColor?: string;
    pulse?: boolean;
}

function StatItem({ label, value, valueColor = '#fff', pulse = false }: StatItemProps) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '6px 16px',
            minWidth: '80px',
            animation: pulse ? 'danger-pulse 1s ease-in-out infinite' : 'none',
        }}>
            <span style={{
                fontFamily: "'PressStart2P', monospace",
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '4px',
                letterSpacing: '1px',
            }}>
                {label}
            </span>
            <span style={{
                fontFamily: "'PressStart2P', monospace",
                fontSize: '14px',
                color: valueColor,
            }}>
                {value}
            </span>

            {pulse && (
                <style>{`
                    @keyframes danger-pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                `}</style>
            )}
        </div>
    );
}
