pragma solidity 0.6.12;

/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Risq
 * Copyright (C) 2020 Risq Protocol
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import "../Interfaces/Interfaces.sol";


abstract
contract RisqRewards is Ownable {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    IRisqOptions public immutable risqOptions;
    IERC20 public immutable risq;
    mapping(uint => bool) public rewardedOptions;
    mapping(uint => uint) public dailyReward;
    uint internal constant MAX_DAILY_REWARD = 1_000e18;
    uint internal constant REWARD_RATE_ACCURACY = 1e8;
    uint internal immutable MAX_REWARDS_RATE;
    uint internal immutable MIN_REWARDS_RATE;
    uint internal immutable FIRST_OPTION_ID;
    uint public rewardsRate;

    constructor(
        IRisqOptions _risqOptions,
        IERC20 _risq,
        uint maxRewardsRate,
        uint minRewardsRate,
        uint firstOptionID
    ) public {
        risqOptions = _risqOptions;
        risq = _risq;
        MAX_REWARDS_RATE = maxRewardsRate;
        MIN_REWARDS_RATE = minRewardsRate;
        rewardsRate = maxRewardsRate;
        FIRST_OPTION_ID = firstOptionID;
    }

    function getReward(uint optionId) external {
        uint amount = rewardAmount(optionId);
        uint today = block.timestamp / 1 days;
        dailyReward[today] = dailyReward[today].add(amount);

        (IRisqOptions.State state, address holder, , , , , , ) =
            risqOptions.options(optionId);
        require(optionId >= FIRST_OPTION_ID, "Wrong Option ID");
        require(state != IRisqOptions.State.Inactive, "The option is inactive");
        require(!rewardedOptions[optionId], "The option was rewarded");
        require(
            dailyReward[today] < MAX_DAILY_REWARD,
            "Exceeds daily limits"
        );
        rewardedOptions[optionId] = true;
        risq.safeTransfer(holder, amount);
    }

    function setRewardsRate(uint value) external onlyOwner {
        require(MIN_REWARDS_RATE <= value && value <= MAX_REWARDS_RATE);
        rewardsRate = value;
    }

    function rewardAmount(uint optionId) internal view returns (uint) {
        (, , , uint _amount, , uint _premium, , ) = risqOptions.options(optionId);
        return _amount.div(100).add(_premium)
            .mul(rewardsRate)
            .div(REWARD_RATE_ACCURACY);
    }
}
