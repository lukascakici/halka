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
  3: {message:"FactoryNotSet"},
  4: {message:"NotAuthorized"}
}

export type DataKey = {tag: "Admin", values: void} | {tag: "Factory", values: void} | {tag: "Authorized", values: readonly [string]} | {tag: "Score", values: readonly [string]};



export interface Client {
  /**
   * Construct and simulate a record transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Record a reputation change for `member`. Callable only by an authorized
   * circle; `reporter` is the calling circle (verified via auth).
   */
  record: ({reporter, member, delta}: {reporter: string, member: string, delta: i64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i64>>>

  /**
   * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Replace this contract's code. Reputation holds scores rather than funds,
   * so an upgrade can fix bugs without putting anyone's money at risk.
   */
  upgrade: ({new_wasm_hash}: {new_wasm_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_score transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_score: ({member}: {member: string}, options?: MethodOptions) => Promise<AssembledTransaction<i64>>

  /**
   * Construct and simulate a set_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Hand the admin role to another account — the route to a multisig or a
   * timelock once the protocol is live.
   */
  set_admin: ({new_admin}: {new_admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the admin account that may configure the Factory.
   */
  initialize: ({admin}: {admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_factory transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Point reputation at the Factory contract that will authorize circles.
   */
  set_factory: ({factory}: {factory: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a is_authorized transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  is_authorized: ({circle}: {circle: string}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a authorize_circle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Authorize a circle to write reputation. Callable only by the Factory.
   */
  authorize_circle: ({circle}: {circle: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

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
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAABAAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAABAAAAAAAAAA5Ob3RJbml0aWFsaXplZAAAAAAAAgAAAAAAAAANRmFjdG9yeU5vdFNldAAAAAAAAAMAAAAAAAAADU5vdEF1dGhvcml6ZWQAAAAAAAAE",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAHRmFjdG9yeQAAAAABAAAAMFdoZXRoZXIgYGNpcmNsZWAgaXMgYWxsb3dlZCB0byB3cml0ZSByZXB1dGF0aW9uLgAAAApBdXRob3JpemVkAAAAAAABAAAAEwAAAAEAAAAdQSBtZW1iZXIncyBhY2N1bXVsYXRlZCBzY29yZS4AAAAAAAAFU2NvcmUAAAAAAAABAAAAEw==",
        "AAAABQAAAAAAAAAAAAAACFJlY29yZGVkAAAAAQAAAAhyZWNvcmRlZAAAAAMAAAAAAAAABm1lbWJlcgAAAAAAEwAAAAEAAAAAAAAABWRlbHRhAAAAAAAABwAAAAAAAAAAAAAABXNjb3JlAAAAAAAABwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAADEFkbWluQ2hhbmdlZAAAAAEAAAANYWRtaW5fY2hhbmdlZAAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAEAAAAC",
        "AAAAAAAAAIVSZWNvcmQgYSByZXB1dGF0aW9uIGNoYW5nZSBmb3IgYG1lbWJlcmAuIENhbGxhYmxlIG9ubHkgYnkgYW4gYXV0aG9yaXplZApjaXJjbGU7IGByZXBvcnRlcmAgaXMgdGhlIGNhbGxpbmcgY2lyY2xlICh2ZXJpZmllZCB2aWEgYXV0aCkuAAAAAAAABnJlY29yZAAAAAAAAwAAAAAAAAAIcmVwb3J0ZXIAAAATAAAAAAAAAAZtZW1iZXIAAAAAABMAAAAAAAAABWRlbHRhAAAAAAAABwAAAAEAAAPpAAAABwAAAAM=",
        "AAAAAAAAAItSZXBsYWNlIHRoaXMgY29udHJhY3QncyBjb2RlLiBSZXB1dGF0aW9uIGhvbGRzIHNjb3JlcyByYXRoZXIgdGhhbiBmdW5kcywKc28gYW4gdXBncmFkZSBjYW4gZml4IGJ1Z3Mgd2l0aG91dCBwdXR0aW5nIGFueW9uZSdzIG1vbmV5IGF0IHJpc2suAAAAAAd1cGdyYWRlAAAAAAEAAAAAAAAADW5ld193YXNtX2hhc2gAAAAAAAPuAAAAIAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAAAAAAAJZ2V0X3Njb3JlAAAAAAAAAQAAAAAAAAAGbWVtYmVyAAAAAAATAAAAAQAAAAc=",
        "AAAAAAAAAGtIYW5kIHRoZSBhZG1pbiByb2xlIHRvIGFub3RoZXIgYWNjb3VudCDigJQgdGhlIHJvdXRlIHRvIGEgbXVsdGlzaWcgb3IgYQp0aW1lbG9jayBvbmNlIHRoZSBwcm90b2NvbCBpcyBsaXZlLgAAAAAJc2V0X2FkbWluAAAAAAAAAQAAAAAAAAAJbmV3X2FkbWluAAAAAAAAEwAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAADVTZXQgdGhlIGFkbWluIGFjY291bnQgdGhhdCBtYXkgY29uZmlndXJlIHRoZSBGYWN0b3J5LgAAAAAAAAppbml0aWFsaXplAAAAAAABAAAAAAAAAAVhZG1pbgAAAAAAABMAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAEVQb2ludCByZXB1dGF0aW9uIGF0IHRoZSBGYWN0b3J5IGNvbnRyYWN0IHRoYXQgd2lsbCBhdXRob3JpemUgY2lyY2xlcy4AAAAAAAALc2V0X2ZhY3RvcnkAAAAAAQAAAAAAAAAHZmFjdG9yeQAAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAANaXNfYXV0aG9yaXplZAAAAAAAAAEAAAAAAAAABmNpcmNsZQAAAAAAEwAAAAEAAAAB",
        "AAAAAAAAAEVBdXRob3JpemUgYSBjaXJjbGUgdG8gd3JpdGUgcmVwdXRhdGlvbi4gQ2FsbGFibGUgb25seSBieSB0aGUgRmFjdG9yeS4AAAAAAAAQYXV0aG9yaXplX2NpcmNsZQAAAAEAAAAAAAAABmNpcmNsZQAAAAAAEwAAAAEAAAPpAAAAAgAAAAM=" ]),
      options
    )
  }
  public readonly fromJSON = {
    record: this.txFromJSON<Result<i64>>,
        upgrade: this.txFromJSON<Result<void>>,
        get_score: this.txFromJSON<i64>,
        set_admin: this.txFromJSON<Result<void>>,
        initialize: this.txFromJSON<Result<void>>,
        set_factory: this.txFromJSON<Result<void>>,
        is_authorized: this.txFromJSON<boolean>,
        authorize_circle: this.txFromJSON<Result<void>>
  }
}