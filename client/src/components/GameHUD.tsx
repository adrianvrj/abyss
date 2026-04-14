import { ArrowLeft } from 'lucide-react';

interface GameHUDProps {
    level: number;
    threshold: number;
    spinsRemaining: number;
    score: number;
    tickets: number;
    onExit?: () => void;
}

export default function GameHUD({
    level,
    threshold,
    spinsRemaining,
    score,
    tickets,
    onExit,
}: GameHUDProps) {
    const progress = threshold > 0 ? Math.min((score / threshold) * 100, 100) : 0;

    return (
        <>
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                        .game-hud {
                            position: fixed;
                            top: 0;
                            left: 0;
                            right: 0;
                            z-index: 1000;
                            display: flex;
                            align-items: stretch;
                            gap: 10px;
                            padding: calc(env(safe-area-inset-top, 0px) + 10px) 12px 12px;
                            background: rgba(0, 0, 0, 0.94);
                            border-bottom: 2px solid rgba(255, 132, 28, 0.26);
                            backdrop-filter: blur(6px);
                        }
                        .game-hud .hud-back {
                            width: 48px;
                            min-width: 48px;
                            height: 48px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border: 2px solid #FF841C;
                            border-radius: 12px;
                            background: #000;
                            color: #FF841C;
                            cursor: pointer;
                            flex-shrink: 0;
                            box-shadow: inset 0 0 0 1px rgba(255, 132, 28, 0.08);
                        }
                        .game-hud .hud-back:active {
                            transform: translateY(1px);
                        }
                        .game-hud .hud-main {
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            gap: 8px;
                            min-width: 0;
                        }
                        .game-hud .hud-stat-row {
                            display: grid;
                            grid-template-columns: repeat(3, minmax(0, 1fr));
                            gap: 8px;
                        }
                        .game-hud .hud-stat {
                            min-width: 0;
                            padding: 7px 8px 6px;
                            border: 1px solid rgba(255, 132, 28, 0.24);
                            border-radius: 10px;
                            background: #000;
                            display: flex;
                            flex-direction: column;
                            gap: 5px;
                            align-items: center;
                            justify-content: center;
                        }
                        .game-hud .hud-stat-label {
                            font-family: 'PressStart2P', monospace;
                            font-size: 7px;
                            color: rgba(255, 255, 255, 0.48);
                            letter-spacing: 1px;
                            text-transform: uppercase;
                            line-height: 1.1;
                        }
                        .game-hud .hud-stat-value {
                            font-family: 'PressStart2P', monospace;
                            font-size: 11px;
                            color: #FFFFFF;
                            line-height: 1.1;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 4px;
                            white-space: nowrap;
                        }
                        .game-hud .hud-stat-value.spins {
                            color: #FFEA00;
                        }
                        .game-hud .hud-stat-value.tickets {
                            color: #FFD700;
                        }
                        .game-hud .hud-progress-card {
                            border: 1px solid rgba(255, 132, 28, 0.24);
                            border-radius: 12px;
                            background: #000;
                            padding: 9px 10px 10px;
                            display: flex;
                            flex-direction: column;
                            gap: 8px;
                        }
                        .game-hud .hud-progress-header {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            gap: 10px;
                        }
                        .game-hud .hud-progress-kicker {
                            font-family: 'PressStart2P', monospace;
                            font-size: 7px;
                            color: rgba(255, 255, 255, 0.48);
                            letter-spacing: 1px;
                            text-transform: uppercase;
                        }
                        .game-hud .hud-progress-score {
                            font-family: 'PressStart2P', monospace;
                            font-size: 11px;
                            color: #FF841C;
                            white-space: nowrap;
                        }
                        .game-hud .hud-progress-goal {
                            font-family: 'PressStart2P', monospace;
                            font-size: 8px;
                            color: rgba(255, 255, 255, 0.52);
                            white-space: nowrap;
                        }
                        .game-hud .hud-progress-rail {
                            width: 100%;
                            height: 10px;
                            border: 1px solid rgba(255, 132, 28, 0.26);
                            border-radius: 999px;
                            background: #050505;
                            overflow: hidden;
                        }
                        .game-hud .hud-progress-fill {
                            height: 100%;
                            background: #FF841C;
                            box-shadow: 0 0 10px rgba(255, 132, 28, 0.28);
                            transition: width 0.28s ease;
                        }
                        .game-hud .ticket-icon {
                            width: 14px;
                            height: auto;
                        }
                        @media (min-width: 1280px) {
                            .game-hud {
                                display: none;
                            }
                        }
                        @media (max-width: 520px) {
                            .game-hud {
                                gap: 8px;
                                padding: calc(env(safe-area-inset-top, 0px) + 8px) 10px 10px;
                            }
                            .game-hud .hud-back {
                                width: 42px;
                                min-width: 42px;
                                height: 42px;
                                border-radius: 10px;
                            }
                            .game-hud .hud-stat-row {
                                gap: 6px;
                            }
                            .game-hud .hud-stat {
                                padding: 6px 6px 5px;
                            }
                            .game-hud .hud-stat-label {
                                font-size: 6px;
                            }
                            .game-hud .hud-stat-value,
                            .game-hud .hud-progress-score {
                                font-size: 10px;
                            }
                            .game-hud .hud-progress-goal {
                                font-size: 7px;
                            }
                            .game-hud .hud-progress-card {
                                padding: 8px 8px 9px;
                            }
                        }
                    `,
                }}
            />
            <div className="game-hud">
                {onExit && (
                    <button className="hud-back" onClick={onExit} aria-label="Back">
                        <ArrowLeft size={16} />
                    </button>
                )}
                <div className="hud-main">
                    <div className="hud-stat-row">
                        <HudStat label="LVL" value={level} />
                        <HudStat label="SPINS" value={spinsRemaining} tone="spins" />
                        <HudStat
                            label="TICKETS"
                            value={tickets}
                            tone="tickets"
                            icon="/images/ticket.png"
                        />
                    </div>
                    <div className="hud-progress-card">
                        <div className="hud-progress-header">
                            <span className="hud-progress-kicker">Run Score</span>
                            <span className="hud-progress-goal">Goal {threshold}</span>
                        </div>
                        <div className="hud-progress-rail">
                            <div
                                className="hud-progress-fill"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="hud-progress-header">
                            <span className="hud-progress-kicker">Current</span>
                            <span className="hud-progress-score">{score}</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function HudStat({
    label,
    value,
    tone,
    icon,
}: {
    label: string;
    value: number | string;
    tone?: 'spins' | 'tickets';
    icon?: string;
}) {
    return (
        <div className="hud-stat">
            <span className="hud-stat-label">{label}</span>
            <span className={`hud-stat-value ${tone ?? ''}`}>
                {value}
                {icon && <img src={icon} alt="" className="ticket-icon" />}
            </span>
        </div>
    );
}
