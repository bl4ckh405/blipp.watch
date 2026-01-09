/// Bonding curve contract for trading video shares
/// Implements constant product AMM (x * y = k) with fair launch mechanics
module bondingcurve::bonding_curve {
    use std::string::{Self, String};
    use std::signer;
    use std::option;
    use aptos_framework::aptos_account;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::object::{Self, Object, ExtendRef};
    use aptos_framework::fungible_asset::{Self, Metadata, MintRef, BurnRef, TransferRef};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use aptos_std::string_utils;

    use bondingcurve::math_utils;

    // ===== Error Codes =====

    /// When market already exists for video_id
    const E_MARKET_ALREADY_EXISTS: u64 = 1;

    /// When market doesn't exist for video_id
    const E_MARKET_NOT_FOUND: u64 = 2;

    /// When market has graduated and trading is disabled
    const E_MARKET_GRADUATED: u64 = 3;

    /// When caller is not authorized
    const E_NOT_AUTHORIZED: u64 = 4;

    /// When amount is zero
    const E_ZERO_AMOUNT: u64 = 5;

    /// When market is not graduated yet
    const E_NOT_GRADUATED: u64 = 6;

    // ===== Structs =====

    /// Market state for a video's shares trading
    struct Market has key {
        video_id: String,
        creator: address,
        asset_metadata: Object<Metadata>,
        aptos_reserve: u64,
        token_reserve: u64,
        total_sold: u64,
        graduated: bool,
        platform_fee_wallet: address,
        extend_ref: ExtendRef,
        mint_ref: MintRef,
        burn_ref: BurnRef,
        transfer_ref: TransferRef
    }

    /// Global registry to track all markets by video_id
    struct MarketRegistry has key {
        markets: Table<String, address>
    }

    /// Module initialization state
    struct ModuleData has key {
        platform_fee_wallet: address
    }

    // ===== Events =====

    #[event]
    struct MarketCreated has drop, store {
        video_id: String,
        creator: address,
        market_address: address,
        asset_metadata: address,
        timestamp: u64
    }

    #[event]
    struct SharesPurchased has drop, store {
        video_id: String,
        buyer: address,
        apt_paid: u64,
        platform_fee: u64,
        shares_received: u64,
        new_price: u64,
        apt_reserve: u64,
        token_reserve: u64,
        timestamp: u64
    }

    #[event]
    struct SharesSold has drop, store {
        video_id: String,
        seller: address,
        shares_sold: u64,
        apt_received: u64,
        creator_fee: u64,
        new_price: u64,
        apt_reserve: u64,
        token_reserve: u64,
        timestamp: u64
    }

    #[event]
    struct MarketGraduated has drop, store {
        video_id: String,
        final_apt_reserve: u64,
        final_token_reserve: u64,
        total_sold: u64,
        timestamp: u64
    }

    // ===== Initialization =====

    /// Initialize the module with platform fee wallet
    /// Called automatically when module is published
    fun init_module(admin: &signer) {
        // Create market registry in admin's account
        move_to(admin, MarketRegistry { markets: table::new() });

        // Store module data with platform fee wallet (deployer by default)
        move_to(admin, ModuleData { platform_fee_wallet: signer::address_of(admin) });
    }

    // ===== Public Entry Functions =====

    /// Create a new market for a video
    /// Only the creator can create a market for their video
    public entry fun initialize_market(
        creator: &signer, video_id: String
    ) acquires MarketRegistry, ModuleData {
        let creator_addr = signer::address_of(creator);
        let registry = borrow_global_mut<MarketRegistry>(@bondingcurve);

        // Check market doesn't already exist
        assert!(!table::contains(&registry.markets, video_id), E_MARKET_ALREADY_EXISTS);

        // Create a named object for the market
        let constructor_ref =
            object::create_named_object(creator, *string::bytes(&video_id));
        let object_signer = object::generate_signer(&constructor_ref);
        let market_address = signer::address_of(&object_signer);

        // Implicitly register market object for AptosCoin by transferring a tiny amount
        // This automatically creates the account resource if it doesn't exist
        aptos_account::transfer(creator, market_address, 100);

        // Create fungible asset for shares with primary store enabled
        // Truncate video_id to first 8 chars to stay under 32 char limit
        let truncated_id = string::sub_string(&video_id, 0, 8);
        let name = truncated_id;
        let symbol = string_utils::format1(&b"BLIP{}", truncated_id);

        // Create primary fungible asset and get constructor ref
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            &constructor_ref,
            option::none(), // max supply (unlimited)
            name,
            symbol,
            math_utils::get_decimals(),
            string_utils::to_string(&b"https://blipp.watch/icon.png"),
            string_utils::to_string(&b"https://blipp.watch")
        );

        // Get metadata object from constructor ref
        let metadata = object::object_from_constructor_ref<Metadata>(&constructor_ref);

        // Generate refs for minting, burning, transferring, and extending
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let mint_ref = fungible_asset::generate_mint_ref(&constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(&constructor_ref);
        let transfer_ref = fungible_asset::generate_transfer_ref(&constructor_ref);

        // Get platform fee wallet from module data
        let module_data = borrow_global<ModuleData>(@bondingcurve);

        // Initialize Market resource with virtual liquidity
        move_to(
            &object_signer,
            Market {
                video_id,
                creator: creator_addr,
                asset_metadata: metadata,
                aptos_reserve: math_utils::get_initial_virtual_apt(),
                token_reserve: math_utils::get_initial_virtual_tokens(),
                total_sold: 0,
                graduated: false,
                platform_fee_wallet: module_data.platform_fee_wallet,
                extend_ref,
                mint_ref,
                burn_ref,
                transfer_ref
            }
        );

        // Register in global registry
        table::add(&mut registry.markets, video_id, market_address);

        // Emit event
        event::emit(
            MarketCreated {
                video_id,
                creator: creator_addr,
                market_address,
                asset_metadata: object::object_address(&metadata),
                timestamp: timestamp::now_seconds()
            }
        );
    }

    /// Buy shares with MOVE payment
    public entry fun buy_shares(
        buyer: &signer, video_id: String, apt_amount: u64
    ) acquires MarketRegistry, Market {
        assert!(apt_amount > 0, E_ZERO_AMOUNT);

        let buyer_addr = signer::address_of(buyer);

        // Look up market
        let registry = borrow_global<MarketRegistry>(@bondingcurve);
        assert!(table::contains(&registry.markets, video_id), E_MARKET_NOT_FOUND);
        let market_address = *table::borrow(&registry.markets, video_id);

        // Get market (mutable)
        let market = borrow_global_mut<Market>(market_address);

        // Check not graduated
        assert!(!market.graduated, E_MARKET_GRADUATED);

        // Auto-fix: Ensure market is registered for AptosCoin so it can receive payments
        let market_signer = object::generate_signer_for_extending(&market.extend_ref);
        if (!coin::is_account_registered<AptosCoin>(signer::address_of(&market_signer))) {
            coin::register<AptosCoin>(&market_signer);
        };

        // Transfer MOVE from buyer to market object
        coin::transfer<AptosCoin>(buyer, market_address, apt_amount);

        // Calculate and transfer platform fee (1%)
        let platform_fee =
            math_utils::apply_fee(apt_amount, math_utils::get_platform_fee_bps());
        if (platform_fee > 0) {
            coin::transfer<AptosCoin>(
                &object::generate_signer_for_extending(&market.extend_ref),
                market.platform_fee_wallet,
                platform_fee
            );
        };

        // Calculate shares to mint (after fee deduction)
        let apt_after_fee = apt_amount - platform_fee;
        let shares_out =
            math_utils::calculate_shares_out(
                market.aptos_reserve,
                market.token_reserve,
                apt_after_fee
            );

        // Mint shares to buyer
        let fa = fungible_asset::mint(&market.mint_ref, shares_out);
        primary_fungible_store::deposit(buyer_addr, fa);

        // Update reserves
        market.aptos_reserve = market.aptos_reserve + apt_after_fee;
        market.token_reserve = market.token_reserve - shares_out;
        market.total_sold = market.total_sold + shares_out;

        // Check for graduation
        if (market.aptos_reserve >= math_utils::get_graduation_threshold()) {
            market.graduated = true;

            event::emit(
                MarketGraduated {
                    video_id: market.video_id,
                    final_apt_reserve: market.aptos_reserve,
                    final_token_reserve: market.token_reserve,
                    total_sold: market.total_sold,
                    timestamp: timestamp::now_seconds()
                }
            );
        };

        // Calculate new price
        let new_price =
            math_utils::get_share_price(market.aptos_reserve, market.token_reserve);

        // Emit event
        event::emit(
            SharesPurchased {
                video_id: market.video_id,
                buyer: buyer_addr,
                apt_paid: apt_amount,
                platform_fee,
                shares_received: shares_out,
                new_price,
                apt_reserve: market.aptos_reserve,
                token_reserve: market.token_reserve,
                timestamp: timestamp::now_seconds()
            }
        );
    }

    /// Sell shares back to bonding curve for MOVE
    public entry fun sell_shares(
        seller: &signer, video_id: String, share_amount: u64
    ) acquires MarketRegistry, Market {
        assert!(share_amount > 0, E_ZERO_AMOUNT);

        let seller_addr = signer::address_of(seller);

        // Look up market
        let registry = borrow_global<MarketRegistry>(@bondingcurve);
        assert!(table::contains(&registry.markets, video_id), E_MARKET_NOT_FOUND);
        let market_address = *table::borrow(&registry.markets, video_id);

        // Get market (mutable)
        let market = borrow_global_mut<Market>(market_address);

        // CRITICAL: Cannot sell if market has graduated
        assert!(!market.graduated, E_MARKET_GRADUATED);

        // Burn shares from seller
        let fa =
            primary_fungible_store::withdraw(seller, market.asset_metadata, share_amount);
        fungible_asset::burn(&market.burn_ref, fa);

        // Calculate MOVE payout
        let apt_out =
            math_utils::calculate_apt_out(
                market.aptos_reserve,
                market.token_reserve,
                share_amount
            );

        // Calculate creator fee (10%)
        let creator_fee =
            math_utils::apply_fee(apt_out, math_utils::get_creator_fee_bps());
        let seller_amount = apt_out - creator_fee;

        // Transfer MOVE to seller (90%)
        let market_signer = object::generate_signer_for_extending(&market.extend_ref);
        coin::transfer<AptosCoin>(&market_signer, seller_addr, seller_amount);

        // Transfer MOVE to creator (10%)
        if (creator_fee > 0) {
            coin::transfer<AptosCoin>(&market_signer, market.creator, creator_fee);
        };

        // Update reserves
        market.aptos_reserve = market.aptos_reserve - apt_out;
        market.token_reserve = market.token_reserve + share_amount;
        market.total_sold = market.total_sold - share_amount;

        // Calculate new price
        let new_price =
            math_utils::get_share_price(market.aptos_reserve, market.token_reserve);

        // Emit event
        event::emit(
            SharesSold {
                video_id: market.video_id,
                seller: seller_addr,
                shares_sold: share_amount,
                apt_received: seller_amount,
                creator_fee,
                new_price,
                apt_reserve: market.aptos_reserve,
                token_reserve: market.token_reserve,
                timestamp: timestamp::now_seconds()
            }
        );
    }

    // ===== View Functions =====

    #[view]
    /// Get market information for a video
    public fun get_market_info(
        video_id: String
    ): (address, u64, u64, u64, bool) acquires MarketRegistry, Market {
        let registry = borrow_global<MarketRegistry>(@bondingcurve);
        assert!(table::contains(&registry.markets, video_id), E_MARKET_NOT_FOUND);
        let market_address = *table::borrow(&registry.markets, video_id);

        let market = borrow_global<Market>(market_address);

        (
            market.creator,
            market.aptos_reserve,
            market.token_reserve,
            market.total_sold,
            market.graduated
        )
    }

    #[view]
    /// Get current share price for a video market
    public fun get_current_price(video_id: String): u64 acquires MarketRegistry, Market {
        let registry = borrow_global<MarketRegistry>(@bondingcurve);
        assert!(table::contains(&registry.markets, video_id), E_MARKET_NOT_FOUND);
        let market_address = *table::borrow(&registry.markets, video_id);

        let market = borrow_global<Market>(market_address);

        math_utils::get_share_price(market.aptos_reserve, market.token_reserve)
    }

    #[view]
    /// Check if market exists for video
    public fun market_exists(video_id: String): bool acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(@bondingcurve);
        table::contains(&registry.markets, video_id)
    }

    #[view]
    /// Get market address for video
    public fun get_market_address(video_id: String): address acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(@bondingcurve);
        assert!(table::contains(&registry.markets, video_id), E_MARKET_NOT_FOUND);
        *table::borrow(&registry.markets, video_id)
    }

    #[view]
    /// Get user's share balance for a video market
    public fun get_user_share_balance(
        video_id: String, user_address: address
    ): u64 acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(@bondingcurve);
        assert!(table::contains(&registry.markets, video_id), E_MARKET_NOT_FOUND);
        let market_address = *table::borrow(&registry.markets, video_id);

        // Get the fungible asset metadata object from the market address
        let metadata =
            object::address_to_object<fungible_asset::Metadata>(market_address);

        // Use the safe balance helper which returns 0 if store doesn't exist
        primary_fungible_store::balance(user_address, metadata)
    }
    /// Fix for existing markets: register them for AptosCoin
    public entry fun fix_market_coin_registration(
        video_id: String
    ) acquires MarketRegistry, Market {
        let registry = borrow_global<MarketRegistry>(@bondingcurve);
        assert!(table::contains(&registry.markets, video_id), E_MARKET_NOT_FOUND);
        let market_address = *table::borrow(&registry.markets, video_id);
        
        let market = borrow_global<Market>(market_address);
        
        let object_signer = object::generate_signer_for_extending(&market.extend_ref);
        if (!coin::is_account_registered<AptosCoin>(signer::address_of(&object_signer))) {
            coin::register<AptosCoin>(&object_signer);
        };
    }
}

