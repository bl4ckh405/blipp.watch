    #[view]
    /// Get user's share balance for a video market
    public fun get_user_share_balance(video_id: String, user_address: address): u64 acquires MarketRegistry {
        let registry = borrow_global<MarketRegistry>(@bondingcurve);
        assert!(table::contains(&registry.markets, video_id), E_MARKET_NOT_FOUND);
        let market_address = *table::borrow(&registry.markets, video_id);
        
        // Get the fungible asset metadata object from the market address
        let metadata = object::address_to_object<fungible_asset::Metadata>(market_address);
        
        // Get the user's primary fungible store for this asset
        let store = primary_fungible_store::primary_store(user_address, metadata);
        
        // Return the balance
        fungible_asset::balance(store)
    }
