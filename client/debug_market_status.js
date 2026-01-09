
const { Aptos, AptosConfig, Network } = require("@aptos-labs/ts-sdk");

const CONFIG = {
    network: Network.CUSTOM,
    fullnode: 'https://testnet.movementnetwork.xyz/v1',
};
const aptos = new Aptos(new AptosConfig(CONFIG));
const UUID = 'a1b836d6-3807-427f-8342-27d3d7055e9e';
const CONTRACT = '0xe839b729a89575c5930c1691b6817de70ecfb4cc229268108ee8eba64a4da792';
const MODULE = 'bonding_curve';

async function check() {
    try {
        const res = await aptos.view({
            payload: {
                function: `${CONTRACT}::${MODULE}::get_market_address`,
                functionArguments: [UUID]
            }
        });
        const marketAddr = res[0];
        console.log("MARKET_ADDRESS: " + marketAddr);

        const resources = await aptos.getAccountResources({ accountAddress: marketAddr });
        const hasAccount = resources.find(r => r.type === '0x1::account::Account');
        const hasCoinStore = resources.find(r => r.type.includes('CoinStore'));

        console.log("HAS_ACCOUNT_RESOURCE: " + (hasAccount ? "YES" : "NO"));
        console.log("HAS_COINSTORE: " + (hasCoinStore ? "YES" : "NO"));

    } catch (e) {
        console.error("ERROR: " + e.message);
    }
}
check();
