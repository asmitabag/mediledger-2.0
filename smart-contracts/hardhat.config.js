require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // Enable intermediate representation for better optimization
    },
  },

  networks: {
    // Local development network
    hardhat: {
      chainId: 31337,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 20,
      },
    },

    // Local node (for testing with persistent state)
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // Ethereum Sepolia testnet
    sepolia: {
      url:
        process.env.ALCHEMY_RPC_URL ||
        `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
      gasPrice: "auto",
      gas: "auto",
    },

    // Ethereum mainnet (production)
    mainnet: {
      url:
        process.env.MAINNET_RPC_URL ||
        `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
      gasPrice: "auto",
      gas: "auto",
    },

    // Polygon testnet (Mumbai) - alternative for lower fees
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80001,
      gasPrice: "auto",
    },

    // Polygon mainnet
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
      gasPrice: "auto",
    },
  },

  // Etherscan verification configuration
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API,
      mainnet: process.env.ETHERSCAN_API,
      polygon: process.env.POLYGONSCAN_API || process.env.ETHERSCAN_API,
      polygonMumbai: process.env.POLYGONSCAN_API || process.env.ETHERSCAN_API,
    },
  },

  // Gas reporter for cost analysis
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    gasPrice: 20, // gwei
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },

  // Contract size reporter
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false,
  },

  // Mocha test configuration
  mocha: {
    timeout: 60000, // 60 seconds for ZK proof tests
    reporter: "spec",
  },

  // Path configurations
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  // TypeChain configuration (if you want TypeScript support)
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};
