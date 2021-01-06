// const PUTContract = artifacts.require("RisqPutOptions")
// const CALLContract = artifacts.require("RisqCallOptions")
const WBTCPoolContract = artifacts.require("WBTCPool")
const ETHPoolContract = artifacts.require("ETHPool")
const WBTCContract = artifacts.require("FakeWBTC")
const RISQContract = artifacts.require("FakeRISQ")
const PriceContract = artifacts.require("FakePriceProvider")
const BTCPriceContract = artifacts.require("FakeBTCPriceProvider")
const ETHOptionsContract = artifacts.require("ETHOptions")
const WBTCOptionsContract = artifacts.require("WBTCOptions")
const RewadsETHContract = artifacts.require("ETHRewards")
const RewadsWBTCContract = artifacts.require("WBTCRewards")
const StakingETHContract = artifacts.require("StakingETH")
const StakingWBTCContract = artifacts.require("StakingWBTC")
const RisqBCContract = artifacts.require("LinearBondingCurve")
const BN = web3.utils.BN


const send = (method, params = []) =>
  new Promise((resolve, reject) =>
    web3.currentProvider.send({id: 0, jsonrpc: "2.0", method, params}, (err, x) => {
        if(err) reject(err)
        else resolve(x)
    })
  )
const getContracts = async () => {
  const [
      ETHRewards, WBTCRewards,
      ETHOptions, WBTCOptions, PriceProvider,
      BTCPriceProvider, WBTC, RISQ,
      TestETHPool, StakingETH, StakingWBTC
  ] = await Promise.all([
        RewadsETHContract.deployed(),
        RewadsWBTCContract.deployed(),
        ETHOptionsContract.deployed(),
        WBTCOptionsContract.deployed(),
        PriceContract.deployed(),
        BTCPriceContract.deployed(),
        WBTCContract.deployed(),
        RISQContract.deployed(),
        ETHPoolContract.deployed(),
        StakingETHContract.deployed(),
        StakingWBTCContract.deployed(),
      ])
  const [ETHPool, WBTCPool] = await Promise.all([
    ETHOptions.pool.call().then((address) => ETHPoolContract.at(address)),
    WBTCOptions.pool.call().then((address) => WBTCPoolContract.at(address)),
  ])
  return {
      ETHRewards, WBTCRewards,
      ETHOptions, WBTCOptions, ETHPool, WBTCPool,
      PriceProvider, BTCPriceProvider, WBTC, RISQ,
      TestETHPool, StakingETH, StakingWBTC,
  }
}

const timeTravel = async (seconds) => {
  await send("evm_increaseTime", [seconds])
  await send("evm_mine")
}

const getBCContracts = () => Promise.all([
    RisqBCContract.deployed(),
    RISQContract.deployed()
]).then(([BondingCurve, RISQ]) => ({BondingCurve, RISQ}))

const snapshot = () => send("evm_snapshot").then(x => x.result)
const revert = (snap) => send("evm_revert", [snap])

module.exports = {
  getContracts,
  timeTravel,
  getBCContracts,
  snapshot, revert,
  toWei: (value) => web3.utils.toWei(value.toString(), "ether"),
  MAX_INTEGER: new BN(2).pow(new BN(256)).sub(new BN(1)),
  OptionType: {Put: 1 , Call: 2}
}
