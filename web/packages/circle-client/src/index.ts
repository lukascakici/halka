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
  13: {message:"IsRecipient"}
}


export type DataKey = {tag: "Config", values: void} | {tag: "Members", values: void} | {tag: "Round", values: void} | {tag: "Pot", values: void} | {tag: "Contributed", values: readonly [u32, string]};






export interface CircleConfig {
  admin: string;
  collateral_amount: i128;
  contribution_amount: i128;
  max_members: u32;
  reputation: string;
  started: boolean;
  token: string;
}

export interface Client {
  /**
   * Construct and simulate a join transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Join the circle (before it starts), posting collateral.
   */
  join: ({member}: {member: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

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
  initialize: ({admin, token, reputation, contribution_amount, collateral_amount, max_members}: {admin: string, token: string, reputation: string, contribution_amount: i128, collateral_amount: i128, max_members: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

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
   * Construct and simulate a has_contributed transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  has_contributed: ({round, member}: {round: u32, member: string}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

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
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAADQAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAABAAAAAAAAAA5Ob3RJbml0aWFsaXplZAAAAAAAAgAAAAAAAAANSW52YWxpZFBhcmFtcwAAAAAAAAMAAAAAAAAACkNpcmNsZUZ1bGwAAAAAAAQAAAAAAAAADUFscmVhZHlNZW1iZXIAAAAAAAAFAAAAAAAAAAlOb3RNZW1iZXIAAAAAAAAGAAAAAAAAAApOb3RTdGFydGVkAAAAAAAHAAAAAAAAAA5BbHJlYWR5U3RhcnRlZAAAAAAACAAAAAAAAAASQWxyZWFkeUNvbnRyaWJ1dGVkAAAAAAAJAAAAAAAAAA9Sb3VuZEluY29tcGxldGUAAAAACgAAAAAAAAAMTm90UmVjaXBpZW50AAAACwAAAAAAAAAMTm90RGVmYXVsdGVkAAAADAAAAHZUaGlzIHJvdW5kJ3MgcmVjaXBpZW50IGlzIGV4ZW1wdCDigJQgdGhleSByZWNlaXZlIHRoZSBwb3QsIHNvIHRoZXkgZG9uJ3QKY29udHJpYnV0ZSAoYW5kIGNhbid0IGJlIHNsYXNoZWQpIHRoaXMgcm91bmQuAAAAAAALSXNSZWNpcGllbnQAAAAADQ==",
        "AAAABQAAAAAAAAAAAAAABkpvaW5lZAAAAAAAAQAAAAZqb2luZWQAAAAAAAEAAAAAAAAABm1lbWJlcgAAAAAAEwAAAAEAAAAC",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABQAAAAAAAAAAAAAABkNvbmZpZwAAAAAAAAAAAAAAAAAHTWVtYmVycwAAAAAAAAAAAAAAAAVSb3VuZAAAAAAAAAAAAAAAAAAAA1BvdAAAAAABAAAANFdoZXRoZXIgYG1lbWJlcmAgaGFzIGNvbnRyaWJ1dGVkIGluIGEgZ2l2ZW4gYHJvdW5kYC4AAAALQ29udHJpYnV0ZWQAAAAAAgAAAAQAAAAT",
        "AAAABQAAAAAAAAAAAAAAB1BhaWRPdXQAAAAAAQAAAAhwYWlkX291dAAAAAMAAAAAAAAACXJlY2lwaWVudAAAAAAAABMAAAABAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAAAAAAVyb3VuZAAAAAAAAAQAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAAB1NsYXNoZWQAAAAAAQAAAAdzbGFzaGVkAAAAAAIAAAAAAAAABm1lbWJlcgAAAAAAEwAAAAEAAAAAAAAABXJvdW5kAAAAAAAABAAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAB1N0YXJ0ZWQAAAAAAQAAAAdzdGFydGVkAAAAAAEAAAAAAAAABXJvdW5kAAAAAAAABAAAAAAAAAAC",
        "AAAAAAAAADdKb2luIHRoZSBjaXJjbGUgKGJlZm9yZSBpdCBzdGFydHMpLCBwb3N0aW5nIGNvbGxhdGVyYWwuAAAAAARqb2luAAAAAQAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAABQAAAAAAAAAAAAAAC0NvbnRyaWJ1dGVkAAAAAAEAAAALY29udHJpYnV0ZWQAAAAAAwAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAAAAAAFcm91bmQAAAAAAAAEAAAAAAAAAAI=",
        "AAAAAQAAAAAAAAAAAAAADENpcmNsZUNvbmZpZwAAAAcAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAARY29sbGF0ZXJhbF9hbW91bnQAAAAAAAALAAAAAAAAABNjb250cmlidXRpb25fYW1vdW50AAAAAAsAAAAAAAAAC21heF9tZW1iZXJzAAAAAAQAAAAAAAAACnJlcHV0YXRpb24AAAAAABMAAAAAAAAAB3N0YXJ0ZWQAAAAAAQAAAAAAAAAFdG9rZW4AAAAAAAAT",
        "AAAAAAAAAIRBZG1pbiBzbGFzaGVzIGEgbWVtYmVyIHdobyBkaWRuJ3QgY29udHJpYnV0ZSB0aGlzIHJvdW5kOiB0aGVpciBjb2xsYXRlcmFsCmNvdmVycyB0aGUgbWlzc2VkIGNvbnRyaWJ1dGlvbiBhbmQgdGhlaXIgcmVwdXRhdGlvbiBkcm9wcy4AAAAFc2xhc2gAAAAAAAABAAAAAAAAAAZtZW1iZXIAAAAAABMAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAC5Mb2NrIG1lbWJlcnNoaXAgYW5kIGJlZ2luIHJvdW5kIDEuIEFkbWluIG9ubHkuAAAAAAAFc3RhcnQAAAAAAAAAAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAHZ2V0X3BvdAAAAAAAAAAAAQAAAAs=",
        "AAAAAAAAAAAAAAAJZ2V0X3JvdW5kAAAAAAAAAAAAAAEAAAAE",
        "AAAAAAAAAEZDb250cmlidXRlIHRoZSBmaXhlZCBhbW91bnQgZm9yIHRoZSBjdXJyZW50IHJvdW5kLiBSZXdhcmRzIHJlcHV0YXRpb24uAAAAAAAKY29udHJpYnV0ZQAAAAAAAQAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAKZ2V0X2NvbmZpZwAAAAAAAAAAAAEAAAPpAAAH0AAAAAxDaXJjbGVDb25maWcAAAAD",
        "AAAAAAAAAFdDcmVhdGUgdGhlIGNpcmNsZS4gQ2FsbGVkIG9uY2UgKGJ5IHRoZSBhZG1pbiwgb3IgYnkgdGhlIEZhY3Rvcnkgb24gdGhlCmFkbWluJ3MgYmVoYWxmKS4AAAAACmluaXRpYWxpemUAAAAAAAYAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAApyZXB1dGF0aW9uAAAAAAATAAAAAAAAABNjb250cmlidXRpb25fYW1vdW50AAAAAAsAAAAAAAAAEWNvbGxhdGVyYWxfYW1vdW50AAAAAAAACwAAAAAAAAALbWF4X21lbWJlcnMAAAAABAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAAAAAAALZ2V0X21lbWJlcnMAAAAAAAAAAAEAAAPqAAAAEw==",
        "AAAAAAAAAElUaGUgY3VycmVudCByb3VuZCdzIHJlY2lwaWVudCBjbGFpbXMgdGhlIHBvdCwgcm90YXRpbmcgdG8gdGhlIG5leHQgcm91bmQuAAAAAAAADGNsYWltX3BheW91dAAAAAAAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAADNUaGUgbWVtYmVyIHdobyByZWNlaXZlcyB0aGUgcG90IGluIHRoZSBnaXZlbiByb3VuZC4AAAAADWdldF9yZWNpcGllbnQAAAAAAAABAAAAAAAAAAVyb3VuZAAAAAAAAAQAAAABAAAD6QAAABMAAAAD",
        "AAAAAAAAAAAAAAAPaGFzX2NvbnRyaWJ1dGVkAAAAAAIAAAAAAAAABXJvdW5kAAAAAAAABAAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAAAE=" ]),
      options
    )
  }
  public readonly fromJSON = {
    join: this.txFromJSON<Result<void>>,
        slash: this.txFromJSON<Result<void>>,
        start: this.txFromJSON<Result<void>>,
        get_pot: this.txFromJSON<i128>,
        get_round: this.txFromJSON<u32>,
        contribute: this.txFromJSON<Result<void>>,
        get_config: this.txFromJSON<Result<CircleConfig>>,
        initialize: this.txFromJSON<Result<void>>,
        get_members: this.txFromJSON<Array<string>>,
        claim_payout: this.txFromJSON<Result<void>>,
        get_recipient: this.txFromJSON<Result<string>>,
        has_contributed: this.txFromJSON<boolean>
  }
}