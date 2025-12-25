/// Math utilities for bonding curve calculations
/// Provides overflow-safe functions for constant product AMM formula: x * y = k
module bondingcurve::math_utils {
    
    // ===== Constants =====
    
    /// Total supply in bonding curve: 800M shares with 8 decimals
    const CURVE_SUPPLY: u64 = 80_000_000_000_000_000;
    
    /// Initial virtual APT reserve: 30 APT in octas (1 APT = 10^8 octas)
    const INITIAL_VIRTUAL_APT: u64 = 3_000_000_000;
    
    /// Initial virtual token reserve: 800M shares with 8 decimals
    const INITIAL_VIRTUAL_TOKENS: u64 = 80_000_000_000_000_000;
    
    /// Graduation threshold: 460 APT in octas (~$69k at $150/APT)
    const GRADUATION_THRESHOLD: u64 = 46_000_000_000;
    
    /// Platform fee: 1% = 100 basis points
    const PLATFORM_FEE_BPS: u64 = 100;
    
    /// Creator fee: 10% = 1000 basis points
    const CREATOR_FEE_BPS: u64 = 1000;
    
    /// Basis points denominator: 10000 = 100%
    const BPS_DENOMINATOR: u64 = 10000;
    
    /// Decimals for share tokens
    const DECIMALS: u8 = 8;
    
    // ===== Error Codes =====
    
    /// When calculation would result in division by zero
    const E_DIVISION_BY_ZERO: u64 = 1;
    
    /// When calculation would result in overflow
    const E_OVERFLOW: u64 = 2;
    
    /// When input amount is zero
    const E_ZERO_AMOUNT: u64 = 3;
    
    /// When insufficient liquidity for trade
    const E_INSUFFICIENT_LIQUIDITY: u64 = 4;
    
    // ===== Public Functions =====
    
    /// Calculate shares to mint for APT input using constant product formula
    /// Formula: k = apt_reserve * token_reserve
    ///          new_apt = apt_reserve + apt_in
    ///          new_tokens = k / new_apt
    ///          shares_out = token_reserve - new_tokens
    public fun calculate_shares_out(
        apt_reserve: u64,
        token_reserve: u64,
        apt_in: u64
    ): u64 {
        assert!(apt_in > 0, E_ZERO_AMOUNT);
        assert!(apt_reserve > 0, E_DIVISION_BY_ZERO);
        assert!(token_reserve > 0, E_DIVISION_BY_ZERO);
        
        // Use u128 to prevent overflow
        let k = (apt_reserve as u128) * (token_reserve as u128);
        let new_apt = (apt_reserve as u128) + (apt_in as u128);
        let new_tokens = k / new_apt;
        
        // Calculate shares out
        let shares_out = (token_reserve as u128) - new_tokens;
        
        // Ensure we don't try to sell more than available
        assert!(shares_out <= (token_reserve as u128), E_INSUFFICIENT_LIQUIDITY);
        
        (shares_out as u64)
    }
    
    /// Calculate APT to return for shares burned using constant product formula
    /// Formula: k = apt_reserve * token_reserve
    ///          new_tokens = token_reserve + shares_in
    ///          new_apt = k / new_tokens
    ///          apt_out = apt_reserve - new_apt
    public fun calculate_apt_out(
        apt_reserve: u64,
        token_reserve: u64,
        shares_in: u64
    ): u64 {
        assert!(shares_in > 0, E_ZERO_AMOUNT);
        assert!(apt_reserve > 0, E_DIVISION_BY_ZERO);
        assert!(token_reserve > 0, E_DIVISION_BY_ZERO);
        
        // Use u128 to prevent overflow
        let k = (apt_reserve as u128) * (token_reserve as u128);
        let new_tokens = (token_reserve as u128) + (shares_in as u128);
        let new_apt = k / new_tokens;
        
        // Calculate APT out
        let apt_out = (apt_reserve as u128) - new_apt;
        
        // Ensure we don't try to withdraw more than available
        assert!(apt_out <= (apt_reserve as u128), E_INSUFFICIENT_LIQUIDITY);
        
        (apt_out as u64)
    }
    
    /// Calculate current price per share for display purposes
    /// Returns price in octas per share (with 8 decimals)
    /// Formula: price = (apt_reserve * 10^8) / token_reserve
    public fun get_share_price(
        apt_reserve: u64,
        token_reserve: u64
    ): u64 {
        assert!(token_reserve > 0, E_DIVISION_BY_ZERO);
        
        // Use u128 to prevent overflow
        let decimals_multiplier = 100_000_000u128; // 10^8
        let price = ((apt_reserve as u128) * decimals_multiplier) / (token_reserve as u128);
        
        (price as u64)
    }
    
    /// Calculate fee from amount using basis points
    /// Formula: fee = (amount * fee_bps) / BPS_DENOMINATOR
    public fun apply_fee(amount: u64, fee_bps: u64): u64 {
        assert!(fee_bps <= BPS_DENOMINATOR, E_OVERFLOW);
        
        // Use u128 to prevent overflow
        let fee = ((amount as u128) * (fee_bps as u128)) / (BPS_DENOMINATOR as u128);
        
        (fee as u64)
    }
    
    // ===== Getter Functions for Constants =====
    
    public fun get_curve_supply(): u64 {
        CURVE_SUPPLY
    }
    
    public fun get_initial_virtual_apt(): u64 {
        INITIAL_VIRTUAL_APT
    }
    
    public fun get_initial_virtual_tokens(): u64 {
        INITIAL_VIRTUAL_TOKENS
    }
    
    public fun get_graduation_threshold(): u64 {
        GRADUATION_THRESHOLD
    }
    
    public fun get_platform_fee_bps(): u64 {
        PLATFORM_FEE_BPS
    }
    
    public fun get_creator_fee_bps(): u64 {
        CREATOR_FEE_BPS
    }
    
    public fun get_bps_denominator(): u64 {
        BPS_DENOMINATOR
    }
    
    public fun get_decimals(): u8 {
        DECIMALS
    }
    
    // ===== Tests =====
    
    #[test]
    fun test_calculate_shares_out_basic() {
        // Test buying with 1 APT
        let apt_reserve = INITIAL_VIRTUAL_APT;
        let token_reserve = INITIAL_VIRTUAL_TOKENS;
        let apt_in = 100_000_000; // 1 APT
        
        let shares = calculate_shares_out(apt_reserve, token_reserve, apt_in);
        
        // Should receive shares, and not all tokens
        assert!(shares > 0, 0);
        assert!(shares < token_reserve, 1);
    }
    
    #[test]
    fun test_calculate_apt_out_basic() {
        // Test selling 1M shares
        let apt_reserve = INITIAL_VIRTUAL_APT;
        let token_reserve = INITIAL_VIRTUAL_TOKENS - 100_000_000; // Some sold
        let shares_in = 100_000_000; // 1M shares with 8 decimals
        
        let apt = calculate_apt_out(apt_reserve, token_reserve, shares_in);
        
        // Should receive APT
        assert!(apt > 0, 0);
        assert!(apt < apt_reserve, 1);
    }
    
    #[test]
    fun test_get_share_price() {
        let apt_reserve = INITIAL_VIRTUAL_APT;
        let token_reserve = INITIAL_VIRTUAL_TOKENS;
        
        let price = get_share_price(apt_reserve, token_reserve);
        
        // Price should be non-zero
        assert!(price > 0, 0);
    }
    
    #[test]
    fun test_apply_fee_platform() {
        let amount = 100_000_000; // 1 APT
        let fee = apply_fee(amount, PLATFORM_FEE_BPS); // 1%
        
        // 1% of 1 APT = 0.01 APT = 1,000,000 octas
        assert!(fee == 1_000_000, 0);
    }
    
    #[test]
    fun test_apply_fee_creator() {
        let amount = 100_000_000; // 1 APT
        let fee = apply_fee(amount, CREATOR_FEE_BPS); // 10%
        
        // 10% of 1 APT = 0.1 APT = 10,000,000 octas
        assert!(fee == 10_000_000, 0);
    }
    
    #[test]
    #[expected_failure(abort_code = E_ZERO_AMOUNT)]
    fun test_calculate_shares_out_zero_input() {
        calculate_shares_out(INITIAL_VIRTUAL_APT, INITIAL_VIRTUAL_TOKENS, 0);
    }
    
    #[test]
    #[expected_failure(abort_code = E_DIVISION_BY_ZERO)]
    fun test_get_share_price_zero_reserve() {
        get_share_price(100, 0);
    }
}
