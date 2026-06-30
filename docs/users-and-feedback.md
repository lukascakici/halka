# Level 4 — Users & Feedback

Evidence for the Level 4 (Green Belt) submission: wallet interactions on the live
contracts (Stellar **Testnet**), plus a summary of the feedback we collected.

---

## Full-circle run — 10 wallets (scripted)

A complete circle rotation driven by [`scripts/simulate-users.sh`](../scripts/simulate-users.sh):
10 independent wallets were generated, funded via Friendbot, and each **joined**
(posting collateral) and **contributed** to a real circle. Member 1 was round 1's
recipient and **claimed** the pot. Every line below is a real, signed, on-chain
transaction from a distinct wallet — proof the contract works end-to-end with
many members.

> These are scripted wallets, not individual people. They demonstrate the
> protocol at scale; see *Real testers* below for human users.

**Circle:** [`CAI3HDXCS6UIXL2DAG2SHKNSBT4UV4JWCPUPSA3JI43UXBJX47FIVIC5`](https://stellar.expert/explorer/testnet/contract/CAI3HDXCS6UIXL2DAG2SHKNSBT4UV4JWCPUPSA3JI43UXBJX47FIVIC5)
— the contract page lists every join / contribute / payout transaction.

| # | Wallet address | Action | Join transaction hash |
| --- | --- | --- | --- |
| 1 | `GAKTBGMZFJZJXFLR4RUYLYA64NSWMLRX2CDE3CPAEWPDX6OYBHFLZ5LN` | join + **claim payout** | `6a4a076e258c4ba472c1da37ec9b1e697513e3518d925aa230b1158a6f5d97d4` |
| 2 | `GC4ANM6DZMFH62RNNJRARFO3NFRUSECS2KDQLNYU2RZG2SKHQCSYSB5O` | join + contribute | `006225cfc32d73f8f889af9ca06dae64e3cf5dca4544ebe6cf736c1ae206ac20` |
| 3 | `GCX3CEHBORSEX3EL7ARNJISMWWHISW5ELLZISCYIYANFGKUQT6MDJDBR` | join + contribute | `a9c3e58683eda743ca1c2a84bf81d163277417b4ebc2a100b550a105f5b8aa93` |
| 4 | `GAVLOSILIZNWEVTKPN7NK2KX3OYZ6H6DHESLNGUFW2WS7Y662PXN7UAU` | join + contribute | `e785711d622ca8535a5c6a17ee7204a133b89cc031841913dac7fb0ccf0a5f98` |
| 5 | `GC3AXAJOJUETWXJFTD2RKTZ52HGY7SDN2G7M3JVTPGNXDBZ5WQPUV5VM` | join + contribute | `2c53f9a5e9f9f6693896348efd256a47bd1ac98d84c8bf33751ef544313a74c6` |
| 6 | `GDKOWLDUHEBUKNJA26OG2Y6WAVEVCEOSYE36H6OJKW336BRDPKKGUIMN` | join + contribute | `728c7cab7829b0061a867eb02f30d834a6faaf2453e4077d784890139b3f3888` |
| 7 | `GCZUFALG75D5NUKJMJ4MRTKIVHDWQSSUZ7AYNBQQC574KCSD6UNRKG2D` | join + contribute | `244fc07352ae47fa68a565beeb95a28d274417d928280d99065368a473afdc85` |
| 8 | `GBYV46BLZ7LBXMB5AAVCF576IA3QO27VWAMKG7LBHQTNIIEL3JD3WEO3` | join + contribute | `2f51b2d2d185555c4ce3c843f7526a096ac03400b43dfd75091af20eb4f15d10` |
| 9 | `GBDVGO3EIFHGYJROUPZSUOIHQBI3MKRSYIOOUM5V4JT4LPQLPHQJ3HEY` | join + contribute | `fed0dfa0c049da922181384100f1a55af09817a24b88fc0afa21dfe0e9a98329` |
| 10 | `GDWVLQBMEPRIXLQIRZ7I2TUVCLWGZ4Q53VMGXU4P4L5XQRLGDWUJ5EZH` | join + contribute | `21f15f2d599093b1bb54e405f8e2eabc0e020b47bbd4804eb6141c25a05be19b` |

Per-transaction explorer: `https://stellar.expert/explorer/testnet/tx/<HASH>`

Reproduce: `IDENTITY=halka-deployer N=10 ./scripts/simulate-users.sh`

---

## Real testers

Actual people who connected a wallet on [halka-kappa.vercel.app](https://halka-kappa.vercel.app/)
and performed an on-chain action.

| # | Tester | Wallet address (G…) | Action | Transaction hash |
| --- | --- | --- | --- | --- |
| 1 |  |  |  |  |
| 2 |  |  |  |  |
| 3 |  |  |  |  |

---

## Feedback summary

Collected via the in-app feedback widget (1–5 usefulness rating + optional notes,
visible in the Vercel Analytics **Events** panel) and direct conversations.

- **Responses:** _N_
- **Average rating:** _X.X / 5_

**What testers liked**
- …

**What to improve**
- …

**Actions taken / planned**
- …
