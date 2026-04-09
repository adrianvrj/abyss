use crate::constants::METADATA_URL;
use crate::models::index::Session;

#[generate_trait]
pub impl SessionMetadata of SessionMetadataTrait {
    fn token_uri(session_id: u32, session: @Session) -> ByteArray {
        METADATA_URL() + "/api/sessions/" + format!("{}", session_id)
    }
}
