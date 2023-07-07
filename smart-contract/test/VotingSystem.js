const { expect } = require("chai");
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");


const isHardHatNetwork = () => {
    return hre.network.name === "hardhat";
};

async function waitNextBlock() {
    if (isHardHatNetwork()) {
        return helpers.mine();
    }

    const startBlock = await ethers.provider.getBlockNumber();

    return new Promise((resolve, reject) => {
        const isNextBlock = async () => {
            const currentBlock = await ethers.provider.getBlockNumber();
            if (currentBlock > startBlock) {
                resolve();
            } else {
                setTimeout(isNextBlock, 300);
            }
        };
        setTimeout(isNextBlock, 300);
    });
}

describe("waitNextBlock", function () {
    it("should wait for the next block", async function () {
      const startBlock = await ethers.provider.getBlockNumber();
      await waitNextBlock();
      const currentBlock = await ethers.provider.getBlockNumber();
      expect(currentBlock).to.be.gt(startBlock);
    });
  });

describe("VotingSystem", function () {

    let owner, voter1, voter2, manager;
    let votingSystem;
    let getBalances;
    const electionBudget = "0.1";
    const subscriptionFee = "0.05";



    this.beforeEach(async function () {
        const candidates = ["Dog", "Cat"];
        [owner, voter1, voter2, manager] = await ethers.getSigners();
        votingSystem = await ethers.getContractFactory("VotingSystem");
        votingSystem = await votingSystem.deploy(candidates,
            toWei(subscriptionFee),
            manager.address);
        await votingSystem.deployed({
            from: owner.address,
            value: toWei(electionBudget),
        });
        getBalances = async () => ({
            votingSystemBalance: await ethers.provider.getBalance(votingSystem.address),
            voter1Balance: await ethers.provider.getBalance(voter1.address),
            voter2Balance: await ethers.provider.getBalance(voter2.address),
            ownerBalance: await ethers.provider.getBalance(owner.address),
            managerBalance: await ethers.provider.getBalance(manager.address)
        });

    });

    it("has no votes by default", async function () {
        let votes = await votingSystem.getVotes.call();
        expect(toNumbers(votes)).to.deep.equal([0, 0]);
    });

    it("has electionBudget by default", async function () {
        let balance = await votingSystem.getBalance.call();
        expect(balance).to.deep.equal(0);
    });

    it("has state Started by default", async function () {
        let state = await votingSystem.getState.call();
        expect(state).to.equal(0);
    });


    it("can not change to subscribing in started state if not manager", async function () {
        try {
            let voter3 = await ethers.getSigners();
            await votingSystem.startSubscribing({ from: voter3.address });

        } catch (error) {
            expect(error.message).to.equal(
                "VM Exception while processing transaction: reverted with reason string 'Not a manager'"
            );
        }
    });

    it("cant subscribe in started state", async function () {
        try {
            const before = await getBalances();
            before.voter1Balance = await ethers.provider.getBalance(voter1.address);
            await votingSystem.connect(voter1).subscribe({ from: voter1.address });
        } catch (error) {
            expect(error.message).to.equal(
                "VM Exception while processing transaction: reverted with reason string 'Invalid State'"
            );
        }
    });

    it("can change to subscribing in started state", async function () {
        await votingSystem.connect(manager).startSubscribing({ from: manager.address });
        let state = await votingSystem.getState.call();
        expect(state).to.equal(1);
    });


    it("can subscribe in subscribing state, and balances change", async function () {
        const initial = await ethers.provider.getBalance(voter1.address);

        console.log(`Initial: ${initial}`);

        await votingSystem.connect(manager).startSubscribing({ from: manager.address });
        await votingSystem.getState.call();

        const receipt = await votingSystem.connect(voter1).subscribe({ from: voter1.address });

        // Obtener el gas usado del recibo
        const gasUsed = Number(receipt.gasUsed);
        console.log(`GasUsed: ${gasUsed}`);
        const gasPrice = Number((await ethers.provider.getGasPrice()).toString());
        console.log(`GasPrice: ${gasPrice}`);
        console.log(`Gas PxQ: ${gasPrice * gasUsed}`);

        let balance = await votingSystem.getBalance.call();

        expect(balance).to.deep.equal(
            toBigNumber(toWei(electionBudget - subscriptionFee))
        );
        const final = await ethers.provider.getBalance(voter1.address);
        console.log('final:' + final);

    });


    it("can not subscribe more than once", async function () {
        try {
            await votingSystem.connect(manager).startSubscribing({ from: manager.address });
            await votingSystem.connect(voter1).subscribe({ from: voter1.address });
            await votingSystem.connect(voter1).subscribe({ from: voter1.address });
            fail();
        } catch (error) {
            expect(error.message).to.equal(
                "VM Exception while processing transaction: reverted with reason string 'Account has already subscribed'"
            );
        }
    });

    it("fails if voting more than once", async function () {
        try {
            await votingSystem.connect(manager).startSubscribing({ from: manager.address });
            await votingSystem.connect(voter1).subscribe({ from: voter1.address });
            await votingSystem.connect(voter2).subscribe({ from: voter2.address });
            await votingSystem.connect(manager).startVoting({ from: manager.address });
            await votingSystem.connect(voter1).vote(0, { from: voter1.address });
            await votingSystem.connect(voter1).vote(0, { from: voter1.address });
            fail();
        } catch (error) {
            expect(error.message).to.equal(
                "VM Exception while processing transaction: reverted with reason string 'Account has already voted'"
            );
        }
    });

    it("updates votes when voting", async function () {
        await votingSystem.connect(manager).startSubscribing({ from: manager.address });
        await votingSystem.connect(voter1).subscribe({ from: voter1.address });
        await votingSystem.connect(voter2).subscribe({ from: voter2.address });
        await votingSystem.connect(manager).startVoting({ from: manager.address });
        await votingSystem.connect(voter1).vote(0, { from: voter1.address });

        let votes = await votingSystem.getVotes.call();
        expect(toNumbers(votes)).to.deep.equal([1, 0]);
    });


    it("changes to finished when everyone votes", async function () {
        await votingSystem.connect(manager).startSubscribing({ from: manager.address });
        await votingSystem.connect(voter1).subscribe({ from: voter1.address });
        await votingSystem.connect(voter2).subscribe({ from: voter2.address });
        await votingSystem.connect(manager).startVoting({ from: manager.address });
        await votingSystem.connect(voter1).vote(0, { from: voter1.address });
        await votingSystem.connect(voter2).vote(0, { from: voter2.address});
    
        let votes = await votingSystem.getVotes.call();
        expect(toNumbers(votes)).to.deep.equal([2, 0]);
    
        let state = await votingSystem.getState.call();
        expect(state).to.equal(3);
      });
    
      it("changes to finished when stop voting", async function () {
        await votingSystem.connect(manager).startSubscribing({ from: manager.address });
        await votingSystem.connect(voter1).subscribe({ from: voter1.address });
        await votingSystem.connect(voter2).subscribe({ from: voter2.address });
        await votingSystem.connect(manager).startVoting({ from: manager.address });
        await votingSystem.connect(voter1).vote(1, { from: voter1.address });
        
    
        await votingSystem.connect(manager).stopVoting({ from: manager.address });
    
        let votes = await votingSystem.getVotes.call();
        expect(toNumbers(votes)).to.deep.equal([0, 1]);
    
        let state = await votingSystem.getState.call();
        expect(state).to.equal(3);
    });

    it('should return the current timestamp', async function () {
        let timeStart = await votingSystem.getTimeStart();
        let timeEnd = await votingSystem.getTimeEnd();  

        //timeStart to date 
        let dateStart = new Date(timeStart.toNumber()*1000);
        console.log(dateStart);
        expect(timeEnd-timeStart).to.equal(300);
    });

    function toNumbers(bigNumbers) {
        return bigNumbers.map(function (bigNumber) {
            return bigNumber.toNumber();
        });
    }

    function toWei(number) {
        const etherValue = BigInt(10) ** BigInt(18); // 10^18 wei
        const numberValue = Math.floor(number);
        const weiValue = BigInt(numberValue) * etherValue;
        return weiValue.toString();
    }

    function toBigNumber(number) {
        if (typeof number === 'string' || number instanceof String) {
            return BigInt(number);
        } else if (typeof number === 'number' && Number.isInteger(number)) {
            return BigInt(number);
        } else {
            throw new Error('Invalid input. Expected string or integer.');
        }
    }
    

});

