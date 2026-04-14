use starknet::ContractAddress;
use crate::constants::METADATA_URL;
use crate::models::index::Session;

#[generate_trait]
pub impl SessionMetadata of SessionMetadataTrait {
    fn token_uri(
        session_id: u32,
        session: @Session,
        play_address: ContractAddress,
        collection_address: ContractAddress,
    ) -> ByteArray {
        let play_felt: felt252 = play_address.into();
        let collection_felt: felt252 = collection_address.into();
        METADATA_URL()
            + "/api/sessions/"
            + format!("{}", session_id)
            + "?play="
            + format!("{}", play_felt)
            + "&collection="
            + format!("{}", collection_felt)
    }
}
