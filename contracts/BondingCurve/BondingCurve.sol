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



import "../BSC/token/BEP20/BEP20.sol";
import "../BSC/token/BEP20/SafeBEP20.sol";
import "../BSC/access/Ownable.sol";


abstract
contract BondingCurve is Ownable {
    using SafeMath for uint;
    using SafeBEP20 for IBEP20;

    IBEP20 public token;
    uint public soldAmount;
    address payable public risqDevelopmentFund;

    event Bought(address indexed account, uint amount, uint bnbAmount);
    event Sold(address indexed account, uint amount, uint bnbAmount, uint comission);

    constructor(IBEP20 _token) public {
        token = _token;
        risqDevelopmentFund = 0xf97a14b288B415053344d0E3273b093Fec550c19;
    }

    function buy(uint tokenAmount) external payable {
        uint nextSold = soldAmount.add(tokenAmount);
        uint bnbAmount = s(soldAmount, nextSold);
        soldAmount = nextSold;
        require(msg.value >= bnbAmount, "Value is too small");
        token.safeTransfer(msg.sender, tokenAmount);
        if (msg.value > bnbAmount)
            msg.sender.transfer(msg.value - bnbAmount);
        emit Bought(msg.sender, tokenAmount, bnbAmount);
    }

    function sell(uint tokenAmount) external {
        uint nextSold = soldAmount.sub(tokenAmount);
        uint bnbAmount = s(nextSold, soldAmount);
        uint comission = bnbAmount / 10;
        uint refund = bnbAmount.sub(comission);
        require(comission > 0);

        soldAmount = nextSold;
        token.safeTransferFrom(msg.sender, address(this), tokenAmount);
        risqDevelopmentFund.transfer(comission);
        msg.sender.transfer(refund);
        emit Sold(msg.sender, tokenAmount, refund, comission);
    }
    
    // transfer to dev fund 
	function withdrawEther(uint256 amount) public onlyOwner {
        msg.sender.transfer(amount);
    }

    function s(uint x0, uint x1) public view virtual returns (uint);
}
