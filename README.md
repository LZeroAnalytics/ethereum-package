# Bloctopus Ethereum Package

This project is a fork of the ethpandaops [Ethereum Package](https://github.com/ethpandaops/ethereum-package).

It is fully synced with the original ethereum package and provides the same capabilities. Additionally, this package adds additional features. Specifically, it enables:

- Fork any public EVM-based network (using a custom Reth client)
- A faucet for ETH and USDC (refer to the [docs](https://github.com/LZeroAnalytics/ethereum-faucet))
- A fully functional Uniswap interface (requires forking, only available in cloud environments)
- Blockscout explorer (only available in cloud environments)

## Quickstart

1. [Install Docker & start the Docker Daemon if you haven't done so already][docker-installation]
2. [Install the Kurtosis CLI, or upgrade it to the latest version if it's already installed][kurtosis-cli-installation]
3. Run the package with default configurations from the command line:

   ```bash
   kurtosis run --enclave my-testnet github.com/LZeroAnalytics/ethereum-package
   ```

#### Run with your own configuration

Kurtosis packages are parameterizable, meaning you can customize your network and its behavior to suit your needs by storing parameters in a file that you can pass in at runtime like so:

```bash
kurtosis run --enclave my-testnet github.com/LZeroAnalytics/ethereum-package --args-file network_params.yaml
```

Where `network_params.yaml` contains the parameters for your network in your home directory.


#### Tear down

The testnet will reside in an [enclave][enclave] - an isolated, ephemeral environment. The enclave and its contents (e.g. running containers, files artifacts, etc) will persist until torn down. You can remove an enclave and its contents with:

```bash
kurtosis enclave rm -f my-testnet
```

## Management

The [Kurtosis CLI](https://docs.kurtosis.com/cli) can be used to inspect and interact with the network.

For example, if you need shell access, simply run:

```bash
kurtosis service shell my-testnet $SERVICE_NAME
```

And if you need the logs for a service, simply run:

```bash
kurtosis service logs my-testnet $SERVICE_NAME
```

Check out the full list of CLI commands [here](https://docs.kurtosis.com/cli)

## Debugging

To grab the genesis files for the network, simply run:

```bash
kurtosis files download my-testnet $FILE_NAME $OUTPUT_DIRECTORY
```

For example, to retrieve the Execution Layer (EL) genesis data, run:

```bash
kurtosis files download my-testnet el-genesis-data ~/Downloads
```

## Configuration

To configure the package behaviour, you can modify your `network_params.yaml` file. Below is an example of a
configuration that uses the additional features available in this package:

```yaml
participants:
  - el_type: reth
    el_image: tiljordan/reth-forking:1.0.0
    el_extra_env_vars:
      FORKING_RPC_URL: <FORKING URL> # e.g. Alchemy endpoint
      FORKING_BLOCK_HEIGHT: "latest" # Specify any previous block height
    cl_type: lighthouse
network_params:
  prefunded_accounts: '{"0xe1A74e1FCB254CB1e5eb1245eaAe034A4D7dD538": {"balance": "1000000000ETH"}}'
faucet_params:
  private_key: 1cdf65ac75f477650040ebe272ddaffb6735dcf55bd651869963ada71944e6db # Needs to be a prefunded account
blockscout_params:
  backend_url: <BLOCKSCOUT BACKEND URL> # URL at which the blockscout backend will be available
  frontend_url: <BLOCKSCOUT FRONTEND URL> # URL at which the blockscout frontend will be available
uniswap_params:
  backend_url: <UNISWAP BACKEND URL> # URL at which the backend service will be available

additional_services:
  - faucet
  - blockscout
  - uniswap

```

The full YAML schema that can be passed in is as follows with the defaults provided:

```yaml
# Specification of the participants in the network
participants:
  # EL(Execution Layer) Specific flags
    # The type of EL client that should be started
    # Valid values are geth, nethermind, erigon, besu, ethereumjs, reth, nimbus-eth1
  - el_type: geth

    # The Docker image that should be used for the EL client; leave blank to use the default for the client type
    # Defaults by client:
    # - geth: ethereum/client-go:latest
    # - erigon: ethpandaops/erigon:main
    # - nethermind: nethermind/nethermind:latest
    # - besu: hyperledger/besu:develop
    # - reth: ghcr.io/paradigmxyz/reth
    # - ethereumjs: ethpandaops/ethereumjs:master
    # - nimbus-eth1: ethpandaops/nimbus-eth1:master
    # If you want to use forking capabilities use:
    # - tiljordan/reth-forking:1.0.0
    el_image: ""

    # The log level string that this participant's EL client should log at
    # If this is emptystring then the global `logLevel` parameter's value will be translated into a string appropriate for the client (e.g. if
    # global `logLevel` = `info` then Geth would receive `3`, Besu would receive `INFO`, etc.)
    # If this is not emptystring, then this value will override the global `logLevel` setting to allow for fine-grained control
    # over a specific participant's logging
    el_log_level: ""

    # A list of optional extra env_vars the el container should spin up with
    el_extra_env_vars: {}

    # A list of optional extra labels the el container should spin up with
    # Example; el_extra_labels: {"ethereum-package.partition": "1"}
    el_extra_labels: {}

    # A list of optional extra params that will be passed to the EL client container for modifying its behaviour
    el_extra_params: []

    # A list of tolerations that will be passed to the EL client container
    # Only works with Kubernetes
    # Example: el_tolerations:
    # - key: "key"
    #   operator: "Equal"
    #   value: "value"
    #   effect: "NoSchedule"
    #   toleration_seconds: 3600
    # Defaults to empty
    el_tolerations: []

    # Persistent storage size for the EL client container (in MB)
    # Defaults to 0, which means that the default size for the client will be used
    # Default values can be found in /src/package_io/constants.star VOLUME_SIZE
    el_volume_size: 0

    # Resource management for el containers
    # CPU is milicores
    # RAM is in MB
    # Defaults to 0, which results in no resource limits
    el_min_cpu: 0
    el_max_cpu: 0
    el_min_mem: 0
    el_max_mem: 0

  # CL(Consensus Layer) Specific flags
    # The type of CL client that should be started
    # Valid values are nimbus, lighthouse, lodestar, teku, prysm, and grandine
    cl_type: lighthouse

    # The Docker image that should be used for the CL client; leave blank to use the default for the client type
    # Defaults by client:
    # - lighthouse: sigp/lighthouse:latest
    # - teku: consensys/teku:latest
    # - nimbus: statusim/nimbus-eth2:multiarch-latest
    # - prysm: gcr.io/prysmaticlabs/prysm/beacon-chain:latest
    # - lodestar: chainsafe/lodestar:next
    # - grandine: sifrai/grandine:stable
    cl_image: ""

    # The log level string that this participant's CL client should log at
    # If this is emptystring then the global `logLevel` parameter's value will be translated into a string appropriate for the client (e.g. if
    # global `logLevel` = `info` then Teku would receive `INFO`, Prysm would receive `info`, etc.)
    # If this is not emptystring, then this value will override the global `logLevel` setting to allow for fine-grained control
    # over a specific participant's logging
    cl_log_level: ""

    # A list of optional extra env_vars the cl container should spin up with
    cl_extra_env_vars: {}

    # A list of optional extra labels that will be passed to the CL client Beacon container.
    # Example; cl_extra_labels: {"ethereum-package.partition": "1"}
    cl_extra_labels: {}

    # A list of optional extra params that will be passed to the CL client Beacon container for modifying its behaviour
    # If the client combines the Beacon & validator nodes (e.g. Teku, Nimbus), then this list will be passed to the combined Beacon-validator node
    cl_extra_params: []

    # A list of tolerations that will be passed to the CL client container
    # Only works with Kubernetes
    # Example: el_tolerations:
    # - key: "key"
    #   operator: "Equal"
    #   value: "value"
    #   effect: "NoSchedule"
    #   toleration_seconds: 3600
    # Defaults to empty
    cl_tolerations: []

    # Persistent storage size for the CL client container (in MB)
    # Defaults to 0, which means that the default size for the client will be used
    # Default values can be found in /src/package_io/constants.star VOLUME_SIZE
    cl_volume_size: 0

    # Resource management for cl containers
    # CPU is milicores
    # RAM is in MB
    # Defaults to 0, which results in no resource limits
    cl_min_cpu: 0
    cl_max_cpu: 0
    cl_min_mem: 0
    cl_max_mem: 0

    # Whether to act as a supernode for the network
    # Supernodes will subscribe to all subnet topics
    # This flag should only be used with peerdas
    # Defaults to false
    supernode: false

    # Whether to use a separate validator client attached to the CL client.
    # Defaults to false for clients that can run both in one process (Teku, Nimbus)
    use_separate_vc: true

  # VC (Validator Client) Specific flags
    # The type of validator client that should be used
    # Valid values are nimbus, lighthouse, lodestar, teku, prysm and vero
    # ( The prysm validator only works with a prysm CL client )
    # Defaults to matching the chosen CL client (cl_type)
    vc_type: ""

    # The Docker image that should be used for the separate validator client
    # Defaults by client:
    # - lighthouse: sigp/lighthouse:latest
    # - lodestar: chainsafe/lodestar:latest
    # - nimbus: statusim/nimbus-validator-client:multiarch-latest
    # - prysm: gcr.io/prysmaticlabs/prysm/validator:latest
    # - teku: consensys/teku:latest
    # - vero: ghcr.io/serenita-org/vero:master
    vc_image: ""

    # The log level string that this participant's validator client should log at
    # If this is emptystring then the global `logLevel` parameter's value will be translated into a string appropriate for the client (e.g. if
    # global `logLevel` = `info` then Teku would receive `INFO`, Prysm would receive `info`, etc.)
    # If this is not emptystring, then this value will override the global `logLevel` setting to allow for fine-grained control
    # over a specific participant's logging
    vc_log_level: ""

    # A list of optional extra env_vars the vc container should spin up with
    vc_extra_env_vars: {}

    # A list of optional extra labels that will be passed to the validator client validator container.
    # Example; vc_extra_labels: {"ethereum-package.partition": "1"}
    vc_extra_labels: {}

    # A list of optional extra params that will be passed to the validator client container for modifying its behaviour
    # If the client combines the Beacon & validator nodes (e.g. Teku, Nimbus), then this list will also be passed to the combined Beacon-validator node
    vc_extra_params: []

    # A list of tolerations that will be passed to the validator container
    # Only works with Kubernetes
    # Example: el_tolerations:
    # - key: "key"
    #   operator: "Equal"
    #   value: "value"
    #   effect: "NoSchedule"
    #   toleration_seconds: 3600
    # Defaults to empty
    vc_tolerations: []

    # Resource management for vc containers
    # CPU is milicores
    # RAM is in MB
    # Defaults to 0, which results in no resource limits
    vc_min_cpu: 0
    vc_max_cpu: 0
    vc_min_mem: 0
    vc_max_mem: 0

    # Count of the number of validators you want to run for a given participant
    # Default to null, which means that the number of validators will be using the
    # network parameter num_validator_keys_per_node
    validator_count: null

    # Whether to use a remote signer instead of the vc directly handling keys
    # Note Lighthouse VC does not support this flag
    # Defaults to false
    use_remote_signer: false

  # Remote signer Specific flags
    # The type of remote signer that should be used
    # Valid values are web3signer
    # Defaults to web3signer
    remote_signer_type: "web3signer"

    # The Docker image that should be used for the remote signer
    # Defaults to "consensys/web3signer:latest"
    remote_signer_image: "consensys/web3signer:latest"

    # A list of optional extra env_vars the remote signer container should spin up with
    remote_signer_extra_env_vars: {}

    # A list of optional extra labels that will be passed to the remote signer container.
    # Example; remote_signer_extra_labels: {"ethereum-package.partition": "1"}
    remote_signer_extra_labels: {}

    # A list of optional extra params that will be passed to the remote signer container for modifying its behaviour
    remote_signer_extra_params: []

    # A list of tolerations that will be passed to the remote signer container
    # Only works with Kubernetes
    # Example: remote_signer_tolerations:
    # - key: "key"
    #   operator: "Equal"
    #   value: "value"
    #   effect: "NoSchedule"
    #   toleration_seconds: 3600
    # Defaults to empty
    remote_signer_tolerations: []

    # Resource management for remote signer containers
    # CPU is milicores
    # RAM is in MB
    # Defaults to 0, which results in no resource limits
    remote_signer_min_cpu: 0
    remote_signer_max_cpu: 0
    remote_signer_min_mem: 0
    remote_signer_max_mem: 0

  # Participant specific flags
    # Node selector
    # Only works with Kubernetes
    # Example: node_selectors: { "disktype": "ssd" }
    # Defaults to empty
    node_selectors: {}

    # A list of tolerations that will be passed to the EL/CL/validator containers
    # This is to be used when you don't want to specify the tolerations for each container separately
    # Only works with Kubernetes
    # Example: tolerations:
    # - key: "key"
    #   operator: "Equal"
    #   value: "value"
    #   effect: "NoSchedule"
    #   toleration_seconds: 3600
    # Defaults to empty
    tolerations: []

    # Count of nodes to spin up for this participant
    # Default to 1
    count: 1

    # Snooper local flag for a participant.
    # Snooper can be enabled with the `snooper_enabled` flag per client or globally
    # Snooper dumps all JSON-RPC requests and responses including BeaconAPI, EngineAPI and ExecutionAPI.
    # Default to null
    snooper_enabled: null

    # Enables Ethereum Metrics Exporter for this participant. Can be set globally.
    # Defaults null and then set to global ethereum_metrics_exporter_enabled (false)
    ethereum_metrics_exporter_enabled: null

    # Enables Xatu Sentry for this participant. Can be set globally.
    # Defaults null and then set to global xatu_sentry_enabled (false)
    xatu_sentry_enabled: null

    # Prometheus additional configuration for a given participant prometheus target.
    # Execution, beacon and validator client targets on prometheus will include this
    # configuration.
    prometheus_config:
      # Scrape interval to be used. Default to 15 seconds
      scrape_interval: 15s
      # Additional labels to be added. Default to empty
      labels: {}

    # Blobber can be enabled with the `blobber_enabled` flag per client or globally
    # Defaults to false
    blobber_enabled: false

    # Blobber extra params can be passed in to the blobber container
    # Defaults to empty
    blobber_extra_params: []

    # A set of parameters the node needs to reach an external block building network
    # If `null` then the builder infrastructure will not be instantiated
    # Example:
    #
    # "relay_endpoints": [
    #  "https://0xdeadbeefcafa@relay.example.com",
    #  "https://0xdeadbeefcafb@relay.example.com",
    #  "https://0xdeadbeefcafc@relay.example.com",
    #  "https://0xdeadbeefcafd@relay.example.com"
    # ]
    builder_network_params: null

    # Participant flag for keymanager api
    # This will open up http ports to your validator services!
    # Defaults null and then set to default global keymanager_enabled (false)
    keymanager_enabled: null

# Participants matrix creates a participant for each combination of EL, CL and VC clients
# Each EL/CL/VC item can provide the same parameters as a standard participant
participants_matrix: {}
  # el:
  #   - el_type: geth
  #   - el_type: besu
  # cl:
  #   - cl_type: prysm
  #   - cl_type: lighthouse
  # vc:
  #   - vc_type: prysm
  #   - vc_type: lighthouse


# Default configuration parameters for the network
network_params:
  # Network name, used to enable syncing of alternative networks
  # Defaults to "kurtosis"
  # You can sync any public network by setting this to the network name (e.g. "mainnet", "sepolia", "holesky")
  # You can sync any devnet by setting this to the network name (e.g. "dencun-devnet-12", "verkle-gen-devnet-2")
  network: "kurtosis"

  # The network ID of the network.
  network_id: "3151908"

  # The address of the staking contract address on the Eth1 chain
  deposit_contract_address: "0x4242424242424242424242424242424242424242"

  # Number of seconds per slot on the Beacon chain
  seconds_per_slot: 12

  # The number of validator keys that each CL validator node should get
  num_validator_keys_per_node: 64

  # This mnemonic will a) be used to create keystores for all the types of validators that we have and b) be used to generate a CL genesis.ssz that has the children
  # validator keys already preregistered as validators
  preregistered_validator_keys_mnemonic: "giant issue aisle success illegal bike spike question tent bar rely arctic volcano long crawl hungry vocal artwork sniff fantasy very lucky have athlete"

  # The number of pre-registered validators for genesis. If 0 or not specified then the value will be calculated from the participants
  preregistered_validator_count: 0

  # How long you want the network to wait before starting up
  genesis_delay: 20

  # The gas limit of the network set at genesis
  genesis_gaslimit: 30000000

  # Max churn rate for the network introduced by
  # EIP-7514 https://eips.ethereum.org/EIPS/eip-7514
  # Defaults to 8
  max_per_epoch_activation_churn_limit: 8

  # Churn limit quotient for the network
  # Defaults to 65536
  churn_limit_quotient: 65536

  # Ejection balance
  # Defaults to 16ETH
  # 16000000000 gwei
  ejection_balance: 16000000000

  # ETH1 follow distance
  # Defaults to 2048
  eth1_follow_distance: 2048

  # The number of epochs to wait validators to be able to withdraw
  # Defaults to 256 epochs ~27 hours
  min_validator_withdrawability_delay: 256

  # The period of the shard committee
  # Defaults to 256 epoch ~27 hours
  shard_committee_period: 256

  # The epoch at which the deneb/electra/fulu forks are set to occur. Note: PeerDAS and Electra clients are currently
  # working on forks. So set either one of the below forks.
  # Altair fork epoch
  # Defaults to 0
  altair_fork_epoch: 0

  # Bellatrix fork epoch
  # Defaults to 0
  bellatrix_fork_epoch: 0

  # Capella fork epoch
  # Defaults to 0
  capella_fork_epoch: 0

  # Deneb fork epoch
  # Defaults to 0
  deneb_fork_epoch: 0

  # Electra fork epoch
  # Defaults to 100000000
  electra_fork_epoch: 100000000

  # Fulu fork epoch
  # Defaults to 100000001
  fulu_fork_epoch: 100000001


  # Network sync base url for syncing public networks from a custom snapshot (mostly useful for shadowforks)
  # Defaults to "https://snapshots.ethpandaops.io/"
  # If you have a local snapshot, you can set this to the local url:
  # network_snapshot_url_base = "http://10.10.101.21:10000/snapshots/"
  # The snapshots are taken with https://github.com/ethpandaops/snapshotter
  network_sync_base_url: https://snapshots.ethpandaops.io/

  # The number of data column sidecar subnets used in the gossipsub protocol
  data_column_sidecar_subnet_count: 128
  # Number of DataColumn random samples a node queries per slot
  samples_per_slot: 8
  # Minimum number of subnets an honest node custodies and serves samples from
  custody_requirement: 4

  # Maximum number of blobs per block for Electra fork
  max_blobs_per_block_electra: 9
  # Target number of blobs per block for Electra fork
  target_blobs_per_block_electra: 6

  # Maximum number of blobs per block for Fulu fork
  max_blobs_per_block_fulu: 12
  # Target number of blobs per block for Fulu fork
  target_blobs_per_block_fulu: 9

  # Preset for the network
  # Default: "mainnet"
  # Options: "mainnet", "minimal"
  # "minimal" preset will spin up a network with minimal preset. This is useful for rapid testing and development.
  # 192 seconds to get to finalized epoch vs 1536 seconds with mainnet defaults
  # Please note that minimal preset requires alternative client images.
  # For an example of minimal preset, please refer to [minimal.yaml](.github/tests/minimal.yaml)
  preset: "mainnet"

  # Preloaded contracts for the chain
  additional_preloaded_contracts: {}
  # Example:
  # additional_preloaded_contracts: '{
  #  "0x123463a4B065722E99115D6c222f267d9cABb524":
  #   {
  #     balance: "1ETH",
  #     code: "0x1234",
  #     storage: {},
  #     nonce: 0,
  #     secretKey: "0x",
  #   }
  # }'

  # Repository override for devnet networks
  # Default: ethpandaops
  devnet_repo: ethpandaops

  # A number of prefunded accounts to be created
  # Defaults to no prefunded accounts
  # Example:
  # prefunded_accounts: '{"0x25941dC771bB64514Fc8abBce970307Fb9d477e9": {"balance": "10ETH"}}'
  # 10ETH to the account 0x25941dC771bB64514Fc8abBce970307Fb9d477e9
  # To prefund multiple accounts, separate them with a comma
  #
  # prefunded_accounts: '{"0x25941dC771bB64514Fc8abBce970307Fb9d477e9": {"balance": "10ETH"}, "0x4107be99052d895e3ee461C685b042Aa975ab5c0": {"balance": "1ETH"}}'
  prefunded_accounts: {}

  # Maximum size of gossip messages in bytes
  # 10 * 2**20 (= 10485760, 10 MiB)
  # Defaults to 10485760 (10MB)
  gossip_max_size: 10485760



# Global parameters for the network

# By default includes
# - A transaction spammer & blob spammer is launched to fake transactions sent to the network
# - Forkmon for EL will be launched
# - A prometheus will be started, coupled with grafana
# - A beacon metrics gazer will be launched
# - A light beacon chain explorer will be launched
# - Default: []
additional_services:
  - assertoor
  - broadcaster
  - tx_spammer
  - blob_spammer
  - custom_flood
  - spamoor
  - spamoor_blob
  - el_forkmon
  - blockscout
  - beacon_metrics_gazer
  - dora
  - full_beaconchain_explorer
  - prometheus_grafana
  - blobscan
  - dugtrio
  - blutgang
  - forky
  - apache
  - tracoor
  - faucet
  - uniswap

# Configuration place for blockscout explorer - https://github.com/blockscout/blockscout
blockscout_params:
  # The URL where the blockscout backend will be available
  backend_url: "blockscout/blockscout:latest"
  # The URL where the blockscout frontend will be available
  frontend_url: "ghcr.io/blockscout/smart-contract-verifier:latest"
  # A reown (wallet connect) project id to enable wallet features
  wallet_connect_id: "ghcr.io/blockscout/frontend:latest"

# Configuration place for dora the explorer - https://github.com/ethpandaops/dora
dora_params:
  # Dora docker image to use
  # Defaults to the latest image
  image: "ethpandaops/dora:latest"
  # A list of optional extra env_vars the dora container should spin up with
  env: {}

# Configuration place for transaction spammer - https://github.com/MariusVanDerWijden/tx-fuzz
tx_spammer_params:
  # TX Spammer docker image to use
  # Defaults to the latest master image
  image: "ethpandaops/tx-fuzz:master"
  # A list of optional extra params that will be passed to the TX Spammer container for modifying its behaviour
  tx_spammer_extra_args: []

# Configuration place for prometheus
prometheus_params:
  storage_tsdb_retention_time: "1d"
  storage_tsdb_retention_size: "512MB"
  # Resource management for prometheus container
  # CPU is milicores
  # RAM is in MB
  min_cpu: 10
  max_cpu: 1000
  min_mem: 128
  max_mem: 2048
  # Prometheus docker image to use
  # Defaults to the latest image
  image: "prom/prometheus:latest"

# Configuration place for grafana
grafana_params:
  # A list of locators for grafana dashboards to be loaded be the grafana service
  additional_dashboards: []
  # Resource management for grafana container
  # CPU is milicores
  # RAM is in MB
  min_cpu: 10
  max_cpu: 1000
  min_mem: 128
  max_mem: 2048
  # Grafana docker image to use
  # Defaults to the latest image
  image: "grafana/grafana:latest"

# Configuration place for the assertoor testing tool - https://github.com/ethpandaops/assertoor
assertoor_params:
  # Assertoor docker image to use
  # Defaults to the latest image
  image: "ethpandaops/assertoor:latest"

  # Check chain stability
  # This check monitors the chain and succeeds if:
  # - all clients are synced
  # - chain is finalizing for min. 2 epochs
  # - >= 98% correct target votes
  # - >= 80% correct head votes
  # - no reorgs with distance > 2 blocks
  # - no more than 2 reorgs per epoch
  run_stability_check: false

  # Check block propöosals
  # This check monitors the chain and succeeds if:
  # - all client pairs have proposed a block
  run_block_proposal_check: false

  # Run normal transaction test
  # This test generates random EOA transactions and checks inclusion with/from all client pairs
  # This test checks for:
  # - block proposals with transactions from all client pairs
  # - transaction inclusion when submitting via each client pair
  # test is done twice, first with legacy (type 0) transactions, then with dynfee (type 2) transactions
  run_transaction_test: false

  # Run blob transaction test
  # This test generates blob transactions and checks inclusion with/from all client pairs
  # This test checks for:
  # - block proposals with blobs from all client pairs
  # - blob inclusion when submitting via each client pair
  run_blob_transaction_test: false

  # Run all-opcodes transaction test
  # This test generates a transaction that triggers all EVM OPCODES once
  # This test checks for:
  # - all-opcodes transaction success
  run_opcodes_transaction_test: false

  # Run validator lifecycle test (~48h to complete)
  # This test requires exactly 500 active validator keys.
  # The test will cause a temporary chain unfinality when running.
  # This test checks:
  # - Deposit inclusion with/from all client pairs
  # - BLS Change inclusion with/from all client pairs
  # - Voluntary Exit inclusion with/from all client pairs
  # - Attester Slashing inclusion with/from all client pairs
  # - Proposer Slashing inclusion with/from all client pairs
  # all checks are done during finality & unfinality
  run_lifecycle_test: false

  # Run additional tests from external test definitions
  # Entries may be simple strings (link to the test file) or dictionaries with more flexibility
  # eg:
  #   - https://raw.githubusercontent.com/ethpandaops/assertoor/master/example/tests/block-proposal-check.yaml
  #   - file: "https://raw.githubusercontent.com/ethpandaops/assertoor/master/example/tests/block-proposal-check.yaml"
  #     config:
  #       someCustomTestConfig: "some value"
  tests: []

# Faucet params for https://github.com/LZeroAnalytics/ethereum-faucet
faucet_params:
  # Private key for faucet account - needs to be prefunded
  private_key: bcdf20249abf0ed6d944c0288fad489e33f66b3960d9e6229c1cd214ed3bbe31

# Uniswap params for https://github.com/LZeroAnalytics/uniswap-package
uniswap_params:
  # URL at which the backend service will be available
  backend_url: <UNISWAP BACKEND URL>
# If set, the package will block until a finalized epoch has occurred.
wait_for_finalization: false

# The global log level that all clients should log at
# Valid values are "error", "warn", "info", "debug", and "trace"
# This value will be overridden by participant-specific values
global_log_level: "info"

# Snooper global flag for all participants
# Snooper can be enabled with the `snooper_enabled` flag per client or globally
# Snooper dumps all JSON-RPC requests and responses including BeaconAPI, EngineAPI and ExecutionAPI.
# Default to false
snooper_enabled: false

# Enables Ethereum Metrics Exporter for all participants
# Defaults to false
ethereum_metrics_exporter_enabled: false

# Parallelizes keystore generation so that each node has keystores being generated in their own container
# This will result in a large number of containers being spun up than normal. We advise users to only enable this on a sufficiently large machine or in the cloud as it can be resource consuming on a single machine.
parallel_keystore_generation: false

# Disable peer scoring to prevent nodes impacted by faults from being permanently ejected from the network
# Default to false
disable_peer_scoring: false

# Whether the environment should be persistent; this is WIP and is slowly being rolled out across services
# Note this requires Kurtosis greater than 0.85.49 to work
# Note Erigon, Besu, Teku persistence is not currently supported with docker.
# Defaults to false
persistent: false

# Docker cache url enables all docker images to be pulled through a custom docker registry
# Disabled by default
# Defaults to empty cache url
# Images pulled from dockerhub will be prefixed with "/dh/" by default (docker.io)
# Images pulled from github registry will be prefixed with "/gh/" by default (ghcr.io)
# Images pulled from google registry will be prefixed with "/gcr/" by default (gcr.io)
# If you want to use a local image in combination with the cache, do not put "/" in your local image name
docker_cache_params:
  enabled: false
  url: ""
  dockerhub_prefix: "/dh/"
  github_prefix: "/gh/"
  google_prefix: "/gcr/"

# Supports three valeus
# Default: "null" - no mev boost, mev builder, mev flood or relays are spun up
# "mock" - mock-builder & mev-boost are spun up
# "flashbots" - mev-boost, relays, flooder and builder are all spun up, powered by [flashbots](https://github.com/flashbots)
# "mev-rs" - mev-boost, relays and builder are all spun up, powered by [mev-rs](https://github.com/ralexstokes/mev-rs/)
# "commit-boost" - mev-boost, relays and builder are all spun up, powered by [commit-boost](https://github.com/Commit-Boost/commit-boost-client)
# We have seen instances of multibuilder instances failing to start mev-relay-api with non zero epochs
mev_type: null

# Parameters if MEV is used
mev_params:
  # The image to use for MEV boost relay
  mev_relay_image: ethpandaops/mev-boost-relay:main
  # The image to use for the builder
  mev_builder_image: ethpandaops/flashbots-builder:main
  # The image to use for the CL builder
  mev_builder_cl_image: sigp/lighthouse:latest
  # The image to use for mev-boost
  mev_boost_image: ethpandaops/mev-boost:develop
  # Parameters for MEV Boost. This overrides all arguments of the mev-boost container
  mev_boost_args: []
  # Extra parameters to send to the API
  mev_relay_api_extra_args: []
  # Extra parameters to send to the housekeeper
  mev_relay_housekeeper_extra_args: []
  # Extra parameters to send to the website
  mev_relay_website_extra_args: []
  # Extra parameters to send to the builder
  mev_builder_extra_args: []
  # Prometheus additional configuration for the mev builder participant.
  # Execution, beacon and validator client targets on prometheus will include this configuration.
  mev_builder_prometheus_config:
    # Scrape interval to be used. Default to 15 seconds
    scrape_interval: 15s
    # Additional labels to be added. Default to empty
    labels: {}
  # Image to use for mev-flood
  mev_flood_image: flashbots/mev-flood
  # Extra parameters to send to mev-flood
  mev_flood_extra_args: []
  # Number of seconds between bundles for mev-flood
  mev_flood_seconds_per_bundle: 15
  # Optional parameters to send to the custom_flood script that sends reliable payloads
  custom_flood_params:
    interval_between_transactions: 1

# Enables Xatu Sentry for all participants
# Defaults to false
xatu_sentry_enabled: false

# Xatu Sentry params
xatu_sentry_params:
  # The image to use for Xatu Sentry
  xatu_sentry_image: ethpandaops/xatu:latest
  # GRPC Endpoint of Xatu Server to send events to
  xatu_server_addr: localhost:8080
  # Enables TLS to Xatu Server
  xatu_server_tls: false
  # Headers to add on to Xatu Server requests
  xatu_server_headers: {}
  # Beacon event stream topics to subscribe to
  beacon_subscriptions:
    - attestation
    - block
    - chain_reorg
    - finalized_checkpoint
    - head
    - voluntary_exit
    - contribution_and_proof
    - blob_sidecar

# Apache params
# Apache public port to port forward to local machine
# Default to port None, only set if apache additional service is activated
apache_port: null

# Global tolerations that will be passed to all containers (unless overridden by a more specific toleration)
# Only works with Kubernetes
# Example: tolerations:
# - key: "key"
#   operator: "Equal"
#   value: "value"
#   effect: "NoSchedule"
#   toleration_seconds: 3600
# Defaults to empty
global_tolerations: []

# Global node selector that will be passed to all containers (unless overridden by a more specific node selector)
# Only works with Kubernetes
# Example: global_node_selectors: { "disktype": "ssd" }
# Defaults to empty
global_node_selectors: {}

# Global parameters for keymanager api
# This will open up http ports to your validator services!
# Defaults to false
keymanager_enabled: false

# Global flag to enable checkpoint sync across the network
checkpoint_sync_enabled: false

# Global flag to set checkpoint sync url
checkpoint_sync_url: ""

# Configuration place for spamoor as transaction spammer
spamoor_params:
  # The image to use for spamoor
  image: ethpandaops/spamoor:latest
  # The spamoor scenario to use (see https://github.com/ethpandaops/spamoor)
  # Valid scenarios are:
  #  eoatx, erctx, deploytx, deploy-destruct, blobs, gasburnertx
  # Defaults to eoatx
  scenario: eoatx
  # Throughput of spamoor
  # Defaults to 1000
  throughput: 1000
  # Max pending transactions for spamoor
  # Defaults to 1000
  max_pending: 1000
  # Max wallets for spamoor
  # Defaults to 500
  max_wallets: 500
  # Extra parameters to send to spamoor
  # Defaults to empty
  spamoor_extra_args: []

# Configuration place for spammor as blob spammer
spamoor_blob_params:
  # spamoor docker image to use
  # Defaults to the latest
  image: "ethpandaops/spamoor:latest"
  # The spamoor blob scenario to use (see https://github.com/ethpandaops/spamoor)
  # Valid blob scenarios are:
  # - blobs (normal blob transactions only)
  # - blob-combined (normal & special blobs with replacements)
  # - blob-conflicting (conflicting blob & dynfee transactions)
  # - blob-replacements (normal blobs with replacement blob transactions)
  # Defaults to blob-combined
  scenario: blob-combined
  # Throughput of spamoor
  # Defaults to 3
  throughput: 3
  # Maximum number of blobs per transaction
  # Defaults to 2
  max_blobs: 2
  # Max pending blob transactions for spamoor
  # Defaults to 6
  max_pending: 6
  # Max wallets for spamoor
  # Defaults to 20
  max_wallets: 20
  # A list of optional params that will be passed to the spamoor command for modifying its behaviour
  spamoor_extra_args: []

# Ethereum genesis generator params
ethereum_genesis_generator_params:
  # The image to use for ethereum genesis generator
  image: tiljordan/ethereum-genesis-generator:3.7.1

# Global parameter to set the exit ip address of services and public ports
port_publisher:
  # if you have a service that you want to expose on a specific interface; set that IP here
  # if you set it to auto it gets the public ip from ident.me and sets it
  # Defaults to constants.PRIVATE_IP_ADDRESS_PLACEHOLDER
  # The default value just means its the IP address of the container in which the service is running
  nat_exit_ip: KURTOSIS_IP_ADDR_PLACEHOLDER
  # Execution Layer public port exposed to your local machine
  # Disabled by default
  # Public port start defaults to 32000
  # You can't run multiple enclaves on the same port settings
  el:
    enabled: false
    public_port_start: 32000
  # Consensus Layer public port exposed to your local machine
  # Disabled by default
  # Public port start defaults to 33000
  # You can't run multiple enclaves on the same port settings
  cl:
    enabled: false
    public_port_start: 33000
  # Validator client public port exposed to your local machine
  # Disabled by default
  # Public port start defaults to 34000
  # You can't run multiple enclaves on the same port settings
  vc:
    enabled: false
    public_port_start: 34000
  # remote signer public port exposed to your local machine
  # Disabled by default
  # Public port start defaults to 35000
  # You can't run multiple enclaves on the same port settings
  remote_signer:
    enabled: false
    public_port_start: 35000
  # Additional services public port exposed to your local machine
  # Disabled by default
  # Public port start defaults to 36000
  # You can't run multiple enclaves on the same port settings
  additional_services:
    enabled: false
    public_port_start: 36000
```

#### Example configurations

<details>
    <summary>Verkle configuration example</summary>

```yaml
participants:
  - el_type: geth
    el_image: ethpandaops/geth:<VERKLE_IMAGE>
    elExtraParams:
    - "--override.verkle=<UNIXTIMESTAMP>"
    cl_type: lighthouse
    cl_image: sigp/lighthouse:latest
  - el_type: geth
    el_image: ethpandaops/geth:<VERKLE_IMAGE>
    elExtraParams:
    - "--override.verkle=<UNIXTIMESTAMP>"
    cl_type: lighthouse
    cl_image: sigp/lighthouse:latest
  - el_type: geth
    el_image: ethpandaops/geth:<VERKLE_IMAGE>
    elExtraParams:
    - "--override.verkle=<UNIXTIMESTAMP>"
    cl_type: lighthouse
    cl_image: sigp/lighthouse:latest
network_params:
  deneb_fork_epoch: 0
wait_for_finalization: false
wait_for_verifications: false
global_log_level: info

```

</details>

<details>
    <summary>A 3-node Ethereum network with "mock" MEV mode.</summary>
    Useful for testing mev-boost and the client implementations without adding the complexity of the relay. This can be enabled by a single config command and would deploy the [mock-builder](https://github.com/marioevz/mock-builder), instead of the relay infrastructure.

```yaml
participants:
  - el_type: geth
    el_image: ''
    cl_type: lighthouse
    cl_image: ''
    count: 2
  - el_type: nethermind
    el_image: ''
    cl_type: teku
    cl_image: ''
    count: 1
  - el_type: besu
    el_image: ''
    cl_type: prysm
    cl_image: ''
    count: 2
mev_type: mock
```

</details>

<details>
    <summary>A 5-node Ethereum network with three different CL and EL client combinations and mev-boost infrastructure in "full" mode.</summary>

```yaml
participants:
  - el_type: geth
    cl_type: lighthouse
    count: 2
  - el_type: nethermind
    cl_type: teku
  - el_type: besu
    cl_type: prysm
    count: 2
mev_type: flashbots
network_params:
  deneb_fork_epoch: 1
```

</details>

<details>
    <summary>A 2-node geth/lighthouse network with optional services (Grafana, Prometheus, transaction-spammer, EngineAPI snooper, and a testnet verifier)</summary>

```yaml
participants:
  - el_type: geth
    cl_type: lighthouse
    count: 2
snooper_enabled: true
additional_services:
  - prometheus_grafana
ethereum_metrics_exporter_enabled: true
```

</details>

<!------------------------ Only links below here -------------------------------->

[docker-installation]: https://docs.docker.com/get-docker/
[kurtosis-cli-installation]: https://docs.kurtosis.com/install
[kurtosis-repo]: https://github.com/kurtosis-tech/kurtosis
[enclave]: https://docs.kurtosis.com/advanced-concepts/enclaves/
[package-reference]: https://docs.kurtosis.com/advanced-concepts/packages
