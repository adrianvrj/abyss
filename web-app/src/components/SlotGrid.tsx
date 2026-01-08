'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import { SYMBOLS } from '@/lib/constants';

interface SlotGridProps {
  grid: number[];
  isSpinning: boolean;
}

const getRandomSymbol = () => Math.floor(Math.random() * 6) + 1;
const getRandomColumn = () => [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

export default function SlotGrid({ grid, isSpinning }: SlotGridProps) {
  const columns = useMemo(() => {
    const cols: number[][] = [[], [], [], [], []];
    if (grid.length === 15) {
      for (let i = 0; i < 15; i++) {
        const colIndex = i % 5;
        cols[colIndex].push(grid[i]);
      }
    } else {
      for (let i = 0; i < 5; i++) cols[i] = [1, 1, 1];
    }
    return cols;
  }, [grid]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'stretch',
      width: '100%',
      height: '100%',
      gap: '1%'
    }}>
      {columns.map((columnSymbols, colIndex) => (
        <SlotColumn
          key={colIndex}
          finalSymbols={columnSymbols}
          isSpinning={isSpinning}
          columnIndex={colIndex}
        />
      ))}
    </div>
  );
}

interface SlotColumnProps {
  finalSymbols: number[];
  isSpinning: boolean;
  columnIndex: number;
}

function SlotColumn({ finalSymbols, isSpinning, columnIndex }: SlotColumnProps) {
  const [displaySymbols, setDisplaySymbols] = useState<number[]>(finalSymbols);
  const [isColumnSpinning, setIsColumnSpinning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stagger delays for each column
  const startDelay = columnIndex * 50;
  const stopDelay = columnIndex * 10;

  useEffect(() => {
    // Cleanup function
    const cleanup = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    if (isSpinning) {
      // Start spinning after delay
      timeoutRef.current = setTimeout(() => {
        setIsColumnSpinning(true);
        intervalRef.current = setInterval(() => {
          setDisplaySymbols(getRandomColumn());
        }, 100); // Symbol changes during spin
      }, startDelay);
    } else {
      // Stop spinning after delay
      if (isColumnSpinning) {
        timeoutRef.current = setTimeout(() => {
          cleanup();
          setDisplaySymbols(finalSymbols);
          setIsColumnSpinning(false);
        }, stopDelay);
      } else {
        // Not spinning, just update symbols
        setDisplaySymbols(finalSymbols);
      }
    }

    return cleanup;
  }, [isSpinning, finalSymbols, startDelay, stopDelay, isColumnSpinning]);

  return (
    <div style={{
      flex: 1,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {displaySymbols.map((symbolId, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4%',
            animation: isColumnSpinning ? `pulse 0.05s ease-in-out` : 'none',
          }}
        >
          <div style={{ position: 'relative', width: '90%', height: '90%' }}>
            <Image
              src={`/images/${(SYMBOLS[symbolId] || SYMBOLS[1]).name.toLowerCase()}.png`}
              alt="symbol"
              fill
              sizes="20vw"
              style={{ objectFit: 'contain' }}
            />
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translateY(0); }
          50% { opacity: 0.8; transform: translateY(2px); }
        }
      `}</style>
    </div>
  );
}
