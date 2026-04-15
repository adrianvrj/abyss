/// Get 666 probability for a given level (per 1000).
/// (level - 2) * 2% = (level - 2) * 20 per mille
pub fn get_666_probability(level: u32) -> u32 {
    if level <= 2 {
        0
    } else {
        (level - 2) * 20
    }
}
