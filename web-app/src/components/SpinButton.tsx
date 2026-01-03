"use client";

import { motion } from "framer-motion";

interface SpinButtonProps {
    onClick: () => void;
    disabled: boolean;
    isSpinning: boolean;
    spinsRemaining: number;
}

export function SpinButton({ onClick, disabled, isSpinning, spinsRemaining }: SpinButtonProps) {
    return (
        <>
            <motion.button
                onClick={onClick}
                disabled={disabled}
                whileHover={!disabled ? { scale: 1.05 } : {}}
                whileTap={!disabled ? { scale: 0.95 } : {}}
                className="spin-button"
            >
                {isSpinning ? (
                    <span className="spin-button-content">
                        <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                            className="spin-icon"
                        >
                            ⟳
                        </motion.span>
                        SPINNING...
                    </span>
                ) : (
                    <span className="spin-button-content">
                        SPIN ({spinsRemaining})
                    </span>
                )}
            </motion.button>

            <style jsx>{`
        .spin-button {
          padding: var(--spacing-md) var(--spacing-xxl);
          font-family: var(--font-body);
          font-size: 14px;
          color: var(--color-background);
          background-color: var(--color-primary);
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .spin-button:disabled {
          background-color: #333;
          color: #666;
          cursor: not-allowed;
        }

        .spin-button:not(:disabled):hover {
          box-shadow: 0 0 20px var(--color-primary-glow),
                      0 0 40px var(--color-primary-glow);
        }

        .spin-button-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
        }

        .spin-icon {
          font-size: 20px;
          display: inline-block;
        }
      `}</style>
        </>
    );
}
