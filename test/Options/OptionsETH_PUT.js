const {getContracts, timeTravel, toWei, OptionType} = require("../utils/utils.js")
const {testPutPrices} = require("./Prices.js")
const BN = web3.utils.BN
const priceTestPoints = [ 50, 75, 95, 100, 105, 125, 150, 1000]

module.exports.test = () => contract("ETHOptions(put)", ([user1, user2, user3, user4]) => {
  const contracts = getContracts()
  const pricesBuf = []

  async function createOption(params = {}) {
    const {period, amount, strike, user} = params
    const {ETHOptions, ETHPool, PriceProvider} = await contracts
    const [_period, _amount, _strike, from] = [
      new BN(24 * 3600 * (period || 1)),
      new BN(amount || toWei(0.1)),
      new BN(strike || (await PriceProvider.latestAnswer())),
      user || user1,
    ]
    const _type = OptionType.Put
    const [value, settlementFee] = await ETHOptions.fees(
      _period,
      _amount,
      _strike,
      _type
    ).then((x) => [x.total, x.settlementFee])
    const createEvent = await ETHOptions.create(_period, _amount, _strike, _type, {
            value,
            from,
        })
        .then((x) => x.logs.find((x) => x.event == "Create"))
        .then((x) => (x ? x.args : null))
    assert.isNotNull(createEvent, "'Create' event has not been initialized")
    assert.equal(createEvent.account, from, "Wrong account")
    assert(value.eq(createEvent.totalFee), "Wrong premium value")
    assert(
      new BN(settlementFee).eq(createEvent.settlementFee),
      "Wrong settlementFee value"
    )
    assert(
      _amount.div(new BN(100)).eq(createEvent.settlementFee),
      "Wrong settlementFee value"
    )
    return createEvent
  }

  async function testOption(params = {}) {
    const {ETHOptions, PriceProvider} = await contracts
    const backupPrice = await PriceProvider.latestAnswer()

    const period = params.period || 1
    const amount = new BN(params.amount || toWei(1))
    const user = params.user || user1
    const createPrice = new BN(params.createPrice || backupPrice)
    const strike = new BN(params.strike || createPrice)
    const exercisePrice = new BN(params.exercisePrice || createPrice)

    await PriceProvider.setPrice(createPrice)
    const {id, totalFee} = await createOption({period, amount, user, strike})
    await PriceProvider.setPrice(exercisePrice)

    let result

    if (exercisePrice.gt(strike)) {
      await ETHOptions.exercise(id).then(
        () => assert.fail("Exercising a put option should be canceled"),
        (x) => {
          assert.equal(
            x.reason,
            "Current price is too high",
            "Wrong error reason"
          )
          result = "rejected"
        }
      )
    } else {
      const locked = new BN(await ETHOptions.options(id).then(x => x.lockedAmount));
      const countedProfit = amount
        .mul(strike.sub(exercisePrice))
        .div(exercisePrice)
      const expectedProfit = countedProfit.gt(locked) ? locked : countedProfit
      const startBalance = await web3.eth.getBalance(user1)
      const {profit} = await ETHOptions.exercise(id).then(
        (x) => x.logs.find((x) => x.event == "Exercise").args
      )
      const endBalance = await web3.eth.getBalance(user1)
      assert(
        amount.mul(strike).div(new BN(1e8)).gte(expectedProfit),
        "too large expected profit"
      )
      assert.equal(
        profit.toString(),
        expectedProfit.toString(),
        "wrong profit amount (1)"
      )
      // assert.equal(
      //   endBalance.sub(startBalance).toString(),
      //   expectedProfit.toString(),
      //   "wrong profit amount (2)"
      // )
      result = profit / 1e18
    }

    const usdFee = totalFee.mul(createPrice) / 1e26

    pricesBuf.push({
      period,
      amount: amount / 1e18,
      createPrice: createPrice / 1e8,
      strike: strike / 1e8,
      exercisePrice: exercisePrice / 1e8,
      totalFee: totalFee / 1e18,
      usdFee,
      profit: result,
      profitSF: typeof result == "number" ? result - totalFee : result,
    })

    await PriceProvider.setPrice(backupPrice)
  }

  testPutPrices(contracts.then(x=>[x.ETHOptions, x.PriceProvider]))

  it("Should be owned by the first account", async () => {
    const {ETHOptions} = await contracts
    assert.equal(
      await ETHOptions.owner.call(),
      user1,
      "The first account isn't the contract owner"
    )
  })

  it("Should be the owner of the pool contract", async () => {
    const {ETHOptions, ETHPool} = await contracts
    assert.equal(
      await ETHPool.owner(),
      ETHOptions.address,
      "Isn't the owner of the pool"
    )
  })


it("Should provide funds to the pool", async () => {
  const {ETHPool} = await contracts
  const value = toWei(50)
  await ETHPool.provide(0, {value, from: user4})
})

  it("Should create an option", async () => {
    const createEvent = await createOption()
    assert(
      createEvent.id.eq(new BN(0)),
      "The first option's ID isn't equal to 0"
    )
  })

  it("Should exercise an option", async () => {
    const {ETHOptions} = await contracts
    const {id} = await createOption()
    await timeTravel(15 * 60)
    const {amount} = await ETHOptions.options(id)
    const exerciseEvent = await ETHOptions.exercise(id)
      .then((x) => x.logs.find((log) => log.event == "Exercise"))
      .then((x) => (x ? x.args : null))
      .catch((x) => assert.fail(x.reason || x))
    assert.isNotNull(exerciseEvent, "'Exercise' event has not been initialized")
    assert.equal(
      exerciseEvent.id.toNumber(),
      id,
      "Wrong option ID has been initialized"
    )
  })

  it("Shouldn't exercise other options", async () => {
    const {ETHOptions} = await contracts
    const {id} = await createOption()
    await ETHOptions.exercise(id, {from: user2}).then(
      () => assert.fail("Exercising a put option should be canceled"),
      (x) => {
        assert.equal(x.reason, "Wrong msg.sender", "Wrong error reason")
      }
    )
  })

  it("Shouldn't unlock an active option", async () => {
    const period = parseInt(Math.random() * 28 + 1)
    const {ETHOptions} = await contracts
    const {id} = await createOption({period})
    const test = () =>
      ETHOptions.unlock(id).then(
        () => assert.fail("Exercising a put option should be canceled"),
        (x) => {
          assert.equal(
            x.reason,
            "Option has not expired yet",
            "Wrong error reason"
          )
        }
      )
    await test()
    timeTravel(3600 * 24 * period - 1)
    await test()
  })

  it("Shouldn't exercise an expired option", async () => {
    const period = parseInt(Math.random() * 28 + 1)
    const {ETHOptions} = await contracts
    const {id} = await createOption({period, user: user2})
    await timeTravel(period * 24 * 3600 + 1)
    await ETHOptions.exercise(id, {from: user2}).then(
      () => assert.fail("Exercising a put option should be canceled"),
      (x) => {
        assert.equal(x.reason, "Option has expired", "Wrong error reason")
      }
    )
  })

  it("Shouldn't unlock an exercised option", async () => {
    const {ETHOptions} = await contracts
    const {id} = await createOption({user: user2})
    await ETHOptions.exercise(id, {from: user2})
    await timeTravel(24 * 3600 + 1)
    await ETHOptions.unlock(id).then(
      () => assert.fail("Exercising a put option should be canceled"),
      (x) => {
        assert.equal(x.reason, "Option is not active", "Wrong error reason")
      }
    )
  })

  it("Should unlock expired options", async () => {
    const {ETHOptions} = await contracts
    const EXPIRED = new BN(3)
    const expected = await Promise.all([
      createOption({period: 3, user: user3}),
      createOption({period: 3, user: user1}),
      createOption({period: 3, user: user2}),
      createOption({period: 3, user: user2, amount: toWei(4)}),
    ]).then((x) => x.map((x) => x.id.toNumber()))

    await timeTravel(3 * 24 * 3600 + 1)

    const actual = await ETHOptions.unlockAll(expected)
      .then((x) => x.logs.filter((x) => x.event == "Expire"))
      .then((x) => x.map((x) => x.args.id.toNumber()))

    assert.deepEqual(expected, actual, "Wrong optionIDs has been initialized")
    for (const id of expected) {
      const option = await ETHOptions.options(id)
      assert(option.state.eq(EXPIRED), `option ${id} is not expired`)
    }
  })

  it("Should lock funds correctly", async () => {
    const {ETHPool, ETHOptions} = await contracts
    const startLockedAmount = await ETHPool.lockedAmount()
    const amount = new BN(toWei(Math.random().toFixed(18)))
    // const strike = new BN(200e8)
    const {id} = await createOption({amount})
    const endLockedAmount = await ETHPool.lockedAmount()
    // TODO: expected
    const expected = new BN(await ETHOptions.options(id).then(x=>x.lockedAmount))
    const actual = endLockedAmount.sub(startLockedAmount)
    assert(expected.eq(actual), "was locked incorrect amount")
  })

  it("Should unlock funds after an option is exercised", async () => {
    const {ETHOptions, ETHPool} = await contracts
    const amount = new BN(toWei(Math.random().toFixed(18)))
    // const strike = new BN(200e8)
    const {id} = await createOption({amount})
    const startLockedAmount = await ETHPool.lockedAmount()
    await ETHOptions.exercise(id)
    const endLockedAmount = await ETHPool.lockedAmount()
    // TODO: expected
    const expected = new BN(await ETHOptions.options(id).then(x=>x.lockedAmount))
    const actual = startLockedAmount.sub(endLockedAmount)
    assert.equal(
      actual.toString(),
      expected.toString(),
      "was locked incorrect amount"
    )
  })

  it("Shouldn't change pool's total amount when creates an option", async () => {
    const {ETHPool} = await contracts
    const startTotalBalance = await ETHPool.totalBalance()
    const amount = new BN(toWei(Math.random().toFixed(18)))
    const strike = new BN(200e8)
    const {id} = await createOption({amount, strike})
    const endTotalBalance = await ETHPool.totalBalance()

    assert(
      startTotalBalance.eq(endTotalBalance),
      `total amount was changed ${startTotalBalance} -> ${endTotalBalance}`
    )
  })

  it("Shouldn't change users' share when creates an option", async () => {
    const {ETHPool} = await contracts
    const startShares = await Promise.all(
      [user1, user2, user3].map((user) => ETHPool.shareOf(user))
    ).then((x) => x.toString())
    const amount = new BN(toWei(Math.random().toFixed(18)))
    const strike = new BN(200e8)
    const {id} = await createOption({amount, strike})
    const endTotalBalance = await ETHPool.totalBalance()
    const endShares = await Promise.all(
      [user1, user2, user3].map((user) => ETHPool.shareOf(user))
    ).then((x) => x.toString())
    assert.deepEqual(startShares, endShares, `share was changed`)
  })

  it("Should unfreeze LP's profit correctly after an option is unlocked", async () => {
    const {ETHPool, ETHOptions} = await contracts
    const startTotalBalance = await ETHPool.totalBalance()
    const amount = new BN(toWei(Math.random().toFixed(18)))
    const strike = new BN(200e8)
    const {id} = await createOption({amount, strike})
    // const {premium} = await ETHOptions.options(id)
    timeTravel(24 * 3600 + 1)
    const {premium} = await ETHOptions.unlock(id)
      .then((x) => x.logs.find((x) => x.event == "Expire"))
      .then((x) => x.args)
    const endTotalBalance = await ETHPool.totalBalance()

    assert.equal(
      startTotalBalance.add(premium).toString(),
      endTotalBalance.toString(),
      `profit was unlocked incorrectly`
    )
    assert.equal(
      premium.toString(),
      await ETHOptions.options(id).then((x) => x.premium.toString()),
      `profit was counted incorrectly`
    )
  })

  for (const testPoint of priceTestPoints)
    it(`Should pay profit for exercised ITM (110%) option correctly (price: ${testPoint}%)`, () =>
      testOption({
        createPrice: new BN(200e8),
        strike: new BN(200e8).mul(new BN(11)).div(new BN(10)),
        exercisePrice: new BN(200e8).mul(new BN(testPoint)).div(new BN(100)),
      }))

  for (const testPoint of priceTestPoints)
    it(`Should pay profit for exercised ATM option correctly (price: ${testPoint}%)`, () =>
      testOption({
        createPrice: new BN(200e8),
        exercisePrice: new BN(200e8).mul(new BN(testPoint)).div(new BN(100)),
      }))

  for (const testPoint of priceTestPoints)
    it(`Should pay profit for exercised OTM (90%) option correctly (price: ${testPoint}%)`, () =>
      testOption({
        createPrice: new BN(200e8),
        strike: new BN(200e8).mul(new BN(9)).div(new BN(10)),
        exercisePrice: new BN(200e8).mul(new BN(testPoint)).div(new BN(100)),
      }))

  it("Shouldn't pay profit for exercised option when price is increased", () =>
    testOption({
    createPrice: new BN(200e8),
    exercisePrice: new BN(200e8 + 1),
  }))

  for (const testPoint of [190, 195, 200, 205, 210])
    it(`Show price for $${testPoint} strike`, () =>
      testOption({
        createPrice: new BN(200e8),
        strike: new BN(testPoint).mul(new BN(1e8)),
        exercisePrice: new BN(190e8),
      }))

  it("Should withdraw funds from the pool", async () => {
    const {ETHPool} = await contracts
    const value = await ETHPool.availableBalance()
    await timeTravel(14 * 24 * 3600 + 1)
    // await ETHPool.lockupPeriod().then(timeTravel)
    await ETHPool.withdraw(value, "100000000000000000000000000000000", {from: user4})
  })

  it("Should print prices", () => {
    console.table(pricesBuf)
  })
})
