import * as dotenv from "dotenv";

import { HardhatUserConfig, task, types } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("deploy_primate_weapon", "deploy PrimateWeapon")
  .addPositionalParam("token", "token", undefined, types.string, false)
  .addPositionalParam("symbol", "symbol", undefined, types.string, false)
  .setAction(async ({ token, symbol }, hre) => {
    const PrimateWeapon = await hre.ethers.getContractFactory("PrimateWeapon");
    const w = await PrimateWeapon.deploy(token, symbol, {
      maxFeePerGas: hre.ethers.utils.parseUnits("2", "gwei"),
      maxPriorityFeePerGas: hre.ethers.utils.parseUnits("1", "gwei"),
    });
    console.log(`PrimateWeapon deployed at ${w.address}`);
  });

task("verify_primate_weapon", "verify PrimateWeapon")
  .addPositionalParam("address", "address", undefined, types.string, false)
  .addPositionalParam("token", "token", undefined, types.string, false)
  .addPositionalParam("symbol", "symbol", undefined, types.string, false)
  .setAction(async ({ address, token, symbol }, hre) => {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [token, symbol],
      contract: "contracts/PrimateWeapon.sol:PrimateWeapon",
    });
  });

task("set_primate_weapon_root", "set PrimateWeapon merkleroot")
  .addPositionalParam("address", "address", undefined, types.string, false)
  .addPositionalParam("root", "root", undefined, types.string, false)
  .setAction(async ({ address, root }, hre) => {
    const w = await hre.ethers.getContractAt("PrimateWeapon", address);
    const tx = await w.setPreSaleRoot(root, {
      maxFeePerGas: hre.ethers.utils.parseUnits("2", "gwei"),
      maxPriorityFeePerGas: hre.ethers.utils.parseUnits("1", "gwei"),
    });
    console.log(tx);
  });

task("presale_mint_primate_weapon", "set PrimateWeapon merkleroot")
  .addPositionalParam("address", "address", undefined, types.string, false)
  .addPositionalParam("amount", "amount", undefined, types.int, false)
  .setAction(async ({ address, amount }, hre) => {
    const w = await hre.ethers.getContractAt("PrimateWeapon", address);
    const proof = [
      "0x859149f803fc0798c28b8529855eeba7ca1a499f4216ab98feeb0a26df1e7e74",
      "0x2a076ea347f8b245f7cfcb81c7edd12715ccbff52cc5ab38e07135cd809e1337",
      "0xfec1b64f2adcd7192aca9fcb49283b53e75391459cc046d2866fdb71847d2239",
    ];
    const _amount = hre.ethers.BigNumber.from(amount);
    const price = await w.PRE_SALE_PRICE();
    const tx = await w.preSaleMint(_amount, 54, proof, {
      value: _amount.mul(price),
      maxFeePerGas: hre.ethers.utils.parseUnits("2", "gwei"),
      maxPriorityFeePerGas: hre.ethers.utils.parseUnits("1", "gwei"),
    });
    console.log(tx);
  });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: "0.8.4",
  networks: {
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    rinkeby: {
      url: process.env.RINKEBY_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
