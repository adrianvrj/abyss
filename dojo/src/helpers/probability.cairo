/// Get 666 probability for a given level (per 1000).
/// Early levels ramp gently, then late game accelerates hard.
pub fn get_666_probability(level: u32) -> u32 {
    if level <= 2 {
        0
    } else if level <= 5 {
        (level - 2) * 20
    } else if level <= 8 {
        60 + ((level - 5) * 30)
    } else if level <= 10 {
        160 + ((level - 8) * 50)
    } else {
        260 + ((level - 10) * 70)
    }
}
