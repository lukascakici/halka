import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}





export const Errors = {
  1: {message:"AlreadyInitialized"},
  2: {message:"NotInitialized"},
  3: {message:"InvalidParams"},
  4: {message:"CircleFull"},
  5: {message:"AlreadyMember"},
  6: {message:"NotMember"},
  7: {message:"NotStarted"},
  8: {message:"AlreadyStarted"},
  9: {message:"AlreadyContributed"},
  10: {message:"RoundIncomplete"},
  11: {message:"NotRecipient"},
  12: {message:"NotDefaulted"},
  /**
   * This round's recipient is exempt — they receive the pot, so they don't
   * contribute (and can't be slashed) this round.
   */
  13: {message:"IsRecipient"},
  /**
   * The member's remaining collateral can't cover another missed
   * contribution, so slashing would pay the pot out of *other* members'
   * collateral. The circle is stuck and must be wound down instead.
   */
  14: {message:"InsufficientCollateral"},
  /**
   * The circle is still running, so collateral is still at stake.
   */
  15: {message:"NotWithdrawable"},
  /**
   * No collateral left to return (already withdrawn, or fully slashed).
   */
  16: {message:"NothingToWithdraw"},
  /**
   * The round hasn't stalled long enough for a non-admin to wind the circle
   * down.
   */
  17: {message:"TimeoutNotReached"},
  /**
   * The circle is already Finished or Cancelled.
   */
  18: {message:"AlreadyEnded"}
}


export type DataKey = {tag: "Config", values: void} | {tag: "Members", values: void} | {tag: "Round", values: void} | {tag: "Pot", values: void} | {tag: "RoundStartedAt", values: void} | {tag: "Contributed", values: readonly [u32, string]} | {tag: "Collateral", values: readonly [string]};








export interface CircleConfig {
  admin: string;
  collateral_amount: i128;
  contribution_amount: i128;
  max_members: u32;
  reputation: string;
  /**
 * How long a round may stall before anyone can wind the circle down. This
 * is the escape hatch: without it an absent admin, or a defaulter whose
 * collateral is spent, would strand everyone's funds permanently.
 */
round_timeout_ledgers: u32;
  status: CircleStatus;
  token: string;
}

/**
 * Where the circle is in its lifecycle. Collateral is only withdrawable once
 * the circle has come to rest (`Finished` or `Cancelled`).
 */
export type CircleStatus = {tag: "Open", values: void} | {tag: "Active", values: void} | {tag: "Finished", values: void} | {tag: "Cancelled", values: void};


export interface Client {
  /**
   * Construct and simulate a join transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Join the circle (before it starts), posting collateral.
   */
  join: ({member}: {member: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a leave transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Leave a circle that hasn't started yet, taking the collateral back.
   * Nothing is at stake before the first round, so this is unconditional —
   * members are never locked in by an admin who doesn't press start.
   */
  leave: ({member}: {member: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a slash transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Admin slashes a member who didn't contribute this round: their collateral
   * covers the missed contribution and their reputation drops.
   */
  slash: ({member}: {member: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a start transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Lock membership and begin round 1. Admin only.
   */
  start: (options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a cancel transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Wind the circle down and release everyone's collateral.
   * 
   * The admin may do this at any time before the circle finishes. Anyone may
   * do it once the current round has stalled past `round_timeout_ledgers` —
   * so an absent admin, or a defaulter whose collateral is spent and who can
   * therefore no longer be slashed, can never strand the members' funds.
   * 
   * The current round is unwound: it never paid out, so contributions
   * (including those covered by a slash) go back to the contributors'
   * collateral balances, ready to withdraw.
   */
  cancel: ({caller}: {caller: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_pot transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pot: (options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_round transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_round: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a contribute transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Contribute the fixed amount for the current round. Rewards reputation.
   */
  contribute: ({member}: {member: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_config: (options?: MethodOptions) => Promise<AssembledTransaction<Result<CircleConfig>>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create the circle. Called once (by the admin, or by the Factory on the
   * admin's behalf).
   */
  initialize: ({admin, token, reputation, contribution_amount, collateral_amount, max_members, round_timeout_ledgers}: {admin: string, token: string, reputation: string, contribution_amount: i128, collateral_amount: i128, max_members: u32, round_timeout_ledgers: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a is_stalled transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Whether anyone (not just the admin) may now `cancel` this circle.
   */
  is_stalled: (options?: MethodOptions) => Promise<AssembledTransaction<Result<boolean>>>

  /**
   * Construct and simulate a get_members transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_members: (options?: MethodOptions) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a claim_payout transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * The current round's recipient claims the pot, rotating to the next round.
   */
  claim_payout: (options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_recipient transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * The member who receives the pot in the given round.
   */
  get_recipient: ({round}: {round: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a get_collateral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Collateral still held for a member (posted on join, reduced by slashes).
   */
  get_collateral: ({member}: {member: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a has_contributed transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  has_contributed: ({round, member}: {round: u32, member: string}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a withdraw_collateral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Take back whatever collateral is left once the circle has come to rest.
   */
  withdraw_collateral: ({member}: {member: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a get_round_started_at transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Ledger at which the current round began, once the circle has started.
   */
  get_round_started_at: (options?: MethodOptions) => Promise<AssembledTransaction<Option<u32>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABQAAAAAAAAAAAAAABExlZnQAAAABAAAABGxlZnQAAAABAAAAAAAAAAZtZW1iZXIAAAAAABMAAAABAAAAAg==",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAEgAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAABAAAAAAAAAA5Ob3RJbml0aWFsaXplZAAAAAAAAgAAAAAAAAANSW52YWxpZFBhcmFtcwAAAAAAAAMAAAAAAAAACkNpcmNsZUZ1bGwAAAAAAAQAAAAAAAAADUFscmVhZHlNZW1iZXIAAAAAAAAFAAAAAAAAAAlOb3RNZW1iZXIAAAAAAAAGAAAAAAAAAApOb3RTdGFydGVkAAAAAAAHAAAAAAAAAA5BbHJlYWR5U3RhcnRlZAAAAAAACAAAAAAAAAASQWxyZWFkeUNvbnRyaWJ1dGVkAAAAAAAJAAAAAAAAAA9Sb3VuZEluY29tcGxldGUAAAAACgAAAAAAAAAMTm90UmVjaXBpZW50AAAACwAAAAAAAAAMTm90RGVmYXVsdGVkAAAADAAAAHZUaGlzIHJvdW5kJ3MgcmVjaXBpZW50IGlzIGV4ZW1wdCDigJQgdGhleSByZWNlaXZlIHRoZSBwb3QsIHNvIHRoZXkgZG9uJ3QKY29udHJpYnV0ZSAoYW5kIGNhbid0IGJlIHNsYXNoZWQpIHRoaXMgcm91bmQuAAAAAAALSXNSZWNpcGllbnQAAAAADQAAAMBUaGUgbWVtYmVyJ3MgcmVtYWluaW5nIGNvbGxhdGVyYWwgY2FuJ3QgY292ZXIgYW5vdGhlciBtaXNzZWQKY29udHJpYnV0aW9uLCBzbyBzbGFzaGluZyB3b3VsZCBwYXkgdGhlIHBvdCBvdXQgb2YgKm90aGVyKiBtZW1iZXJzJwpjb2xsYXRlcmFsLiBUaGUgY2lyY2xlIGlzIHN0dWNrIGFuZCBtdXN0IGJlIHdvdW5kIGRvd24gaW5zdGVhZC4AAAAWSW5zdWZmaWNpZW50Q29sbGF0ZXJhbAAAAAAADgAAAD1UaGUgY2lyY2xlIGlzIHN0aWxsIHJ1bm5pbmcsIHNvIGNvbGxhdGVyYWwgaXMgc3RpbGwgYXQgc3Rha2UuAAAAAAAAD05vdFdpdGhkcmF3YWJsZQAAAAAPAAAAQ05vIGNvbGxhdGVyYWwgbGVmdCB0byByZXR1cm4gKGFscmVhZHkgd2l0aGRyYXduLCBvciBmdWxseSBzbGFzaGVkKS4AAAAAEU5vdGhpbmdUb1dpdGhkcmF3AAAAAAAAEAAAAE1UaGUgcm91bmQgaGFzbid0IHN0YWxsZWQgbG9uZyBlbm91Z2ggZm9yIGEgbm9uLWFkbWluIHRvIHdpbmQgdGhlIGNpcmNsZQpkb3duLgAAAAAAABFUaW1lb3V0Tm90UmVhY2hlZAAAAAAAABEAAAAsVGhlIGNpcmNsZSBpcyBhbHJlYWR5IEZpbmlzaGVkIG9yIENhbmNlbGxlZC4AAAAMQWxyZWFkeUVuZGVkAAAAEg==",
        "AAAABQAAAAAAAAAAAAAABkpvaW5lZAAAAAAAAQAAAAZqb2luZWQAAAAAAAEAAAAAAAAABm1lbWJlcgAAAAAAEwAAAAEAAAAC",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABwAAAAAAAAAAAAAABkNvbmZpZwAAAAAAAAAAAAAAAAAHTWVtYmVycwAAAAAAAAAAAAAAAAVSb3VuZAAAAAAAAAAAAAAAAAAAA1BvdAAAAAAAAAAAP0xlZGdlciBhdCB3aGljaCB0aGUgY3VycmVudCByb3VuZCBiZWdhbiwgZm9yIHRoZSBzdGFsbCB0aW1lb3V0LgAAAAAOUm91bmRTdGFydGVkQXQAAAAAAAEAAAA0V2hldGhlciBgbWVtYmVyYCBoYXMgY29udHJpYnV0ZWQgaW4gYSBnaXZlbiBgcm91bmRgLgAAAAtDb250cmlidXRlZAAAAAACAAAABAAAABMAAAABAAAAbkNvbGxhdGVyYWwgc3RpbGwgaGVsZCBmb3IgYG1lbWJlcmAuIFBvc3RlZCBvbiBqb2luLCBkcmF3biBkb3duIGJ5CmBzbGFzaGAsIGFuZCByZXR1cm5lZCB3aGVuIHRoZSBtZW1iZXIgZXhpdHMuAAAAAAAKQ29sbGF0ZXJhbAAAAAAAAQAAABM=",
        "AAAABQAAAAAAAAAAAAAAB1BhaWRPdXQAAAAAAQAAAAhwYWlkX291dAAAAAMAAAAAAAAACXJlY2lwaWVudAAAAAAAABMAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAAAAAAVyb3VuZAAAAAAAAAQAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAAB1NsYXNoZWQAAAAAAQAAAAdzbGFzaGVkAAAAAAIAAAAAAAAABm1lbWJlcgAAAAAAEwAAAAEAAAAAAAAABXJvdW5kAAAAAAAABAAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAB1N0YXJ0ZWQAAAAAAQAAAAdzdGFydGVkAAAAAAEAAAAAAAAABXJvdW5kAAAAAAAABAAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAACEZpbmlzaGVkAAAAAQAAAAhmaW5pc2hlZAAAAAEAAAAAAAAABnJvdW5kcwAAAAAABAAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAACUNhbmNlbGxlZAAAAAAAAAEAAAAJY2FuY2VsbGVkAAAAAAAAAgAAAAAAAAAFcm91bmQAAAAAAAAEAAAAAAAAAD9UcnVlIHdoZW4gYSBzdGFsbGVkIHJvdW5kIGxldCBhIG5vbi1hZG1pbiB3aW5kIHRoZSBjaXJjbGUgZG93bi4AAAAACmJ5X3RpbWVvdXQAAAAAAAEAAAAAAAAAAg==",
        "AAAAAAAAADdKb2luIHRoZSBjaXJjbGUgKGJlZm9yZSBpdCBzdGFydHMpLCBwb3N0aW5nIGNvbGxhdGVyYWwuAAAAAARqb2luAAAAAQAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAABQAAAAAAAAAAAAAAC0NvbnRyaWJ1dGVkAAAAAAEAAAALY29udHJpYnV0ZWQAAAAAAwAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAAAAAAFcm91bmQAAAAAAAAEAAAAAAAAAAI=",
        "AAAAAQAAAAAAAAAAAAAADENpcmNsZUNvbmZpZwAAAAgAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAARY29sbGF0ZXJhbF9hbW91bnQAAAAAAAALAAAAAAAAABNjb250cmlidXRpb25fYW1vdW50AAAAAAsAAAAAAAAAC21heF9tZW1iZXJzAAAAAAQAAAAAAAAACnJlcHV0YXRpb24AAAAAABMAAADNSG93IGxvbmcgYSByb3VuZCBtYXkgc3RhbGwgYmVmb3JlIGFueW9uZSBjYW4gd2luZCB0aGUgY2lyY2xlIGRvd24uIFRoaXMKaXMgdGhlIGVzY2FwZSBoYXRjaDogd2l0aG91dCBpdCBhbiBhYnNlbnQgYWRtaW4sIG9yIGEgZGVmYXVsdGVyIHdob3NlCmNvbGxhdGVyYWwgaXMgc3BlbnQsIHdvdWxkIHN0cmFuZCBldmVyeW9uZSdzIGZ1bmRzIHBlcm1hbmVudGx5LgAAAAAAABVyb3VuZF90aW1lb3V0X2xlZGdlcnMAAAAAAAAEAAAAAAAAAAZzdGF0dXMAAAAAB9AAAAAMQ2lyY2xlU3RhdHVzAAAAAAAAAAV0b2tlbgAAAAAAABM=",
        "AAAAAgAAAINXaGVyZSB0aGUgY2lyY2xlIGlzIGluIGl0cyBsaWZlY3ljbGUuIENvbGxhdGVyYWwgaXMgb25seSB3aXRoZHJhd2FibGUgb25jZQp0aGUgY2lyY2xlIGhhcyBjb21lIHRvIHJlc3QgKGBGaW5pc2hlZGAgb3IgYENhbmNlbGxlZGApLgAAAAAAAAAADENpcmNsZVN0YXR1cwAAAAQAAAAAAAAARUFjY2VwdGluZyBtZW1iZXJzOyBub2JvZHkgaXMgY29tbWl0dGVkIHlldCwgc28gam9pbmluZyBpcyByZXZlcnNpYmxlLgAAAAAAAARPcGVuAAAAAAAAABNSb3VuZHMgYXJlIHJ1bm5pbmcuAAAAAAZBY3RpdmUAAAAAAAAAAAAjRXZlcnkgbWVtYmVyIGhhcyByZWNlaXZlZCBhIHBheW91dC4AAAAACEZpbmlzaGVkAAAAAAAAAB1Xb3VuZCBkb3duIGJlZm9yZSBjb21wbGV0aW5nLgAAAAAAAAlDYW5jZWxsZWQAAAA=",
        "AAAAAAAAAM1MZWF2ZSBhIGNpcmNsZSB0aGF0IGhhc24ndCBzdGFydGVkIHlldCwgdGFraW5nIHRoZSBjb2xsYXRlcmFsIGJhY2suCk5vdGhpbmcgaXMgYXQgc3Rha2UgYmVmb3JlIHRoZSBmaXJzdCByb3VuZCwgc28gdGhpcyBpcyB1bmNvbmRpdGlvbmFsIOKAlAptZW1iZXJzIGFyZSBuZXZlciBsb2NrZWQgaW4gYnkgYW4gYWRtaW4gd2hvIGRvZXNuJ3QgcHJlc3Mgc3RhcnQuAAAAAAAABWxlYXZlAAAAAAAAAQAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAIRBZG1pbiBzbGFzaGVzIGEgbWVtYmVyIHdobyBkaWRuJ3QgY29udHJpYnV0ZSB0aGlzIHJvdW5kOiB0aGVpciBjb2xsYXRlcmFsCmNvdmVycyB0aGUgbWlzc2VkIGNvbnRyaWJ1dGlvbiBhbmQgdGhlaXIgcmVwdXRhdGlvbiBkcm9wcy4AAAAFc2xhc2gAAAAAAAABAAAAAAAAAAZtZW1iZXIAAAAAABMAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAC5Mb2NrIG1lbWJlcnNoaXAgYW5kIGJlZ2luIHJvdW5kIDEuIEFkbWluIG9ubHkuAAAAAAAFc3RhcnQAAAAAAAAAAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAgZXaW5kIHRoZSBjaXJjbGUgZG93biBhbmQgcmVsZWFzZSBldmVyeW9uZSdzIGNvbGxhdGVyYWwuCgpUaGUgYWRtaW4gbWF5IGRvIHRoaXMgYXQgYW55IHRpbWUgYmVmb3JlIHRoZSBjaXJjbGUgZmluaXNoZXMuIEFueW9uZSBtYXkKZG8gaXQgb25jZSB0aGUgY3VycmVudCByb3VuZCBoYXMgc3RhbGxlZCBwYXN0IGByb3VuZF90aW1lb3V0X2xlZGdlcnNgIOKAlApzbyBhbiBhYnNlbnQgYWRtaW4sIG9yIGEgZGVmYXVsdGVyIHdob3NlIGNvbGxhdGVyYWwgaXMgc3BlbnQgYW5kIHdobyBjYW4KdGhlcmVmb3JlIG5vIGxvbmdlciBiZSBzbGFzaGVkLCBjYW4gbmV2ZXIgc3RyYW5kIHRoZSBtZW1iZXJzJyBmdW5kcy4KClRoZSBjdXJyZW50IHJvdW5kIGlzIHVud291bmQ6IGl0IG5ldmVyIHBhaWQgb3V0LCBzbyBjb250cmlidXRpb25zCihpbmNsdWRpbmcgdGhvc2UgY292ZXJlZCBieSBhIHNsYXNoKSBnbyBiYWNrIHRvIHRoZSBjb250cmlidXRvcnMnCmNvbGxhdGVyYWwgYmFsYW5jZXMsIHJlYWR5IHRvIHdpdGhkcmF3LgAAAAAABmNhbmNlbAAAAAAAAQAAAAAAAAAGY2FsbGVyAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAHZ2V0X3BvdAAAAAAAAAAAAQAAAAs=",
        "AAAAAAAAAAAAAAAJZ2V0X3JvdW5kAAAAAAAAAAAAAAEAAAAE",
        "AAAAAAAAAEZDb250cmlidXRlIHRoZSBmaXhlZCBhbW91bnQgZm9yIHRoZSBjdXJyZW50IHJvdW5kLiBSZXdhcmRzIHJlcHV0YXRpb24uAAAAAAAKY29udHJpYnV0ZQAAAAAAAQAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAKZ2V0X2NvbmZpZwAAAAAAAAAAAAEAAAPpAAAH0AAAAAxDaXJjbGVDb25maWcAAAAD",
        "AAAAAAAAAFdDcmVhdGUgdGhlIGNpcmNsZS4gQ2FsbGVkIG9uY2UgKGJ5IHRoZSBhZG1pbiwgb3IgYnkgdGhlIEZhY3Rvcnkgb24gdGhlCmFkbWluJ3MgYmVoYWxmKS4AAAAACmluaXRpYWxpemUAAAAAAAcAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAApyZXB1dGF0aW9uAAAAAAATAAAAAAAAABNjb250cmlidXRpb25fYW1vdW50AAAAAAsAAAAAAAAAEWNvbGxhdGVyYWxfYW1vdW50AAAAAAAACwAAAAAAAAALbWF4X21lbWJlcnMAAAAABAAAAAAAAAAVcm91bmRfdGltZW91dF9sZWRnZXJzAAAAAAAABAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAEFXaGV0aGVyIGFueW9uZSAobm90IGp1c3QgdGhlIGFkbWluKSBtYXkgbm93IGBjYW5jZWxgIHRoaXMgY2lyY2xlLgAAAAAAAAppc19zdGFsbGVkAAAAAAAAAAAAAQAAA+kAAAABAAAAAw==",
        "AAAAAAAAAAAAAAALZ2V0X21lbWJlcnMAAAAAAAAAAAEAAAPqAAAAEw==",
        "AAAAAAAAAElUaGUgY3VycmVudCByb3VuZCdzIHJlY2lwaWVudCBjbGFpbXMgdGhlIHBvdCwgcm90YXRpbmcgdG8gdGhlIG5leHQgcm91bmQuAAAAAAAADGNsYWltX3BheW91dAAAAAAAAAABAAAD6QAAAAIAAAAD",
        "AAAABQAAAAAAAAAAAAAAE0NvbGxhdGVyYWxXaXRoZHJhd24AAAAAAQAAABRjb2xsYXRlcmFsX3dpdGhkcmF3bgAAAAIAAAAAAAAABm1lbWJlcgAAAAAAEwAAAAEAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAC",
        "AAAAAAAAADNUaGUgbWVtYmVyIHdobyByZWNlaXZlcyB0aGUgcG90IGluIHRoZSBnaXZlbiByb3VuZC4AAAAADWdldF9yZWNpcGllbnQAAAAAAAABAAAAAAAAAAVyb3VuZAAAAAAAAAQAAAABAAAD6QAAABMAAAAD",
        "AAAAAAAAAEhDb2xsYXRlcmFsIHN0aWxsIGhlbGQgZm9yIGEgbWVtYmVyIChwb3N0ZWQgb24gam9pbiwgcmVkdWNlZCBieSBzbGFzaGVzKS4AAAAOZ2V0X2NvbGxhdGVyYWwAAAAAAAEAAAAAAAAABm1lbWJlcgAAAAAAEwAAAAEAAAAL",
        "AAAAAAAAAAAAAAAPaGFzX2NvbnRyaWJ1dGVkAAAAAAIAAAAAAAAABXJvdW5kAAAAAAAABAAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAAAE=",
        "AAAAAAAAAEdUYWtlIGJhY2sgd2hhdGV2ZXIgY29sbGF0ZXJhbCBpcyBsZWZ0IG9uY2UgdGhlIGNpcmNsZSBoYXMgY29tZSB0byByZXN0LgAAAAATd2l0aGRyYXdfY29sbGF0ZXJhbAAAAAABAAAAAAAAAAZtZW1iZXIAAAAAABMAAAABAAAD6QAAAAsAAAAD",
        "AAAAAAAAAEVMZWRnZXIgYXQgd2hpY2ggdGhlIGN1cnJlbnQgcm91bmQgYmVnYW4sIG9uY2UgdGhlIGNpcmNsZSBoYXMgc3RhcnRlZC4AAAAAAAAUZ2V0X3JvdW5kX3N0YXJ0ZWRfYXQAAAAAAAAAAQAAA+gAAAAE" ]),
      options
    )
  }
  public readonly fromJSON = {
    join: this.txFromJSON<Result<void>>,
        leave: this.txFromJSON<Result<void>>,
        slash: this.txFromJSON<Result<void>>,
        start: this.txFromJSON<Result<void>>,
        cancel: this.txFromJSON<Result<void>>,
        get_pot: this.txFromJSON<i128>,
        get_round: this.txFromJSON<u32>,
        contribute: this.txFromJSON<Result<void>>,
        get_config: this.txFromJSON<Result<CircleConfig>>,
        initialize: this.txFromJSON<Result<void>>,
        is_stalled: this.txFromJSON<Result<boolean>>,
        get_members: this.txFromJSON<Array<string>>,
        claim_payout: this.txFromJSON<Result<void>>,
        get_recipient: this.txFromJSON<Result<string>>,
        get_collateral: this.txFromJSON<i128>,
        has_contributed: this.txFromJSON<boolean>,
        withdraw_collateral: this.txFromJSON<Result<i128>>,
        get_round_started_at: this.txFromJSON<Option<u32>>
  }
}