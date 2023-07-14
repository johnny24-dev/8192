const { TransactionBlock, JsonRpcProvider, Ed25519Keypair, RawSigner, Connection } = require('@mysten/sui.js')

const provider = new JsonRpcProvider(new Connection({
    fullnode: 'https://sui-fullnode.bluemove.net:443'
    // fullnode: 'https://explorer-rpc.mainnet.sui.io:443'
    // fullnode:'https://sui-testnet-endpoint.blockvision.org:443'
}))

const start_game = async (signer) => {
    const tx = new TransactionBlock();

    const [fee] = tx.splitCoins(tx.gas, [tx.pure(200000000)]);
    const moveVec = tx.makeMoveVec({ objects: [fee] })

    tx.moveCall({
        target: `0x225a5eb5c580cb6b6c44ffd60c4d79021e79c5a6cea7eb3e60962ee5f9bc6cb2::game_8192::create`,
        typeArguments: [],
        arguments: [
            tx.object(`0x1d6d6770b9929e9d8233b31348f035a2a552d8427ae07d6413d1f88939f3807f`),
            moveVec
        ],
    });

    const result = await signer.signAndExecuteTransactionBlock({ transactionBlock: tx, options: { showEffects: true, showEvents: true } });
    const gameData = result.events.find((e) => e.type === `0x72f9c76421170b5a797432ba9e1b3b2e2b7cf6faa26eb955396c773af2479e1e::game_8192::NewGameEvent8192`)
    console.log("🚀 ~ file: 8192.js:28 ~ conststart_game= ~ gameData.parsedJson.game_id:", gameData.parsedJson.game_id)
    return gameData.parsedJson.game_id
}

const check_status_game = async (game_id) => {
    const status = await provider.getObject({ id: game_id, options: { showContent: true } });
    console.log("🚀 ~ file: 8192.js:42 ~ constcheck_status_game= ~ status:", status.data.content.fields.game_over)
    return status.data.content.fields.game_over
}


function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

const randome_in_range = (min, max) => {
    return Math.random() * (max - min) + min;
}


const check_directtion = async (game_id, signer) => {

    let game_over = false;
    let count_false = 0;
    let direct = Math.round(Math.random() * 3);
    do {
        const tx = new TransactionBlock()
        const new_direct = Math.round(Math.random() * 3);
        tx.moveCall({
            target: `0x225a5eb5c580cb6b6c44ffd60c4d79021e79c5a6cea7eb3e60962ee5f9bc6cb2::game_8192::make_move`,
            typeArguments: [],
            arguments: [
                tx.object(game_id),
                tx.pure(new_direct)
            ],
        });
        const raw_status = await signer.devInspectTransactionBlock({ transactionBlock: tx, options: { showEvents: true, showEffects: true } })
        const gameStatus = raw_status.events.find((e) => e.type === `0x72f9c76421170b5a797432ba9e1b3b2e2b7cf6faa26eb955396c773af2479e1e::game_8192::GameMoveEvent8192`)
        if (gameStatus) {
            game_over = gameStatus.parsedJson.game_over
            // console.log("🚀 ~ file: 8192.js:73 ~ constplay_game= ~ gameStatus.parsedJson.game_over:", gameStatus.parsedJson.game_over)
        };
        if (game_over || !gameStatus) {
            count_false += 1;
        }
        if (!game_over) {
            direct = new_direct
        }
        console.log('count_false, game_over', count_false, game_over)
    } while (game_over && count_false < 300)

    return { game_over, direct }


}

const play_game = async (private_key, game_id, stop_balance) => {

    const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(private_key.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))))
    const signer = new RawSigner(
        keypair,
        provider
    );

    let address = await signer.getAddress()

    console.log(`________________________runing on ${address}_-_-________________________________________`)
    let new_game_id = game_id;
    try {

        let game_over = game_id ? await check_status_game(game_id) : true;

        if (game_over) {
            new_game_id = await start_game(signer);
            const time_delay = randome_in_range(400, 700);
            await delay(time_delay);
            game_over = false;
        };
        let remain_balance = await provider.getBalance({ owner: address })

        let total_transaction = 0;

        while (+remain_balance.totalBalance > stop_balance && !game_over) {
            const tx = new TransactionBlock();

            const { direct, game_over } = await check_directtion(new_game_id, signer)

            tx.moveCall({
                target: `0x225a5eb5c580cb6b6c44ffd60c4d79021e79c5a6cea7eb3e60962ee5f9bc6cb2::game_8192::make_move`,
                typeArguments: [],
                arguments: [
                    tx.object(new_game_id),
                    tx.pure(direct)
                ],
            });
            if (game_over) {
                const tx2 = new TransactionBlock()
                const [fee] = tx2.splitCoins(tx2.gas, [tx2.pure(200000000)]);
                const moveVec = tx2.makeMoveVec({ objects: [fee] })
                tx2.moveCall({
                    target: `0x225a5eb5c580cb6b6c44ffd60c4d79021e79c5a6cea7eb3e60962ee5f9bc6cb2::game_8192::create`,
                    typeArguments: [],
                    arguments: [
                        tx2.object(`0x1d6d6770b9929e9d8233b31348f035a2a552d8427ae07d6413d1f88939f3807f`),
                        moveVec
                    ],
                });

                const result_init_game = await signer.signAndExecuteTransactionBlock({ transactionBlock: tx2, options: { showEvents: true } });

                const gameData = result_init_game.events.find((e) => e.type === `0x72f9c76421170b5a797432ba9e1b3b2e2b7cf6faa26eb955396c773af2479e1e::game_8192::NewGameEvent8192`)
                if (gameData) {
                    new_game_id = gameData.parsedJson.game_id

                };
                const tx3 = new TransactionBlock();
                tx3.moveCall({
                    target: `0x225a5eb5c580cb6b6c44ffd60c4d79021e79c5a6cea7eb3e60962ee5f9bc6cb2::game_8192::make_move`,
                    typeArguments: [],
                    arguments: [
                        tx3.object(new_game_id),
                        tx3.pure(direct)
                    ],
                });
                const time_delay = randome_in_range(500, 1000);
                console.log("🚀 ~ file: 8192.js:151 ~ constplay_game= ~ time_delay:", time_delay)
                await delay(time_delay);
                const result3 = await signer.signAndExecuteTransactionBlock({ transactionBlock: tx3, options: { showEvents: true } });
                total_transaction = 1;
                game_over = false
            } else {
                const time_delay = randome_in_range(500, 1000);
                console.log("🚀 ~ file: 8192.js:157 ~ constplay_game= ~ time_delay:", time_delay)
                await delay(time_delay);
                const result2 = await signer.signAndExecuteTransactionBlock({ transactionBlock: tx, options: { showEvents: true } });
                total_transaction += 1;
            }


            console.log(`address:${address} => game_id = ${new_game_id} => total = ${total_transaction}`)
            remain_balance = await provider.getBalance({ owner: address })
            console.log("🚀 ~ file: 8192.js:101 ~ constplay_game= ~ remain_balance:", remain_balance.totalBalance)

        }
    } catch (error) {
        console.log("🚀 ~ file: 8192.js:103 ~ constplay_game= ~ error:", error)
        console.log(`__________________________End of ${address}______________________________________`)

        play_game(private_key, new_game_id, stop_balance)

    }

}

