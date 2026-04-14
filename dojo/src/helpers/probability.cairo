/// Get 666 probability for a given level (per 1000).
/// Server parity: (level - 2) * 1.5% = (level - 2) * 15 per mille
pub fn get_666_probability(level: u32) -> u32 {
    if level <= 2 {
        0
    } else {
        (level - 2) * 15
    }
}
