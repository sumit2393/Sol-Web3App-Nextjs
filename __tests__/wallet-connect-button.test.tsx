/**
 * Tests for WalletConnectButton
 *
 * These tests mock `useSolana`, `useConnect` and `useDisconnect` to simulate
 * wallet availability and connect/disconnect flows.
 *
 * Note: this project doesn't include testing dependencies by default. To run
 * these tests locally install: jest, @testing-library/react, @testing-library/jest-dom,
 * babel-jest (or ts-jest) and appropriate TypeScript support.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// Mocks
const setWalletAndAccountMock = jest.fn();

jest.mock("@/components/solana_provider", () => ({
  useSolana: jest.fn()
}));

const useSolana = require("@/components/solana_provider").useSolana;

const connectMock = jest.fn();
const disconnectMock = jest.fn();

jest.mock("@wallet-standard/react", () => ({
  useConnect: jest.fn(() => [false, connectMock]),
  useDisconnect: jest.fn(() => [false, disconnectMock])
}));

import { WalletConnectButton } from "@/components/wallet-connect-button";

beforeEach(() => {
  jest.clearAllMocks();
});

test("shows 'No wallets detected' when no wallets are available", async () => {
  useSolana.mockReturnValue({
    wallets: [],
    selectedWallet: null,
    selectedAccount: null,
    isConnected: false,
    setWalletAndAccount: setWalletAndAccountMock
  });

  render(<WalletConnectButton />);

  // Open the dropdown by clicking the trigger button
  const user = userEvent.setup();
  const trigger = screen.getByRole("button", { name: /connect wallet/i });
  await user.click(trigger);

  expect(await screen.findByText(/no wallets detected/i)).toBeInTheDocument();
});

test("lists available wallets and connects when a wallet item is clicked", async () => {
  const fakeWallet = { name: "Phantom", icon: "", chains: [], features: [] };

  // make connect resolve with a fake account
  connectMock.mockResolvedValue([{ address: "ABCD1234EFGH" }]);

  useSolana.mockReturnValue({
    wallets: [fakeWallet],
    selectedWallet: null,
    selectedAccount: null,
    isConnected: false,
    setWalletAndAccount: setWalletAndAccountMock
  });

  render(<WalletConnectButton />);

  const user = userEvent.setup();
  const trigger = screen.getByRole("button", { name: /connect wallet/i });
  await user.click(trigger);

  // wallet item should be visible
  const walletItem = await screen.findByText(/phantom/i);
  expect(walletItem).toBeInTheDocument();

  await user.click(walletItem);

  await waitFor(() => expect(connectMock).toHaveBeenCalled());
  // after successful connect, setWalletAndAccount should be called
  await waitFor(() =>
    expect(setWalletAndAccountMock).toHaveBeenCalledWith(
      fakeWallet,
      expect.objectContaining({ address: "ABCD1234EFGH" })
    )
  );
});

test("shows connected wallet and disconnects when requested", async () => {
  const fakeWallet = { name: "Phantom", icon: "", chains: [], features: [] };
  const fakeAccount = { address: "ZZZZYYYY1111" };

  disconnectMock.mockResolvedValue(undefined);

  useSolana.mockReturnValue({
    wallets: [fakeWallet],
    selectedWallet: fakeWallet,
    selectedAccount: fakeAccount,
    isConnected: true,
    setWalletAndAccount: setWalletAndAccountMock
  });

  render(<WalletConnectButton />);

  // connected button shows truncated address
  const addr = `${fakeAccount.address.slice(0, 4)}...${fakeAccount.address.slice(-4)}`;
  expect(screen.getByText(addr)).toBeInTheDocument();

  // open menu
  const user = userEvent.setup();
  const trigger = screen.getByRole("button");
  await user.click(trigger);

  // find and click Disconnect
  const disconnectItem = await screen.findByText(/disconnect/i);
  await user.click(disconnectItem);

  await waitFor(() => expect(disconnectMock).toHaveBeenCalled());
  await waitFor(() => expect(setWalletAndAccountMock).toHaveBeenCalledWith(null, null));
});
