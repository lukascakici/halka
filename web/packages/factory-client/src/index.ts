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
  3: {message:"InvalidParams"}
}

export type DataKey = {tag: "Admin", values: void} | {tag: "Reputation", values: void} | {tag: "Token", values: void} | {tag: "CircleWasm", values: void} | {tag: "Count", values: void} | {tag: "Circles", values: void};




export interface Client {
  /**
   * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Replace this contract's code. The factory only deploys and indexes
   * circles — it never custodies member funds — so upgrading it cannot
   * touch money already committed to a circle.
   */
  upgrade: ({new_wasm_hash}: {new_wasm_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a set_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Hand the admin role to another account — the route to a multisig or a
   * timelock once the protocol is live.
   */
  set_admin: ({new_admin}: {new_admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Configure the factory with the shared reputation contract, the
   * contribution token, and the Circle wasm hash to deploy.
   */
  initialize: ({admin, reputation, token, circle_wasm}: {admin: string, reputation: string, token: string, circle_wasm: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a list_circles transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  list_circles: (options?: MethodOptions) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a create_circle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deploy a new circle, initialize it, and authorize it in reputation.
   */
  create_circle: ({creator, contribution_amount, collateral_amount, max_members, round_timeout_ledgers}: {creator: string, contribution_amount: i128, collateral_amount: i128, max_members: u32, round_timeout_ledgers: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a get_circle_wasm transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_circle_wasm: (options?: MethodOptions) => Promise<AssembledTransaction<Result<Buffer>>>

  /**
   * Construct and simulate a set_circle_wasm transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Point the factory at a new Circle wasm. Circles already deployed keep
   * running the code their members agreed to — this only affects circles
   * created from here on.
   */
  set_circle_wasm: ({wasm}: {wasm: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_circle_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_circle_count: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

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
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAAwAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAABAAAAAAAAAA5Ob3RJbml0aWFsaXplZAAAAAAAAgAAAAAAAAANSW52YWxpZFBhcmFtcwAAAAAAAAM=",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABgAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAKUmVwdXRhdGlvbgAAAAAAAAAAAAAAAAAFVG9rZW4AAAAAAAAAAAAAAAAAAApDaXJjbGVXYXNtAAAAAAAAAAAAAAAAAAVDb3VudAAAAAAAAAAAAAAAAAAAB0NpcmNsZXMA",
        "AAAABQAAAAAAAAAAAAAADEFkbWluQ2hhbmdlZAAAAAEAAAANYWRtaW5fY2hhbmdlZAAAAAAAAAEAAAAAAAAABWFkbWluAAAAAAAAEwAAAAEAAAAC",
        "AAAABQAAAAAAAAAAAAAADUNpcmNsZUNyZWF0ZWQAAAAAAAABAAAADmNpcmNsZV9jcmVhdGVkAAAAAAACAAAAAAAAAAdjcmVhdG9yAAAAABMAAAABAAAAAAAAAAZjaXJjbGUAAAAAABMAAAABAAAAAg==",
        "AAAAAAAAALRSZXBsYWNlIHRoaXMgY29udHJhY3QncyBjb2RlLiBUaGUgZmFjdG9yeSBvbmx5IGRlcGxveXMgYW5kIGluZGV4ZXMKY2lyY2xlcyDigJQgaXQgbmV2ZXIgY3VzdG9kaWVzIG1lbWJlciBmdW5kcyDigJQgc28gdXBncmFkaW5nIGl0IGNhbm5vdAp0b3VjaCBtb25leSBhbHJlYWR5IGNvbW1pdHRlZCB0byBhIGNpcmNsZS4AAAAHdXBncmFkZQAAAAABAAAAAAAAAA1uZXdfd2FzbV9oYXNoAAAAAAAD7gAAACAAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAPpAAAAEwAAAAM=",
        "AAAAAAAAAGtIYW5kIHRoZSBhZG1pbiByb2xlIHRvIGFub3RoZXIgYWNjb3VudCDigJQgdGhlIHJvdXRlIHRvIGEgbXVsdGlzaWcgb3IgYQp0aW1lbG9jayBvbmNlIHRoZSBwcm90b2NvbCBpcyBsaXZlLgAAAAAJc2V0X2FkbWluAAAAAAAAAQAAAAAAAAAJbmV3X2FkbWluAAAAAAAAEwAAAAEAAAPpAAAAAgAAAAM=",
        "AAAABQAAAAAAAAAAAAAAEUNpcmNsZVdhc21DaGFuZ2VkAAAAAAAAAQAAABNjaXJjbGVfd2FzbV9jaGFuZ2VkAAAAAAEAAAAAAAAABHdhc20AAAPuAAAAIAAAAAAAAAAC",
        "AAAAAAAAAHZDb25maWd1cmUgdGhlIGZhY3Rvcnkgd2l0aCB0aGUgc2hhcmVkIHJlcHV0YXRpb24gY29udHJhY3QsIHRoZQpjb250cmlidXRpb24gdG9rZW4sIGFuZCB0aGUgQ2lyY2xlIHdhc20gaGFzaCB0byBkZXBsb3kuAAAAAAAKaW5pdGlhbGl6ZQAAAAAABAAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAApyZXB1dGF0aW9uAAAAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAAC2NpcmNsZV93YXNtAAAAA+4AAAAgAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAMbGlzdF9jaXJjbGVzAAAAAAAAAAEAAAPqAAAAEw==",
        "AAAAAAAAAENEZXBsb3kgYSBuZXcgY2lyY2xlLCBpbml0aWFsaXplIGl0LCBhbmQgYXV0aG9yaXplIGl0IGluIHJlcHV0YXRpb24uAAAAAA1jcmVhdGVfY2lyY2xlAAAAAAAABQAAAAAAAAAHY3JlYXRvcgAAAAATAAAAAAAAABNjb250cmlidXRpb25fYW1vdW50AAAAAAsAAAAAAAAAEWNvbGxhdGVyYWxfYW1vdW50AAAAAAAACwAAAAAAAAALbWF4X21lbWJlcnMAAAAABAAAAAAAAAAVcm91bmRfdGltZW91dF9sZWRnZXJzAAAAAAAABAAAAAEAAAPpAAAAEwAAAAM=",
        "AAAAAAAAAAAAAAAPZ2V0X2NpcmNsZV93YXNtAAAAAAAAAAABAAAD6QAAA+4AAAAgAAAAAw==",
        "AAAAAAAAAKJQb2ludCB0aGUgZmFjdG9yeSBhdCBhIG5ldyBDaXJjbGUgd2FzbS4gQ2lyY2xlcyBhbHJlYWR5IGRlcGxveWVkIGtlZXAKcnVubmluZyB0aGUgY29kZSB0aGVpciBtZW1iZXJzIGFncmVlZCB0byDigJQgdGhpcyBvbmx5IGFmZmVjdHMgY2lyY2xlcwpjcmVhdGVkIGZyb20gaGVyZSBvbi4AAAAAAA9zZXRfY2lyY2xlX3dhc20AAAAAAQAAAAAAAAAEd2FzbQAAA+4AAAAgAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAQZ2V0X2NpcmNsZV9jb3VudAAAAAAAAAABAAAABA==" ]),
      options
    )
  }
  public readonly fromJSON = {
    upgrade: this.txFromJSON<Result<void>>,
        get_admin: this.txFromJSON<Result<string>>,
        set_admin: this.txFromJSON<Result<void>>,
        initialize: this.txFromJSON<Result<void>>,
        list_circles: this.txFromJSON<Array<string>>,
        create_circle: this.txFromJSON<Result<string>>,
        get_circle_wasm: this.txFromJSON<Result<Buffer>>,
        set_circle_wasm: this.txFromJSON<Result<void>>,
        get_circle_count: this.txFromJSON<u32>
  }
}