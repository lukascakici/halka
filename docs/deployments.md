# Deployments

All contracts run on the **Stellar Testnet**. Deploy with
[`scripts/deploy-testnet.sh`](../scripts/deploy-testnet.sh).

## Current — Factory + Reputation + Circle (fund-safety revision)

| Contract | Address |
| --- | --- |
| Factory | `CCQAHHQJ2SHRZH34CZ5S3REQECIPAOKA3ALCUK6Y3V5WOQM2I67RR53Y` |
| Reputation | `CCZT5YSIKH2CXMOKNZUI7VPPN7ZZRBE2C37E7NLUFCFQOWAPG6YLD2WF` |
| Token (native XLM SAC) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Circle wasm hash | `041e8895c77675c2a0fce4d0d78349993e084112ba5445f44aa8831599623c06` |

The Factory deploys `Circle` instances from the Circle wasm hash and authorizes
each one in the Reputation contract (inter-contract communication, verified
on-chain). Each round's recipient is exempt from contributing (classic ROSCA
mechanics).

- Factory explorer: https://stellar.expert/explorer/testnet/contract/CCQAHHQJ2SHRZH34CZ5S3REQECIPAOKA3ALCUK6Y3V5WOQM2I67RR53Y
- Reputation explorer: https://stellar.expert/explorer/testnet/contract/CCZT5YSIKH2CXMOKNZUI7VPPN7ZZRBE2C37E7NLUFCFQOWAPG6YLD2WF

This deployment replaces the Level 3 one below. Collateral is now tracked per
member, members can leave an open circle, collateral is withdrawable once a
circle finishes or is wound down, and a stalled round can be wound down by any
member after `round_timeout_ledgers`. Factory and Reputation are upgradeable;
Circle deliberately is not.

### Superseded — Level 3

| Contract | Address |
| --- | --- |
| Factory | `CBYJLPQPQL7SYVKO4QYYQ5H37TYW2PSCRE3ENHHNFPWDGT7Q6FFGCTOH` |
| Reputation | `CD65FDOB75TYWGEDCJKAJW7TQWTRANXI5O43LMOQCMS5ZZN5RNDRWF3L` |
| Circle wasm hash | `29f2f2007bbc73ccb8bcb06ce31d95031a9c0eee0cfdc6b9384d62628a24e9f1` |

Circles created through this Factory are still on-chain but are not listed by
the app, and collateral posted to them cannot be recovered — that is the bug
the current deployment fixes. Example circle:
`CDTCJQSERWYKGQLHFBC5OCDOPSH7DLR4CQ4T6JAUQPKQNGQDUC7SHTGD`.

## Level 2 — Standalone Circle (legacy)

| Item | Value |
| --- | --- |
| Circle contract | `CBMYN4H5BTMLRPZUZBMPT4FKHL7BNAC5P2I4JLHUDTYA4FB46NCTLKLT` |
| Deploy tx | `d6d5f9da7024fe884833148afa6f53006364d76a25de2be619df9ea4c329a5e4` |

The Level 2 circle was a single standalone instance; Level 3 supersedes it with
the Factory model.
