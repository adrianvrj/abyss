import { motion } from "framer-motion";
import { getStaticCharmDefinition } from "@/lib/charmCatalog";

interface DebtPayoutAnimationProps {
    charmId: number;
    storedScore: number;
    multiplier: number;
    payoutScore: number;
    onComplete: () => void;
}

export default function DebtPayoutAnimation({
    charmId,
    storedScore,
    multiplier,
    payoutScore,
    onComplete,
}: DebtPayoutAnimationProps) {
    const charm = getStaticCharmDefinition(charmId);
    const charmName = charm?.name ?? `Charm #${charmId}`;
    const image = charm?.image ?? `/images/charms/${charmId}.png`;

    return (
        <motion.div
            className="debt-payout-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
        >
            <motion.div
                className="debt-payout-panel"
                initial={{ scale: 0.82, rotate: -2, y: 18 }}
                animate={{ scale: 1, rotate: 0, y: 0 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                onAnimationComplete={() => {
                    window.setTimeout(onComplete, 1900);
                }}
            >
                <div className="debt-payout-beam" />
                <div className="debt-payout-stamp">PAID IN FULL</div>
                <motion.div
                    className="debt-payout-ring"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                />
                <motion.img
                    src={image}
                    alt={charmName}
                    className="debt-payout-charm"
                    initial={{ scale: 0.76, filter: "brightness(0.7)" }}
                    animate={{ scale: [0.76, 1.08, 1], filter: ["brightness(0.7)", "brightness(1.8)", "brightness(1)"] }}
                    transition={{ duration: 0.65, ease: "easeOut" }}
                />
                <div className="debt-payout-copy">
                    <div className="debt-payout-name">{charmName}</div>
                    <div className="debt-payout-equation">
                        {storedScore} x{multiplier}
                    </div>
                    <motion.div
                        className="debt-payout-score"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: [0.8, 1.16, 1] }}
                        transition={{ duration: 0.55, delay: 0.25 }}
                    >
                        +{payoutScore}
                    </motion.div>
                </div>
            </motion.div>

            <style dangerouslySetInnerHTML={{ __html: `
                .debt-payout-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 10050;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.72);
                    pointer-events: none;
                    overflow: hidden;
                }
                .debt-payout-panel {
                    position: relative;
                    width: min(88vw, 430px);
                    min-height: 330px;
                    border: 2px solid #FF841C;
                    border-radius: 8px;
                    background:
                        linear-gradient(180deg, rgba(34, 12, 0, 0.96), rgba(5, 0, 0, 0.98)),
                        repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 4px);
                    box-shadow: none;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 34px 26px 28px;
                    overflow: hidden;
                }
                .debt-payout-beam {
                    position: absolute;
                    inset: -20%;
                    background: conic-gradient(from 0deg, transparent, rgba(255, 132, 28, 0.18), transparent, rgba(255, 224, 138, 0.12), transparent);
                    animation: debtPayoutBeam 1.6s linear infinite;
                    opacity: 0.7;
                }
                .debt-payout-stamp {
                    position: absolute;
                    top: 18px;
                    right: -34px;
                    transform: rotate(12deg);
                    border: 2px solid #FFE08A;
                    color: #FFE08A;
                    background: rgba(0, 0, 0, 0.62);
                    font-family: 'PressStart2P', monospace;
                    font-size: 11px;
                    letter-spacing: 1.2px;
                    padding: 10px 38px;
                    box-shadow: none;
                }
                .debt-payout-ring {
                    position: absolute;
                    width: 190px;
                    height: 190px;
                    border-radius: 50%;
                    border: 1px dashed rgba(255, 224, 138, 0.56);
                    box-shadow: none;
                }
                .debt-payout-charm {
                    width: 122px;
                    height: 122px;
                    object-fit: contain;
                    position: relative;
                    z-index: 1;
                    image-rendering: auto;
                    filter: none;
                }
                .debt-payout-copy {
                    position: relative;
                    z-index: 1;
                    margin-top: 22px;
                    text-align: center;
                    font-family: 'PressStart2P', monospace;
                }
                .debt-payout-name {
                    color: #FFFFFF;
                    font-size: 14px;
                    line-height: 1.5;
                    margin-bottom: 12px;
                    text-shadow: none;
                }
                .debt-payout-equation {
                    color: #FF841C;
                    font-size: 13px;
                    margin-bottom: 10px;
                }
                .debt-payout-score {
                    color: #FFE08A;
                    font-size: 30px;
                    line-height: 1.2;
                    text-shadow: none;
                }
                @keyframes debtPayoutBeam {
                    to { transform: rotate(360deg); }
                }
                @media (max-width: 640px) {
                    .debt-payout-panel {
                        width: min(92vw, 360px);
                        min-height: 300px;
                    }
                    .debt-payout-score {
                        font-size: 24px;
                    }
                    .debt-payout-name {
                        font-size: 11px;
                    }
                }
            ` }} />
        </motion.div>
    );
}
