import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { getAddress, solidityKeccak256 } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { BigNumber, BigNumberish, constants } from "ethers";
import { PrimateWeapon } from "../typechain";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

const hashEntry = (addr: string, amount: BigNumberish) => {
  return solidityKeccak256(["address", "uint256"], [addr, amount]);
};

describe("PrimateWeapon", function () {
  let w: PrimateWeapon;
  let owner: string, u0: string, u1: string, u2: string;
  // eslint-disable-next-line no-unused-vars
  let ownerSigner: SignerWithAddress,
    u0Signer: SignerWithAddress,
    u1Signer: SignerWithAddress,
    u2Signer: SignerWithAddress;
  let salePrice: BigNumber, preSalePrice: BigNumber;
  let tree: MerkleTree;

  before(async function () {
    const signers = await ethers.getSigners();
    [ownerSigner, u0Signer, u1Signer, u2Signer] = signers;
    [owner, u0, u1, u2] = signers.map((s) => getAddress(s.address));
    const PrimateWeapon = await ethers.getContractFactory("PrimateWeapon");
    w = await PrimateWeapon.deploy("PrimateWeapon", "PW");
    salePrice = await w.SALE_PRICE();
    preSalePrice = await w.PRE_SALE_PRICE();

    // setup merkletree
    const leaves = [];
    const whitelist = [
      { addr: u0, amount: BigNumber.from(3) },
      { addr: u1, amount: BigNumber.from(4) },
      { addr: u2, amount: BigNumber.from(5) },
    ];
    for (const { addr, amount } of whitelist) {
      const leaf = hashEntry(addr, amount);
      leaves.push(leaf);
    }
    tree = new MerkleTree(leaves, keccak256, { sort: true });
    const root = tree.getHexRoot();

    await Promise.all([
      w.flipPreSaleState(),
      w.flipSaleState(),
      w.setBaseURI("https://primate/"),
      w.setMaxSupply(15),
      w.setPreSaleRoot(root),
    ]);
  });

  it("Should fail on zero amount", async function () {
    await expect(w.mint(0)).to.be.revertedWith("invalid amount");
    await expect(w.preSaleMint(0, 1, [constants.HashZero])).to.be.revertedWith(
      "invalid amount"
    );
  });

  it("Should fail on invalid ether value", async function () {
    await expect(w.mint(1, { value: salePrice.sub(1) })).to.be.revertedWith(
      "invalid ether value"
    );
    await expect(
      w.preSaleMint(1, 1, [constants.HashZero], { value: preSalePrice.sub(1) })
    ).to.be.revertedWith("invalid ether value");
  });

  it("Should fail on exceeding max supply", async function () {
    const [maxSupply, totalSupply] = await Promise.all([
      w.maxSupply(),
      w.totalSupply(),
    ]);
    const amount = maxSupply.sub(totalSupply).add(1);
    await expect(
      w.mint(amount, { value: amount.mul(salePrice) })
    ).to.be.revertedWith("exceeds max supply");
    await expect(
      w.preSaleMint(amount, amount, [constants.HashZero], {
        value: amount.mul(preSalePrice),
      })
    ).to.be.revertedWith("exceeds max supply");
  });

  it("Should mint", async function () {
    const amount = 2;
    let supply = (await w.totalSupply()).toNumber();
    await expect(w.mint(amount, { value: salePrice.mul(amount) }))
      .to.emit(w, "Transfer")
      .withArgs(constants.AddressZero, owner, supply++)
      .to.emit(w, "Transfer")
      .withArgs(constants.AddressZero, owner, supply++);
  });

  it("Should mint presale all at once", async function () {
    const amount = BigNumber.from(3);
    const leaf = hashEntry(u0, amount);
    const proof = tree.getHexProof(leaf);
    let supply = (await w.totalSupply()).toNumber();
    await expect(
      w
        .connect(u0Signer)
        .preSaleMint(amount, amount, proof, { value: preSalePrice.mul(amount) })
    )
      .to.emit(w, "Transfer")
      .withArgs(constants.AddressZero, u0, supply++)
      .to.emit(w, "Transfer")
      .withArgs(constants.AddressZero, u0, supply++)
      .to.emit(w, "Transfer")
      .withArgs(constants.AddressZero, u0, supply++);
  });

  it("Should mint presale seperately", async function () {
    let amount = BigNumber.from(1);
    const allowedAmount = BigNumber.from(4);
    const leaf = hashEntry(u1, allowedAmount);
    const proof = tree.getHexProof(leaf);
    let supply = (await w.totalSupply()).toNumber();
    await expect(
      w.connect(u1Signer).preSaleMint(amount, allowedAmount, proof, {
        value: preSalePrice.mul(amount),
      })
    )
      .to.emit(w, "Transfer")
      .withArgs(constants.AddressZero, u1, supply++);

    amount = BigNumber.from(3);
    await expect(
      w.connect(u1Signer).preSaleMint(amount, allowedAmount, proof, {
        value: preSalePrice.mul(amount),
      })
    )
      .to.emit(w, "Transfer")
      .withArgs(constants.AddressZero, u1, supply++)
      .to.emit(w, "Transfer")
      .withArgs(constants.AddressZero, u1, supply++)
      .to.emit(w, "Transfer")
      .withArgs(constants.AddressZero, u1, supply++);
  });

  it("Should fail on exceeding pre sale limit", async function () {
    const amount = BigNumber.from(5);
    const leaf = hashEntry(u2, amount);
    const proof = tree.getHexProof(leaf);
    let supply = (await w.totalSupply()).toNumber();
    await expect(
      w
        .connect(u2Signer)
        .preSaleMint(amount, amount, proof, { value: preSalePrice.mul(amount) })
    )
      .to.emit(w, "Transfer")
      .withArgs(constants.AddressZero, u2, supply++);

    await expect(
      w.connect(u2Signer).preSaleMint(1, amount, proof, { value: preSalePrice })
    ).to.be.revertedWith("exceeds pre-sale limit");
  });
});
