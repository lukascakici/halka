# Deployments

All contracts run on the **Stellar Testnet**. Deploy with
[`scripts/deploy-testnet.sh`](../scripts/deploy-testnet.sh).

## Level 3 — Factory + Reputation + Circle

| Contract | Address |
| --- | --- |
| Factory | `CBYJLPQPQL7SYVKO4QYYQ5H37TYW2PSCRE3ENHHNFPWDGT7Q6FFGCTOH` |
| Reputation | `CD65FDOB75TYWGEDCJKAJW7TQWTRANXI5O43LMOQCMS5ZZN5RNDRWF3L` |
| Token (native XLM SAC) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Circle wasm hash | `29f2f2007bbc73ccb8bcb06ce31d95031a9c0eee0cfdc6b9384d62628a24e9f1` |

The Factory deploys `Circle` instances from the Circle wasm hash and authorizes
each one in the Reputation contract (inter-contract communication, verified
on-chain). Each round's recipient is exempt from contributing (classic ROSCA
mechanics). Example circle created via the Factory:
`CDTCJQSERWYKGQLHFBC5OCDOPSH7DLR4CQ4T6JAUQPKQNGQDUC7SHTGD`.

- Factory explorer: https://stellar.expert/explorer/testnet/contract/CBYJLPQPQL7SYVKO4QYYQ5H37TYW2PSCRE3ENHHNFPWDGT7Q6FFGCTOH
- Reputation explorer: https://stellar.expert/explorer/testnet/contract/CD65FDOB75TYWGEDCJKAJW7TQWTRANXI5O43LMOQCMS5ZZN5RNDRWF3L

## Level 2 — Standalone Circle (legacy)

| Item | Value |
| --- | --- |
| Circle contract | `CBMYN4H5BTMLRPZUZBMPT4FKHL7BNAC5P2I4JLHUDTYA4FB46NCTLKLT` |
| Deploy tx | `d6d5f9da7024fe884833148afa6f53006364d76a25de2be619df9ea4c329a5e4` |

The Level 2 circle was a single standalone instance; Level 3 supersedes it with
the Factory model.
