#[inline(always)]
pub fn get_charm_drop_chance_from_score(score: u32) -> u32 {
    let mut total_chance = score / 140;
    if total_chance > 50 {
        total_chance = 50;
    }
    total_chance
}

#[inline(always)]
pub fn get_charm_rarity_from_score_and_roll(score: u32, roll: u32) -> u8 {
    if score < 1500 {
        if roll < 88 {
            0
        } else {
            1
        }
    } else if score < 3000 {
        if roll < 76 {
            0
        } else if roll < 96 {
            1
        } else {
            2
        }
    } else if score < 5000 {
        if roll < 58 {
            0
        } else if roll < 90 {
            1
        } else {
            2
        }
    } else if score < 8000 {
        if roll < 52 {
            0
        } else if roll < 90 {
            1
        } else if roll < 99 {
            2
        } else {
            3
        }
    } else if score < 12500 {
        if roll < 40 {
            0
        } else if roll < 82 {
            1
        } else if roll < 97 {
            2
        } else {
            3
        }
    } else if score < 25000 {
        if roll < 28 {
            0
        } else if roll < 68 {
            1
        } else if roll < 95 {
            2
        } else {
            3
        }
    } else {
        if roll < 18 {
            0
        } else if roll < 53 {
            1
        } else if roll < 95 {
            2
        } else {
            3
        }
    }
}
