const BN = web3.utils.BN
const Exchange = artifacts.require("FakeExchange")
const WBTC = artifacts.require("FakeWBTC")
const RISQ = artifacts.require("FakeRISQ")
const PriceProvider = artifacts.require("FakePriceProvider")
const BTCPriceProvider = artifacts.require("FakeBTCPriceProvider")
const ETHOptions = artifacts.require("ETHOptions")
const WBTCOptions = artifacts.require("WBTCOptions")
const ETHPool = artifacts.require("ETHPool")
const WBTCPool = artifacts.require("WBTCPool")
const StakingETH = artifacts.require("StakingETH")
const StakingWBTC = artifacts.require("StakingWBTC")
const ETHRewards = artifacts.require("ETHRewards")
const WBTCRewards = artifacts.require("WBTCRewards")
const ETHStakingRewards = artifacts.require("ETHStakingRewards")
const WBTCStakingRewards = artifacts.require("WBTCStakingRewards")
const BC = artifacts.require("LinearBondingCurve")

const CONTRACTS_FILE = process.env.CONTRACTS_FILE

const params = {
    ETHPrice: new BN(1100e8), //eth price in usd
    BTCPrice: new BN("3200000000000"), //btc price in usd 
    ETHtoBTC(){return this.ETHPrice.mul(new BN("10000000000000000000000000000000")).div(this.BTCPrice)},
    ExchangePrice: new BN(30e8),
    BC:{
        k: new BN("100830342800"),
        startPrice: new BN("350000000000000")
    }
}

module.exports = async function (deployer, network, [account]) {
    if (["development", "develop", 'soliditycoverage'].indexOf(network) >= 0) {
      const w = await deployer.deploy(WBTC)
      const h = await deployer.deploy(RISQ)
      await deployer.deploy(ETHPool)
      await deployer.deploy(BC, RISQ.address, params.BC.k, params.BC.startPrice)
      await deployer.deploy(Exchange, WBTC.address, params.ETHtoBTC())
      await deployer.deploy(PriceProvider, params.ETHPrice)
      await deployer.deploy(BTCPriceProvider, params.BTCPrice)

      await deployer.deploy(StakingWBTC, RISQ.address, WBTC.address)
      await deployer.deploy(StakingETH, RISQ.address)

      await deployer.deploy(ETHOptions,
          PriceProvider.address,
          ETHPool.address,
          StakingETH.address
      )
      await deployer.deploy(WBTCOptions,
          BTCPriceProvider.address,
          Exchange.address,
          WBTC.address,
          StakingWBTC.address
      )
      const ETHPoolAddress = await ETHOptions.deployed().then(x => x.pool())
      const WBTCPoolAddress = await WBTCOptions.deployed().then(x => x.pool())
      const er = await deployer.deploy(ETHRewards, ETHOptions.address, RISQ.address)
      const wr = await deployer.deploy(WBTCRewards, WBTCOptions.address, RISQ.address)
      const esr = await deployer.deploy(ETHStakingRewards, account, account, RISQ.address, ETHPoolAddress)
      const wsr = await deployer.deploy(WBTCStakingRewards, account, account, RISQ.address, WBTCPoolAddress)

      await h.mintTo(BC.address, "753001000000000000000000000")
      await h.mintTo(ETHRewards.address, "100000000000000000000000000")
      await h.mintTo(WBTCRewards.address, "100000000000000000000000000")
      await h.mintTo(ETHStakingRewards.address, "10000000000000000000000000000000")
      await h.mintTo(WBTCStakingRewards.address, "10000000000000000000000000000000")
      await esr.notifyRewardAmount('4620000000000000000000000')
      await wsr.notifyRewardAmount('4620000000000000000000000')
      await er.setRewardsRate(26229508196)
      await wr.setRewardsRate('8213552361396304000000')
      if(CONTRACTS_FILE){
          const fs = require('fs');
          console.log("> Contracts writing: " + CONTRACTS_FILE)
          fs.writeFileSync(CONTRACTS_FILE, JSON.stringify({
              WBTC: {
                  address: WBTC.address,
                  abi: WBTC.abi
              },
              ETHPriceProvider: {
                  address: PriceProvider.address,
                  abi: PriceProvider.abi
              },
              BTCPriceProvider: {
                  address: BTCPriceProvider.address,
                  abi: BTCPriceProvider.abi
              },
              WBTC: {
                  address: WBTC.address,
                  abi: WBTC.abi
              },
              RISQ: {
                  address: RISQ.address,
                  abi: RISQ.abi
              },
              ETHOptions: {
                  address: ETHOptions.address,
                  abi: ETHOptions.abi
              },
              WBTCOptions: {
                  address: WBTCOptions.address,
                  abi: WBTCOptions.abi
              },
              ETHPool: {
                  address: await ETHOptions.deployed().then(x => x.pool()),
                  abi: await ETHPool.abi
              },
              WBTCPool: {
                  address: await WBTCOptions.deployed().then(x => x.pool()),
                  abi: await WBTCPool.abi
              },
              ETHStaking: {
                  address: StakingETH.address,
                  abi: StakingETH.abi
              },
              WBTCStaking: {
                  address: StakingWBTC.address,
                  abi: StakingWBTC.abi
              },
              ETHRewards: {
                  address: ETHRewards.address,
                  abi: ETHRewards.abi
              },
              WBTCRewards: {
                  address: WBTCRewards.address,
                  abi: WBTCRewards.abi
              },
              BC:{
                  address: BC.address,
                  abi: BC.abi
              },
              ETHStakingRewards:{
                  address: ETHStakingRewards.address,
                  abi: ETHStakingRewards.abi
              },
              WBTCStakingRewards:{
                  address: WBTCStakingRewards.address,
                  abi: WBTCStakingRewards.abi
              },
          }))
      }
  } else {
      throw Error(`wrong network ${network}`)
  }
}
