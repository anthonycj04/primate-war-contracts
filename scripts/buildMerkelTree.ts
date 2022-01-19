// import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { BigNumber, BigNumberish } from "ethers";
import { MerkleTree } from "merkletreejs";
// doesn't work with merkletreejs if imported from ethers/lib/utils
import keccak256 from "keccak256";
import { solidityKeccak256, getAddress } from "ethers/lib/utils";
import { join } from "path";

interface ClaimEntry {
  amount: string;
  proof: string[];
}

const hashEntry = (addr: string, amount: BigNumberish) => {
  return solidityKeccak256(["address", "uint256"], [addr, amount]);
};

const formatBNForOutput = (bn: BigNumber) => {
  return bn.toHexString();
  //   return bn.toString();
};

function buildMerkleTree(
  distributions: Map<string, BigNumber>,
  claimEntries: Map<string, ClaimEntry>
) {
  const leaves = new Map<string, string>();
  for (const [addr, amount] of distributions) {
    const leaf = hashEntry(addr, amount);
    leaves.set(addr, leaf);
  }
  const tree = new MerkleTree(Array.from(leaves.values()), keccak256, {
    sort: true,
  });
  for (const [addr, amount] of distributions) {
    claimEntries.set(addr, {
      amount: formatBNForOutput(amount),
      proof: tree.getHexProof(leaves.get(addr)!),
    } as ClaimEntry);
  }
  return tree.getHexRoot();
}

async function main() {
  const data = [
    ["0x5C0Eb280f5CE42C34E196D760A6a223e141554a0", BigNumber.from(50)],
    ["0xb63983f0E62039f77b117e81763941BbEa6cBa58", BigNumber.from(51)],
    ["0xa0C64dd1Fd4B597BeC285D32eDAffa9E7b2316Bb", BigNumber.from(52)],
    ["0xd31Ee6b54282cA928e2B5302aDd6FAB75a93605f", BigNumber.from(53)],
    ["0xbab4E996079c65924Db19Bd93d8C11bdB5f75Da2", BigNumber.from(54)],
  ] as [string, BigNumber][];

  const distributions = new Map<string, BigNumber>();
  let actualDistribution = BigNumber.from(0);
  for (const [addr, amount] of data) {
    const a = getAddress(addr);
    if (distributions.has(a)) {
      throw Error("duplicate distribution");
    }
    distributions.set(a, amount);
    actualDistribution = actualDistribution.add(amount);
  }
  const claims = new Map<string, ClaimEntry>();
  const merkleRoot = buildMerkleTree(distributions, claims);
  writeFileSync(
    "claims.json",
    JSON.stringify({
      merkleRoot: merkleRoot,
      totalAmount: formatBNForOutput(actualDistribution),
      claims: Object.fromEntries(claims),
    })
  );
  for (const [addr, claim] of claims) {
    writeFileSync(
      join("claims", `${addr.toLowerCase()}.json`),
      JSON.stringify({ amount: claim.amount, proof: claim.proof })
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
