# Deployments

All contracts run on the **Stellar Testnet**. Deploy with
[`scripts/deploy-testnet.sh`](../scripts/deploy-testnet.sh).

## Level 3 — Factory + Reputation + Circle

| Contract | Address |
| --- | --- |
| Factory | `CCJHQ2WNT6BBT2VDQAE7WLK5ME3JLP6AK6FIOGQNQATSAJCKZFH5554P` |
| Reputation | `CD65FDOB75TYWGEDCJKAJW7TQWTRANXI5O43LMOQCMS5ZZN5RNDRWF3L` |
| Token (native XLM SAC) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Circle wasm hash | `e38933352b4509f0d07126c90b7e305cd050edcc660e02da73930f75b9a40f23` |

The Factory deploys `Circle` instances from the Circle wasm hash and authorizes
each one in the Reputation contract (inter-contract communication, verified
on-chain). Example circle created via the Factory:
`CDJDOHVF2CADUGSDSPVZ4C7IQ56XYQ54N3CR3465GBX3K6JTHK5QGL6Q`.

- Factory explorer: https://stellar.expert/explorer/testnet/contract/CCJHQ2WNT6BBT2VDQAE7WLK5ME3JLP6AK6FIOGQNQATSAJCKZFH5554P
- Reputation explorer: https://stellar.expert/explorer/testnet/contract/CD65FDOB75TYWGEDCJKAJW7TQWTRANXI5O43LMOQCMS5ZZN5RNDRWF3L

## Level 2 — Standalone Circle (legacy)

| Item | Value |
| --- | --- |
| Circle contract | `CBMYN4H5BTMLRPZUZBMPT4FKHL7BNAC5P2I4JLHUDTYA4FB46NCTLKLT` |
| Deploy tx | `d6d5f9da7024fe884833148afa6f53006364d76a25de2be619df9ea4c329a5e4` |

The Level 2 circle was a single standalone instance; Level 3 supersedes it with
the Factory model.
