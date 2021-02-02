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

import "./Rewards.sol";


contract RisqLINKRewards is RisqRewards {
    constructor(
        IRisqOptions _risqOptions,
        IERC20 _risq
    ) public RisqRewards(
        _risqOptions,
        _risq,
        100_000e18,
        10e8,
        54
    ) {}
}
