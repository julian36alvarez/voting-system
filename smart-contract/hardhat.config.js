require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    local: {
      url: "http://127.0.0.1:8545",
      chainId: 5342,
      accounts: [
        "1d79c659dc0c8f727c1ce7027befe49d19dfb501093d3cc9f0968c774cbd9611"
      ],
    },
  },
};