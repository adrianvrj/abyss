#[inline(always)]
pub fn get_charm_drop_chance_from_score_and_luck(score: u32, effective_luck: u32) -> u32 {
    let mut total_chance = (score / 140) + (effective_luck / 2);
    if total_chance > 60 {
        total_chance = 60;
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
        if roll < 40 {
            0
        } else if roll < 78 {
            1
        } else if roll < 98 {
            2
        } else {
            3
        }
    } else if score < 12500 {
        if roll < 22 {
            0
        } else if roll < 57 {
            1
        } else if roll < 92 {
            2
        } else {
            3
        }
    } else if score < 25000 {
        if roll < 10 {
            0
        } else if roll < 40 {
            1
        } else if roll < 85 {
            2
        } else {
            3
        }
    } else {
        if roll < 3 {
            0
        } else if roll < 25 {
            1
        } else if roll < 80 {
            2
        } else {
            3
        }
    }
}
