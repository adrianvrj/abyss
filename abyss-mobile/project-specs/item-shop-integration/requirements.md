# Requirements Document

## Introduction

The user wants to integrate the new contract methods for the item shop system into the game flow. Currently, the Cairo smart contract has been updated with item shop functionality including buying/selling items and market generation, but these features are not yet integrated into the React Native mobile app. The contract stores items with properties like name, description, price, sell_price, effect_type, effect_value, and target_symbol. Each session can have its own market with 6 random items, and players can purchase up to 6 unique items (1 of each type) that apply effects to their gameplay.

The implementation needs to create a visual market interface where players can browse available items (displayed using assets at `app/assets/images/item{id}.png`), view their inventory, purchase items during gameplay, and sell items back. The effects of owned items should be applied client-side to modify symbol scores, probabilities, pattern multipliers, and other game mechanics as defined by each item's effect_type and effect_value.

This feature will transform the game from a simple slot machine into a roguelike experience where players make strategic decisions about which items to purchase to improve their chances of achieving higher scores and progressing through levels.

## Requirements

### Requirement 1: Contract Integration Layer
**User Story:** As a developer, I want to integrate the Cairo contract's item shop methods into the app, so that the game can interact with on-chain item data.

#### Acceptance Criteria
1. WHEN the app initializes THEN it SHALL load the contract ABI and create dispatcher instances for all item shop methods
2. WHEN a session is created THEN the app SHALL call `get_session_market` to retrieve the 6 available items for that session
3. WHEN retrieving market data THEN the app SHALL parse item details including id, name, description, price, sell_price, effect_type, effect_value, and target_symbol
4. WHEN retrieving inventory THEN the app SHALL call `get_session_inventory` to get all owned items for the current session
5. IF a contract call fails THEN the app SHALL display an appropriate error message and allow retry

### Requirement 2: Market Screen UI
**User Story:** As a player, I want to see a visual market interface during gameplay, so that I can browse and purchase items.

#### Acceptance Criteria
1. WHEN the market screen loads THEN it SHALL display 6 item cards showing the item image from `app/assets/images/item{id}.png`
2. WHEN displaying an item card THEN it SHALL show the item name, description, price, and visual indicator of effect type
3. WHEN an item is already owned THEN its market card SHALL be visually disabled/grayed out with "OWNED" indicator
4. WHEN the player has 6 items THEN all remaining market items SHALL show "INVENTORY FULL" indicator
5. WHEN the player's balance is insufficient THEN the buy button SHALL be disabled with visual feedback
6. WHILE browsing the market THE app SHALL display current balance and inventory count (X/6)

### Requirement 3: Item Purchase Flow
**User Story:** As a player, I want to purchase items from the market, so that I can improve my gameplay with item effects.

#### Acceptance Criteria
1. WHEN the player taps a market item THEN the app SHALL show a confirmation modal with item details and cost
2. WHEN the player confirms purchase THEN the app SHALL call `buy_item_from_market(session_id, market_slot)` on the contract
3. IF the purchase succeeds THEN the app SHALL update the inventory state, deduct the balance, and show success feedback
4. IF the purchase fails due to insufficient balance THEN the app SHALL display "Not enough balance" error
5. IF the purchase fails due to item already owned THEN the app SHALL display "Item already owned" error
6. IF the purchase fails due to full inventory THEN the app SHALL display "Inventory full (max 6 items)" error
7. WHEN a purchase completes THEN the market view SHALL refresh to reflect the new state

### Requirement 4: Inventory Screen UI
**User Story:** As a player, I want to view my owned items and their effects, so that I can understand how they're helping me.

#### Acceptance Criteria
1. WHEN the inventory screen loads THEN it SHALL display all owned items as cards with images from `app/assets/images/item{id}.png`
2. WHEN displaying an owned item THEN it SHALL show name, description, effect details, and sell price
3. WHEN the inventory is empty THEN it SHALL display "No items owned" message
4. WHEN displaying inventory THEN it SHALL show current count (X/6 items)
5. WHILE viewing inventory THE player SHALL be able to see which items apply to which symbols (for targeted effects)

### Requirement 5: Item Selling Flow
**User Story:** As a player, I want to sell items back to the market, so that I can get balance to purchase different items.

#### Acceptance Criteria
1. WHEN the player taps an owned item THEN the app SHALL show a sell confirmation modal with sell price
2. WHEN the player confirms sell THEN the app SHALL call `sell_item(session_id, item_id)` on the contract
3. IF the sell succeeds THEN the app SHALL remove the item from inventory, add sell_price to balance, and show success feedback
4. WHEN an item is sold THEN the market SHALL refresh to show the item as available again
5. IF the sell fails THEN the app SHALL display an appropriate error message

### Requirement 6: Market Refresh System
**User Story:** As a player, I want to refresh the market to see new items, so that I can access different strategic options.

#### Acceptance Criteria
1. WHEN the market screen displays THEN it SHALL show a "Refresh Market" button with cost indicator
2. WHEN the player taps refresh THEN the app SHALL call `refresh_session_market(session_id)` on the contract
3. IF the refresh succeeds THEN the app SHALL reload the market with 6 new random items
4. IF the refresh fails due to insufficient balance THEN the app SHALL display "Not enough balance" error
5. WHEN the market refreshes THEN the refresh count SHALL increment and cost SHALL increase accordingly

### Requirement 7: Client-Side Item Effects Application
**User Story:** As a player, I want my owned items to affect gameplay, so that my purchases provide tangible benefits.

#### Acceptance Criteria
1. WHEN calculating symbol scores THEN the app SHALL apply all DirectScoreBonus effects from owned items matching the symbol
2. WHEN generating the slot grid THEN the app SHALL apply SymbolProbabilityBoost effects to increase spawn chances for targeted symbols
3. WHEN calculating pattern scores THEN the app SHALL apply PatternMultiplierBoost effects to increase all pattern multipliers
4. WHEN calculating final scores THEN the app SHALL apply ScoreMultiplier effects as percentage increases
5. WHEN calculating spins remaining THEN the app SHALL add SpinBonus values from owned items
6. WHEN calculating level progression THEN the app SHALL apply LevelProgressionBonus to reduce XP requirements
7. IF multiple items affect the same mechanic THEN their effects SHALL stack additively

### Requirement 8: Navigation and Access
**User Story:** As a player, I want easy access to the market and inventory during gameplay, so that I can manage items without disrupting my game flow.

#### Acceptance Criteria
1. WHEN on the game screen THEN there SHALL be a "Market" button that navigates to the market screen
2. WHEN on the game screen THEN there SHALL be an "Inventory" button that navigates to the inventory screen
3. WHEN navigating to market/inventory THEN the game state SHALL be preserved
4. WHEN returning from market/inventory THEN the player SHALL return to the game screen with updated effects applied
5. WHILE in a session THE market and inventory SHALL be accessible at any time

### Requirement 9: Visual Feedback and Animations
**User Story:** As a player, I want clear visual feedback for item transactions, so that I understand what's happening.

#### Acceptance Criteria
1. WHEN a purchase completes THEN the app SHALL show a success animation with the item image
2. WHEN a sell completes THEN the app SHALL show a success animation with balance increase
3. WHEN hovering/tapping items THEN they SHALL provide visual feedback (scale, glow, etc.)
4. WHEN item effects are active THEN the game SHALL display subtle indicators showing which effects are applied
5. WHEN balance changes THEN the balance display SHALL animate the change

### Requirement 10: Error Handling and Edge Cases
**User Story:** As a player, I want the app to handle errors gracefully, so that I don't lose progress or get stuck.

#### Acceptance Criteria
1. IF a contract call fails due to network issues THEN the app SHALL show a retry button
2. IF the session is invalid/expired THEN the app SHALL display an error and navigate to session selection
3. IF the market data is corrupted/invalid THEN the app SHALL attempt to reinitialize the market
4. WHEN rapid clicking occurs THEN the app SHALL debounce requests to prevent double-purchases
5. IF the app state becomes inconsistent with contract state THEN it SHALL resync on next screen load
