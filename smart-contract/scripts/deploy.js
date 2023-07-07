// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {

  const lockedAmount = await ethers.utils.parseEther("0.1");
  const VotingSystemFactory = await hre.ethers.getContractFactory("VotingSystemFactory");

  const account = await ethers.provider.getSigner(0);

  const balance = await ethers.provider.getBalance(account.getAddress());
  console.log(`Account balance: ${ethers.utils.formatEther(balance)} ETH`);

  const votingSystem = await VotingSystemFactory.deploy();
  await votingSystem.deployed({ from: account.getAddress(), value: lockedAmount });
  console.log(`Lock with deployed to ${votingSystem.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
