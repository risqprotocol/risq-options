const {getBCContracts, toWei, timeTravel, MAX_INTEGER} = require("../utils/utils.js")
const toBN = web3.utils.toBN
const params = {
    BCSupply: toBN("753001000000000000000000000")
}

module.exports.test = () => contract("LinearBondingCurve", ([user1, user2, user3]) => {
    const contract = getBCContracts()

    it("Should provide RISQ to BondingCurve", async () => {
        const {BondingCurve, RISQ} = await contract
        await RISQ.mintTo(BondingCurve.address, params.BCSupply)
    })

    it("Should buy RISQ tokens", async () => {
        const {BondingCurve} = await contract
        await BondingCurve.buy(toWei(400000), {value:toWei(100)})
    })

    it("Should sell RISQ tokens", async () => {
        const {BondingCurve, RISQ} = await contract
        await RISQ.approve(BondingCurve.address, toWei(400000))
        await BondingCurve.sell(toWei(400000))
    })
})
