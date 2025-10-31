use crate::modules::game_types::{GameConfig, SymbolConfig};

/// Default game configuration
pub fn get_default_config() -> GameConfig {
    GameConfig {
        symbol_seven: SymbolConfig { points: 7, probability: 5 },
        symbol_diamond: SymbolConfig { points: 5, probability: 10 },
        symbol_cherry: SymbolConfig { points: 4, probability: 20 },
        symbol_coin: SymbolConfig { points: 3, probability: 15 },
        symbol_lemon: SymbolConfig { points: 2, probability: 25 },
        symbol_six: SymbolConfig { points: 0, probability: 25 },
        pattern_h3_mult: 2,
        pattern_h4_mult: 5,
        pattern_h5_mult: 10,
        pattern_v3_mult: 3,
        pattern_d3_mult: 4,
        probability666: 150, // 1.5%
    }
}

