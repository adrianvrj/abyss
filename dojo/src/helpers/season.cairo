use crate::constants::{PRIZE_PCT_RANK_1, PRIZE_PCT_RANK_2, PRIZE_PCT_RANK_3};
use crate::models::index::SeasonInfo;

// Inserts (session_id, score) into the season's descending top-3, keeping the
// first session on ties (strictly-greater required to displace). Returns true if
// the ranking changed.
pub fn record_top3(ref season: SeasonInfo, session_id: u32, score: u32) -> bool {
    if score > season.top1_score {
        season.top3_session = season.top2_session;
        season.top3_score = season.top2_score;
        season.top2_session = season.top1_session;
        season.top2_score = season.top1_score;
        season.top1_session = session_id;
        season.top1_score = score;
        true
    } else if score > season.top2_score {
        season.top3_session = season.top2_session;
        season.top3_score = season.top2_score;
        season.top2_session = session_id;
        season.top2_score = score;
        true
    } else if score > season.top3_score {
        season.top3_session = session_id;
        season.top3_score = score;
        true
    } else {
        false
    }
}

// Prize share (out of 100) for a top-3 rank: 0 => 1st, 1 => 2nd, 2 => 3rd.
pub fn rank_pct(rank: u8) -> u256 {
    if rank == 0 {
        PRIZE_PCT_RANK_1
    } else if rank == 1 {
        PRIZE_PCT_RANK_2
    } else {
        PRIZE_PCT_RANK_3
    }
}

#[cfg(test)]
mod tests {
    use crate::models::index::SeasonInfo;
    use super::{rank_pct, record_top3};

    fn empty_season() -> SeasonInfo {
        SeasonInfo {
            season_id: 1,
            leaderboard_id: 2,
            end_ts: 0,
            pool_amount: 0,
            finalized: false,
            claimed_mask: 0,
            top1_session: 0,
            top1_score: 0,
            top2_session: 0,
            top2_score: 0,
            top3_session: 0,
            top3_score: 0,
        }
    }

    #[test]
    fn record_top3_orders_descending_and_displaces() {
        let mut s = empty_season();
        assert!(record_top3(ref s, 10, 100));
        assert!(record_top3(ref s, 11, 50));
        assert!(record_top3(ref s, 12, 200));

        // Highest first: 12(200), 10(100), 11(50)
        assert_eq!(s.top1_session, 12);
        assert_eq!(s.top1_score, 200);
        assert_eq!(s.top2_session, 10);
        assert_eq!(s.top2_score, 100);
        assert_eq!(s.top3_session, 11);
        assert_eq!(s.top3_score, 50);

        // A new 150 slots into 2nd and pushes 11(50) off the board.
        assert!(record_top3(ref s, 13, 150));
        assert_eq!(s.top1_session, 12);
        assert_eq!(s.top2_session, 13);
        assert_eq!(s.top2_score, 150);
        assert_eq!(s.top3_session, 10);
        assert_eq!(s.top3_score, 100);
    }

    #[test]
    fn record_top3_ignores_scores_below_third() {
        let mut s = empty_season();
        record_top3(ref s, 1, 30);
        record_top3(ref s, 2, 20);
        record_top3(ref s, 3, 10);
        assert!(!record_top3(ref s, 4, 5));
        assert_eq!(s.top3_session, 3);
        assert_eq!(s.top3_score, 10);
    }

    #[test]
    fn record_top3_keeps_first_on_ties() {
        let mut s = empty_season();
        record_top3(ref s, 1, 100);
        // A different session with an equal score takes the NEXT slot — it must
        // not displace the earlier session from rank 1 (strictly-greater rule).
        assert!(record_top3(ref s, 2, 100));
        assert_eq!(s.top1_session, 1);
        assert_eq!(s.top1_score, 100);
        assert_eq!(s.top2_session, 2);
        assert_eq!(s.top2_score, 100);
    }

    #[test]
    fn rank_pct_matches_50_30_20() {
        assert_eq!(rank_pct(0), 50);
        assert_eq!(rank_pct(1), 30);
        assert_eq!(rank_pct(2), 20);
    }

    #[test]
    fn prize_amounts_split_pool_correctly() {
        // 1 USDC pool (6 decimals) splits 0.5 / 0.3 / 0.2.
        let pool: u256 = 1_000_000;
        assert_eq!(pool * rank_pct(0) / 100, 500_000);
        assert_eq!(pool * rank_pct(1) / 100, 300_000);
        assert_eq!(pool * rank_pct(2) / 100, 200_000);
        assert_eq!(
            pool * rank_pct(0) / 100 + pool * rank_pct(1) / 100 + pool * rank_pct(2) / 100, pool,
        );
    }
}
