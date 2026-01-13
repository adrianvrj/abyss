'use client';
import { FaArrowLeft } from 'react-icons/fa6';
import Image from 'next/image';

interface GameHUDProps {
    level: number;
    threshold: number;
    spinsRemaining: number;
    score: number;
    tickets: number;
}

export default function GameHUD({
    level,
    threshold,
    spinsRemaining,
    score,
    tickets,
    onExit
}: GameHUDProps & { onExit?: () => void }) {
    return (
        <>
            <style>{`
                .game-hud {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 4px;
                    padding: 8px 8px 8px 50px;
                    background: rgba(0, 0, 0, 0.9);
                    z-index: 1000;
                }
                .game-hud .stat-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 2px 6px;
                    min-width: auto;
                }
                .game-hud .stat-label {
                    font-family: 'PressStart2P', monospace;
                    font-size: 6px;
                    color: rgba(255, 255, 255, 0.5);
                    margin-bottom: 2px;
                }
                .game-hud .stat-value {
                    font-family: 'PressStart2P', monospace;
                    font-size: 10px;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    gap: 3px;
                }
                @media (min-width: 1280px) {
                    .game-hud {
                        display: none;
                    }
                }
            `}</style>
            <div className="game-hud">
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
                            padding: '8px',
                            cursor: 'pointer',
                            zIndex: 1001,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <FaArrowLeft size={14} />
                    </button>
                )}
                <StatItem label="LVL" value={level} />
                <StatItem label="GOAL" value={threshold} />
                <StatItem label="SPINS" value={spinsRemaining} valueColor="#FFEA00" />
                <StatItem label="SCORE" value={score} valueColor="#FF841C" />
                <StatItem
                    label="TICKETS"
                    value={tickets}
                    valueColor="#FFD700"
                    icon="/images/ticket.png"
                />
            </div>
        </>
    );
}

interface StatItemProps {
    label: string;
    value: number | string;
    valueColor?: string;
    pulse?: boolean;
    icon?: string;
}

function StatItem({ label, value, valueColor = '#fff', pulse = false, icon }: StatItemProps) {
    return (
        <div className="stat-item" style={{
            animation: pulse ? 'danger-pulse 1s ease-in-out infinite' : 'none',
        }}>
            <span className="stat-label">{label}</span>
            <span className="stat-value" style={{ color: valueColor }}>
                {value}
                {icon && <Image src={icon} alt="" width={14} height={7} />}
            </span>
        </div>
    );
}
