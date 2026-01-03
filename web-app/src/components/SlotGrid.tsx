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
          delay={colIndex * 100}
        />
      ))}
    </div>
  );
}

function SlotColumn({ finalSymbols, isSpinning, delay }: { finalSymbols: number[], isSpinning: boolean, delay: number }) {
  const [displaySymbols, setDisplaySymbols] = useState<number[]>(finalSymbols);
  const [animState, setAnimState] = useState<'idle' | 'spinning' | 'stopping'>('idle');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isSpinning) {
      timeout = setTimeout(() => {
        setAnimState('spinning');
        intervalRef.current = setInterval(() => {
          setDisplaySymbols(getRandomColumn());
        }, 120);
      }, delay);
    } else {
      if (animState === 'spinning') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplaySymbols(finalSymbols);
        setAnimState('stopping');
        timeout = setTimeout(() => {
          setAnimState('idle');
        }, 300);
      } else {
        setDisplaySymbols(finalSymbols);
      }
    }

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSpinning, finalSymbols, delay, animState]);

  return (
    <div style={{
      flex: 1,
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div
        className={animState}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {displaySymbols.map((id, i) => (
          <SlotSymbol key={i} id={id} />
        ))}
      </div>

      <style jsx>{`
        .spinning {
          animation: spinDown 0.12s linear infinite;
        }
        
        .stopping {
          animation: bounceIn 0.3s ease-out;
        }

        @keyframes spinDown {
          0% { transform: translateY(-10%); }
          100% { transform: translateY(10%); }
        }

        @keyframes bounceIn {
          0% { transform: translateY(-5%); }
          60% { transform: translateY(3%); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function SlotSymbol({ id }: { id: number }) {
  const symbol = SYMBOLS[id] || SYMBOLS[1];
  return (
    <div style={{
      width: '100%',
      height: '33.333%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2%'
    }}>
      <div style={{ position: 'relative', width: '95%', height: '95%' }}>
        <Image
          src={`/images/${symbol.name.toLowerCase()}.png`}
          alt={symbol.name}
          fill
          sizes="20vw"
          style={{ objectFit: 'contain' }}
        />
      </div>
    </div>
  );
}
