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


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CBMYN4H5BTMLRPZUZBMPT4FKHL7BNAC5P2I4JLHUDTYA4FB46NCTLKLT",
  }
} as const

export const Errors = {
  1: {message:"AlreadyInitialized"},
  2: {message:"NotInitialized"},
  3: {message:"InvalidParams"},
  4: {message:"CircleFull"},
  5: {message:"AlreadyMember"},
  6: {message:"NotMember"},
  7: {message:"NotStarted"},
  8: {message:"AlreadyStarted"},
  9: {message:"AlreadyContributed"}
}


export type DataKey = {tag: "Config", values: void} | {tag: "Members", values: void} | {tag: "Round", values: void} | {tag: "Pot", values: void} | {tag: "Contributed", values: readonly [u32, string]};





export interface CircleConfig {
  admin: string;
  contribution_amount: i128;
  max_members: u32;
  started: boolean;
  token: string;
}

export interface Client {
  /**
   * Construct and simulate a join transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Join the circle while it is still open (before it starts).
   */
  join: ({member}: {member: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

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
   * Contribute the fixed amount for the current round.
   * Transfers tokens from the member into the contract's pot.
   */
  contribute: ({member}: {member: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_config: (options?: MethodOptions) => Promise<AssembledTransaction<Result<CircleConfig>>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create the circle. Must be called once by the admin.
   */
  initialize: ({admin, token, contribution_amount, max_members}: {admin: string, token: string, contribution_amount: i128, max_members: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_members transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_members: (options?: MethodOptions) => Promise<AssembledTransaction<Array<string>>>

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
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACQAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAABAAAAAAAAAA5Ob3RJbml0aWFsaXplZAAAAAAAAgAAAAAAAAANSW52YWxpZFBhcmFtcwAAAAAAAAMAAAAAAAAACkNpcmNsZUZ1bGwAAAAAAAQAAAAAAAAADUFscmVhZHlNZW1iZXIAAAAAAAAFAAAAAAAAAAlOb3RNZW1iZXIAAAAAAAAGAAAAAAAAAApOb3RTdGFydGVkAAAAAAAHAAAAAAAAAA5BbHJlYWR5U3RhcnRlZAAAAAAACAAAAAAAAAASQWxyZWFkeUNvbnRyaWJ1dGVkAAAAAAAJ",
        "AAAABQAAAAAAAAAAAAAABkpvaW5lZAAAAAAAAQAAAAZqb2luZWQAAAAAAAEAAAAAAAAABm1lbWJlcgAAAAAAEwAAAAEAAAAC",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABQAAAAAAAAAAAAAABkNvbmZpZwAAAAAAAAAAAAAAAAAHTWVtYmVycwAAAAAAAAAAAAAAAAVSb3VuZAAAAAAAAAAAAAAAAAAAA1BvdAAAAAABAAAANFdoZXRoZXIgYG1lbWJlcmAgaGFzIGNvbnRyaWJ1dGVkIGluIGEgZ2l2ZW4gYHJvdW5kYC4AAAALQ29udHJpYnV0ZWQAAAAAAgAAAAQAAAAT",
        "AAAABQAAAAAAAAAAAAAAB1N0YXJ0ZWQAAAAAAQAAAAdzdGFydGVkAAAAAAEAAAAAAAAABXJvdW5kAAAAAAAABAAAAAAAAAAC",
        "AAAAAAAAADpKb2luIHRoZSBjaXJjbGUgd2hpbGUgaXQgaXMgc3RpbGwgb3BlbiAoYmVmb3JlIGl0IHN0YXJ0cykuAAAAAAAEam9pbgAAAAEAAAAAAAAABm1lbWJlcgAAAAAAEwAAAAEAAAPpAAAAAgAAAAM=",
        "AAAABQAAAAAAAAAAAAAAC0NvbnRyaWJ1dGVkAAAAAAEAAAALY29udHJpYnV0ZWQAAAAAAwAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAAAAAAFcm91bmQAAAAAAAAEAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAAC0luaXRpYWxpemVkAAAAAAEAAAALaW5pdGlhbGl6ZWQAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAQAAAAI=",
        "AAAAAQAAAAAAAAAAAAAADENpcmNsZUNvbmZpZwAAAAUAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAATY29udHJpYnV0aW9uX2Ftb3VudAAAAAALAAAAAAAAAAttYXhfbWVtYmVycwAAAAAEAAAAAAAAAAdzdGFydGVkAAAAAAEAAAAAAAAABXRva2VuAAAAAAAAEw==",
        "AAAAAAAAAC5Mb2NrIG1lbWJlcnNoaXAgYW5kIGJlZ2luIHJvdW5kIDEuIEFkbWluIG9ubHkuAAAAAAAFc3RhcnQAAAAAAAAAAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAHZ2V0X3BvdAAAAAAAAAAAAQAAAAs=",
        "AAAAAAAAAAAAAAAJZ2V0X3JvdW5kAAAAAAAAAAAAAAEAAAAE",
        "AAAAAAAAAGxDb250cmlidXRlIHRoZSBmaXhlZCBhbW91bnQgZm9yIHRoZSBjdXJyZW50IHJvdW5kLgpUcmFuc2ZlcnMgdG9rZW5zIGZyb20gdGhlIG1lbWJlciBpbnRvIHRoZSBjb250cmFjdCdzIHBvdC4AAAAKY29udHJpYnV0ZQAAAAAAAQAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAKZ2V0X2NvbmZpZwAAAAAAAAAAAAEAAAPpAAAH0AAAAAxDaXJjbGVDb25maWcAAAAD",
        "AAAAAAAAADRDcmVhdGUgdGhlIGNpcmNsZS4gTXVzdCBiZSBjYWxsZWQgb25jZSBieSB0aGUgYWRtaW4uAAAACmluaXRpYWxpemUAAAAAAAQAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAABNjb250cmlidXRpb25fYW1vdW50AAAAAAsAAAAAAAAAC21heF9tZW1iZXJzAAAAAAQAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAAAAAAALZ2V0X21lbWJlcnMAAAAAAAAAAAEAAAPqAAAAEw==",
        "AAAAAAAAAAAAAAAPaGFzX2NvbnRyaWJ1dGVkAAAAAAIAAAAAAAAABXJvdW5kAAAAAAAABAAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAAAE=" ]),
      options
    )
  }
  public readonly fromJSON = {
    join: this.txFromJSON<Result<void>>,
        start: this.txFromJSON<Result<void>>,
        get_pot: this.txFromJSON<i128>,
        get_round: this.txFromJSON<u32>,
        contribute: this.txFromJSON<Result<void>>,
        get_config: this.txFromJSON<Result<CircleConfig>>,
        initialize: this.txFromJSON<Result<void>>,
        get_members: this.txFromJSON<Array<string>>,
        has_contributed: this.txFromJSON<boolean>
  }
}