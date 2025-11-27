// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title ConfidentialLoyaltyPoints
 * @notice A confidential loyalty points system where balances are hidden from competitors/other users
 * @dev Only the customer and the merchant can see a customer's balance
 *
 * Key Features:
 * - Merchant can mint points to customers
 * - Point balances are encrypted (hidden from everyone except authorized parties)
 * - Only customer + merchant can decrypt and view balances
 * - Customers can transfer points to other customers
 */
contract ConfidentialLoyaltyPoints is ZamaEthereumConfig {
    // Program name
    string public name;
    string public symbol;

    // The merchant who owns this loyalty program
    address public merchant;

    // Encrypted balances: customer address => encrypted points balance
    mapping(address => euint64) private _balances;

    // Track if a customer has been registered (has any balance)
    mapping(address => bool) public isCustomer;

    // Total points minted (encrypted)
    euint64 private _totalSupply;

    // Events
    event PointsMinted(address indexed customer, address indexed merchant);
    event PointsTransferred(address indexed from, address indexed to);
    event MerchantUpdated(address indexed oldMerchant, address indexed newMerchant);

    // Errors
    error OnlyMerchant();
    error ZeroAddress();
    error NotACustomer();

    modifier onlyMerchant() {
        if (msg.sender != merchant) revert OnlyMerchant();
        _;
    }

    /**
     * @notice Initialize the loyalty points program
     * @param _name Name of the loyalty program
     * @param _symbol Symbol for the points
     * @param _merchant Address of the merchant who controls this program
     */
    constructor(string memory _name, string memory _symbol, address _merchant) {
        if (_merchant == address(0)) revert ZeroAddress();

        name = _name;
        symbol = _symbol;
        merchant = _merchant;

        // Initialize total supply to encrypted zero
        _totalSupply = FHE.asEuint64(0);
        FHE.allowThis(_totalSupply);
        FHE.allow(_totalSupply, merchant);
    }

    /**
     * @notice Mint loyalty points to a customer
     * @dev Only the merchant can mint points
     * @param customer The customer to receive points
     * @param encryptedAmount The encrypted amount of points to mint
     * @param inputProof Proof for the encrypted input
     */
    function mintPoints(
        address customer,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external onlyMerchant {
        if (customer == address(0)) revert ZeroAddress();

        // Validate and convert encrypted input
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Initialize balance if new customer
        if (!isCustomer[customer]) {
            _balances[customer] = FHE.asEuint64(0);
            isCustomer[customer] = true;
        }

        // Add points to customer balance
        _balances[customer] = FHE.add(_balances[customer], amount);

        // Update total supply
        _totalSupply = FHE.add(_totalSupply, amount);

        // Set ACL permissions:
        // Contract needs access for future operations
        FHE.allowThis(_balances[customer]);
        FHE.allowThis(_totalSupply);

        // Customer can see their own balance
        FHE.allow(_balances[customer], customer);

        // Merchant can see all balances
        FHE.allow(_balances[customer], merchant);
        FHE.allow(_totalSupply, merchant);

        emit PointsMinted(customer, merchant);
    }

    /**
     * @notice Transfer points from sender to another customer
     * @param to Recipient address
     * @param encryptedAmount Encrypted amount to transfer
     * @param inputProof Proof for the encrypted input
     */
    function transferPoints(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        if (to == address(0)) revert ZeroAddress();
        if (!isCustomer[msg.sender]) revert NotACustomer();

        // Validate encrypted input
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Initialize recipient balance if new customer
        if (!isCustomer[to]) {
            _balances[to] = FHE.asEuint64(0);
            isCustomer[to] = true;
        }

        // Check if sender has enough balance
        ebool hasEnough = FHE.ge(_balances[msg.sender], amount);

        // Calculate new balances
        euint64 newSenderBalance = FHE.sub(_balances[msg.sender], amount);
        euint64 newRecipientBalance = FHE.add(_balances[to], amount);

        // Only update if sender has enough (using encrypted select)
        _balances[msg.sender] = FHE.select(hasEnough, newSenderBalance, _balances[msg.sender]);
        _balances[to] = FHE.select(hasEnough, newRecipientBalance, _balances[to]);

        // Update ACL for sender
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allow(_balances[msg.sender], merchant);

        // Update ACL for recipient
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);
        FHE.allow(_balances[to], merchant);

        emit PointsTransferred(msg.sender, to);
    }

    /**
     * @notice Burn points from sender's balance
     * @param encryptedAmount Encrypted amount to burn
     * @param inputProof Proof for the encrypted input
     */
    function burnPoints(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        if (!isCustomer[msg.sender]) revert NotACustomer();

        // Validate encrypted input
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Check if sender has enough balance
        ebool hasEnough = FHE.ge(_balances[msg.sender], amount);

        // Calculate new balance
        euint64 newBalance = FHE.sub(_balances[msg.sender], amount);
        euint64 newTotalSupply = FHE.sub(_totalSupply, amount);

        // Only update if sender has enough
        _balances[msg.sender] = FHE.select(hasEnough, newBalance, _balances[msg.sender]);
        _totalSupply = FHE.select(hasEnough, newTotalSupply, _totalSupply);

        // Update ACL
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allow(_balances[msg.sender], merchant);

        FHE.allowThis(_totalSupply);
        FHE.allow(_totalSupply, merchant);
    }

    /**
     * @notice Get encrypted balance of a customer
     * @dev Only the customer or merchant can decrypt this value
     * @param customer Address of the customer
     * @return The encrypted balance handle
     */
    function getBalance(address customer) external view returns (euint64) {
        return _balances[customer];
    }

    /**
     * @notice Get the encrypted total supply
     * @dev Only merchant can decrypt this value
     * @return The encrypted total supply handle
     */
    function getTotalSupply() external view returns (euint64) {
        return _totalSupply;
    }

    /**
     * @notice Transfer merchant ownership
     * @param newMerchant Address of the new merchant
     */
    function transferMerchant(address newMerchant) external onlyMerchant {
        if (newMerchant == address(0)) revert ZeroAddress();

        address oldMerchant = merchant;
        merchant = newMerchant;

        // Update total supply ACL for new merchant
        FHE.allow(_totalSupply, newMerchant);

        emit MerchantUpdated(oldMerchant, newMerchant);
    }

    /**
     * @notice Grant merchant access to a specific customer's balance
     * @dev Called when merchant ownership changes, for existing customers
     * @param customer The customer whose balance to grant access to
     */
    function grantMerchantAccess(address customer) external onlyMerchant {
        if (!isCustomer[customer]) revert NotACustomer();
        FHE.allow(_balances[customer], merchant);
    }
}
