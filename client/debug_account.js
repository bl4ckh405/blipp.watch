
const { Aptos, AptosConfig, Network } = require("@aptos-labs/ts-sdk");

const CONFIG = {
    network: Network.CUSTOM,
    fullnode: 'https://testnet.movementnetwork.xyz/v1',
};
const aptos = new Aptos(new AptosConfig(CONFIG));

const CONTRACT = '0xe839b729a89575c5930c1691b6817de70ecfb4cc229268108ee8eba64a4da792';
const MODULE = 'bonding_curve';
const UUID = 'a1b836d6-3807-427f-8342-27d3d7055e9e';

async function check() {
    console.log(`Checking Market Resource for UUID: ${UUID}`);
    try {
        const res = await aptos.view({
            payload: {
                function: `${CONTRACT}::${MODULE}::get_market_address`,
                functionArguments: [UUID]
            }
        });
        const marketAddr = res[0];

        const marketRes = await aptos.getAccountResource({
            accountAddress: marketAddr,
            resourceType: `${CONTRACT}::${MODULE}::Market`
        });
        console.log("Platform Fee Wallet:", marketRes.data.platform_fee_wallet);
    } catch (e) {
        console.error("Market resource check failed:", e.message || e);
    }
}

check();
