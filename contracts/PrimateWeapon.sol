//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { MerkleProof } from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract PrimateWeapon is ERC721Enumerable, ReentrancyGuard, Ownable {
  uint256 public maxSupply;
  bytes32 public preSaleMerkleRoot;
  bool public saleActive;
  bool public preSaleActive;
  string public baseURI;
  mapping(address => uint256) public preSaleMinted;

  uint256 public constant PRE_SALE_PRICE = 0.001 ether;
  uint256 public constant SALE_PRICE = 0.001 ether;

  constructor(string memory name_, string memory symbol_)
    ERC721(name_, symbol_)
  {}

  // admin functions

  function setPreSaleRoot(bytes32 root) external onlyOwner {
    preSaleMerkleRoot = root;
  }

  function flipSaleState() external onlyOwner {
    saleActive = !saleActive;
  }

  function flipPreSaleState() external onlyOwner {
    preSaleActive = !preSaleActive;
  }

  function withdraw() external onlyOwner {
    uint256 b = address(this).balance;
    payable(msg.sender).transfer(b);
  }

  function setBaseURI(string memory baseURI_) external onlyOwner {
    baseURI = baseURI_;
  }

  function _baseURI() internal view virtual override returns (string memory) {
    return baseURI;
  }

  function setMaxSupply(uint256 maxSupply_) external onlyOwner {
    maxSupply = maxSupply_;
  }

  // normal functions

  function preSaleMint(
    uint256 amount,
    uint256 allowed,
    bytes32[] memory proof
  ) external payable nonReentrant {
    require(amount > 0, "invalid amount");
    require(msg.value == amount * PRE_SALE_PRICE, "invalid ether value");
    require(amount + totalSupply() <= maxSupply, "exceeds max supply");
    require(
      preSaleMinted[msg.sender] + amount <= allowed,
      "exceeds pre-sale limit"
    );
    preSaleMinted[msg.sender] += amount;

    bytes32 leaf = keccak256(abi.encodePacked(msg.sender, allowed));
    require(
      MerkleProof.verify(proof, preSaleMerkleRoot, leaf),
      "invalid proof"
    );
    for (uint256 i = 0; i < amount; i++) {
      _safeMint(msg.sender, totalSupply());
    }
  }

  function mint(uint256 amount) external payable nonReentrant {
    require(amount > 0, "invalid amount");
    require(msg.value == amount * SALE_PRICE, "invalid ether value");
    require(amount + totalSupply() <= maxSupply, "exceeds max supply");

    for (uint256 i = 0; i < amount; i++) {
      _safeMint(msg.sender, totalSupply());
    }
  }
}
