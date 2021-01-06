const tests = {
    poolEth: require('./Pool/PoolETH.js'),
    poolWBTC: require('./Pool/PoolWBTC.js'),
    ETH_CALL: require('./Options/OptionsETH_CALL.js'),
    WBTC_CALL: require('./Options/OptionsWBTC_CALL.js'),
    WBTC_PUT: require('./Options/OptionsWBTC_PUT.js'),
    ETH_PUT: require('./Options/OptionsETH_PUT.js'),
    StakingETH: require('./Staking/StakingETH.js'),
    StakingWBTC: require('./Staking/StakingWBTC.js'),
    RewardsWBTC: require('./Rewards/WBTCRewards.js'),
    RewardsETH: require('./Rewards/ETHRewards.js'),
    BC: require('./BondingCurve/Linear.js'),
}

if(process.env.DEVMOD){
    // tests.poolEth.test()
    // tests.poolWBTC.test()
    // tests.ETH_CALL.test()
    // tests.WBTC_CALL.test()
    // tests.WBTC_PUT.test()
    // tests.ETH_PUT.test()
    // tests.StakingETH.test()
    // tests.StakingWBTC.test()
    //
    tests.RewardsWBTC.test()
    // tests.RewardsETH.test()
    // tests.BC.test()
} else {
    Object.values(tests).forEach(x => x.test());
}
