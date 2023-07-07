// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./VotingSystem.sol";

contract VotingSystemFactory {

    struct RichVotingSystem {
        VotingSystem election;
        address manager;
    }
 

    RichVotingSystem[] private elections;

    event VotingSystemUpdated(address addr, RichVotingSystem[] elections);

    function createElection(
        string[] memory options,
        uint256 subscriptionPayment,
        address manager
    ) public payable {
        VotingSystem election = new VotingSystem{value: msg.value}(
            options,
            subscriptionPayment,
            manager
        );
        elections.push(RichVotingSystem(election, manager));
        emit VotingSystemUpdated(address(this), elections);
    }

    function removeElection(uint256 index) public {
        require(index < elections.length, "Not a valid index");

        address manager = elections[index].manager;
        require(msg.sender == manager, "Not the election manager");

        elections[index].election.closeElection();
        for (uint256 i = index; i < elections.length - 1; i++) {
            elections[i] = elections[i + 1];
        }
        elections.pop();
        emit VotingSystemUpdated(address(this), elections);
    }

    function getElections() public view returns (RichVotingSystem[] memory) {
        return elections;
    }
}