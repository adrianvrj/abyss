import { Settings, Volume2, VolumeX, Package, Home } from 'lucide-react';

interface BottomActionBarProps {
    isSoundEnabled: boolean;
    onToggleSound: () => void;
    onOpenSettings: () => void;
    onOpenInventory: () => void;
    onGoHome: () => void;
    disabled?: boolean;
}

export default function BottomActionBar({
    isSoundEnabled,
    onToggleSound,
    onOpenSettings,
    onOpenInventory,
    onGoHome,
    disabled = false
}: BottomActionBarProps) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            padding: '12px 24px',
            background: 'rgba(0, 0, 0, 0.85)',
            borderTop: '2px solid #FF841C',
        }}>
            <ActionButton
                icon={<Home size={20} />}
                label="Home"
                onClick={onGoHome}
                disabled={disabled}
            />
            <ActionButton
                icon={<Package size={20} />}
                label="Inventory"
                onClick={onOpenInventory}
                disabled={disabled}
            />
            <ActionButton
                icon={isSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                label={isSoundEnabled ? "Sound On" : "Sound Off"}
                onClick={onToggleSound}
                disabled={disabled}
                active={isSoundEnabled}
            />
            <ActionButton
                icon={<Settings size={20} />}
                label="Settings"
                onClick={onOpenSettings}
                disabled={disabled}
            />
        </div>
    );
}

interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
}

function ActionButton({ icon, label, onClick, disabled, active }: ActionButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 16px',
                background: active ? 'rgba(255, 132, 28, 0.2)' : 'transparent',
                border: '2px solid #FF841C',
                borderRadius: '8px',
                color: disabled ? '#666' : '#FF841C',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                transition: 'all 0.2s ease',
                fontFamily: "'PressStart2P', monospace",
                fontSize: '8px',
            }}
        >
            {icon}
            <span style={{ marginTop: '2px' }}>{label}</span>
        </button>
    );
}
