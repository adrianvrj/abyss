use collection::types::attribute::{Attribute, AttributeTrait};
use graffiti::json::JsonImpl;
use crate::constants::{DESCRIPTION, METADATA_URL};
use crate::models::index::Session;

#[generate_trait]
pub impl SessionMetadata of SessionMetadataTrait {
    fn image(session_id: u32, session: @Session) -> ByteArray {
        METADATA_URL() + "/api/sessions/" + format!("{}", session_id) + "/image"
    }

    fn token_uri(session_id: u32, session: @Session) -> ByteArray {
        let is_active = *session.is_active;
        let chips_claimed = *session.chips_claimed;
        let attributes = array![
            Attribute { trait_type: "Session ID", value: format!("{}", session_id) }.jsonify(),
            Attribute { trait_type: "Score", value: format!("{}", session.score) }.jsonify(),
            Attribute { trait_type: "Total Score", value: format!("{}", session.total_score) }.jsonify(),
            Attribute { trait_type: "Level", value: format!("{}", session.level) }.jsonify(),
            Attribute { trait_type: "Tickets", value: format!("{}", session.tickets) }.jsonify(),
            Attribute { trait_type: "Spins Remaining", value: format!("{}", session.spins_remaining) }.jsonify(),
            Attribute { trait_type: "Total Spins", value: format!("{}", session.total_spins) }.jsonify(),
            Attribute { trait_type: "Luck", value: format!("{}", session.luck) }.jsonify(),
            Attribute { trait_type: "Status", value: if is_active { "Active" } else { "Game Over" } }.jsonify(),
            Attribute { trait_type: "Chips Claimed", value: if chips_claimed { "Yes" } else { "No" } }.jsonify(),
        ]
            .span();

        let metadata = JsonImpl::new()
            .add("name", format!("Abyss Session #{}", session_id))
            .add("description", DESCRIPTION())
            .add("image", Self::image(session_id, session))
            .add_array("attributes", attributes)
            .build();

        format!("data:application/json,{}", metadata)
    }
}
