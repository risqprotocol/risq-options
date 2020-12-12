const tests = {
    poolEth: require('./Pool/RisqPoolETH.js'),
    poolWBTC: require('./Pool/RisqPoolWBTC.js'),
    ETH_CALL: require('./Options/RisqOptionsETH_CALL.js'),
    WBTC_CALL: require('./Options/RisqOptionsWBTC_CALL.js'),
    WBTC_PUT: require('./Options/RisqOptionsWBTC_PUT.js'),
    ETH_PUT: require('./Options/RisqOptionsETH_PUT.js'),
    StakingETH: require('./Staking/RisqStakingETH.js'),
    StakingWBTC: require('./Staking/RisqStakingWBTC.js'),
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
