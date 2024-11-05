shared_utils = import_module("../shared_utils/shared_utils.star")
constants = import_module("../package_io/constants.star")
postgres = import_module("github.com/kurtosis-tech/postgres-package/main.star")
redis = import_module("github.com/kurtosis-tech/redis-package/main.star")

# Images
IMAGE_NAME_BLOCKSCOUT_BACKEND = "blockscout/blockscout:latest"
IMAGE_NAME_BLOCKSCOUT_FRONTEND = "ghcr.io/blockscout/frontend:latest"
IMAGE_NAME_BLOCKSCOUT_PROXY = "nginx"
IMAGE_NAME_SMART_CONTRACT_VERIFIER = "ghcr.io/blockscout/smart-contract-verifier:latest"

# Service Names
SERVICE_NAME_BLOCKSCOUT_BACKEND = "blockscout-backend"
SERVICE_NAME_BLOCKSCOUT_FRONTEND = "blockscout-frontend"
SERVICE_NAME_BLOCKSCOUT_PROXY = "blockscout-proxy"
SERVICE_NAME_SMART_CONTRACT_VERIFIER = "smart-contract-verifier"

# Resource Limits (Adjust as needed)
POSTGRES_MIN_CPU = 100
POSTGRES_MAX_CPU = 1000
POSTGRES_MIN_MEMORY = 1024
POSTGRES_MAX_MEMORY = 2048

REDIS_MIN_CPU = 100
REDIS_MAX_CPU = 1000
REDIS_MIN_MEMORY = 256
REDIS_MAX_MEMORY = 512

BACKEND_MIN_CPU = 500
BACKEND_MAX_CPU = 2000
BACKEND_MIN_MEMORY = 2048
BACKEND_MAX_MEMORY = 4096

FRONTEND_MIN_CPU = 100
FRONTEND_MAX_CPU = 1000
FRONTEND_MIN_MEMORY = 512
FRONTEND_MAX_MEMORY = 1024

PROXY_MIN_CPU = 100
PROXY_MAX_CPU = 500
PROXY_MIN_MEMORY = 256
PROXY_MAX_MEMORY = 512

SMART_CONTRACT_VERIFIER_MIN_CPU = 100
SMART_CONTRACT_VERIFIER_MAX_CPU = 1000
SMART_CONTRACT_VERIFIER_MIN_MEMORY = 512
SMART_CONTRACT_VERIFIER_MAX_MEMORY = 1024

HTTP_PORT_NUMBER = 80
HTTP_PORT_NUMBER_VERIF = 8050

USED_PORTS = {
    constants.HTTP_PORT_ID: shared_utils.new_port_spec(
        HTTP_PORT_NUMBER,
        shared_utils.TCP_PROTOCOL,
        shared_utils.HTTP_APPLICATION_PROTOCOL,
    )
}

VERIF_USED_PORTS = {
    constants.HTTP_PORT_ID: shared_utils.new_port_spec(
        HTTP_PORT_NUMBER_VERIF,
        shared_utils.TCP_PROTOCOL,
        shared_utils.HTTP_APPLICATION_PROTOCOL,
    )
}


def launch_blockscout(
    plan,
    el_contexts,
    persistent,
    global_node_selectors,
    port_publisher,
    additional_service_index,
    blockscout_params
):
    postgres_output = postgres.run(
        plan,
        service_name="blockscout-postgres",
        database="blockscout",
        extra_configs=["max_connections=1000"],
        persistent=persistent,
        node_selectors=global_node_selectors,
        min_cpu=POSTGRES_MIN_CPU,
        max_cpu=POSTGRES_MAX_CPU,
        min_memory=POSTGRES_MIN_MEMORY,
        max_memory=POSTGRES_MAX_MEMORY,
    )

    # Set up Redis
    redis_output = redis.run(
        plan,
        service_name="blockscout-redis",
        persistent=persistent,
        node_selectors=global_node_selectors,
        min_cpu=REDIS_MIN_CPU,
        max_cpu=REDIS_MAX_CPU,
        min_memory=REDIS_MIN_MEMORY,
        max_memory=REDIS_MAX_MEMORY,
    )

    el_context = el_contexts[0]
    el_client_rpc_url = "{}/".format(
        el_context.rpc_http_url
    )
    el_client_ws_url = "{}/".format(
        el_context.ws_url
    )
    el_client_name = el_context.client_name

    config_verif = get_config_verif(
        global_node_selectors,
        port_publisher,
        additional_service_index,
    )

    verif_service = plan.add_service(SERVICE_NAME_SMART_CONTRACT_VERIFIER, config_verif)

    config_backend = get_config_backend(
        postgres_output,
        redis_output,
        el_client_name,
        el_client_rpc_url,
        el_client_ws_url,
        verif_service,
        global_node_selectors,
        port_publisher,
        additional_service_index
    )
    backend_service = plan.add_service(SERVICE_NAME_BLOCKSCOUT_BACKEND, config_backend)
    plan.print(backend_service)

    config_frontend = get_config_frontend(
        blockscout_params.backend_url,
        blockscout_params.frontend_url,
        global_node_selectors,
        port_publisher,
        additional_service_index
    )
    frontend_service = plan.add_service(SERVICE_NAME_BLOCKSCOUT_FRONTEND, config_frontend)
    plan.print(frontend_service)

    frontend_url = "http://{}:{}".format(
        frontend_service.hostname, frontend_service.ports["http"].number
    )

    return frontend_url


def get_config_verif(node_selectors, port_publisher, additional_service_index):
    public_ports = shared_utils.get_additional_service_standard_public_port(
        port_publisher,
        constants.HTTP_PORT_ID,
        additional_service_index,
        0,
    )

    return ServiceConfig(
        image=IMAGE_NAME_SMART_CONTRACT_VERIFIER,
        ports=VERIF_USED_PORTS,
        public_ports=public_ports,
        env_vars={
            "SMART_CONTRACT_VERIFIER__SERVER__HTTP__ADDR": "0.0.0.0:{}".format(
                HTTP_PORT_NUMBER_VERIF
            )
        },
        min_cpu=SMART_CONTRACT_VERIFIER_MIN_CPU,
        max_cpu=SMART_CONTRACT_VERIFIER_MAX_CPU,
        min_memory=SMART_CONTRACT_VERIFIER_MIN_MEMORY,
        max_memory=SMART_CONTRACT_VERIFIER_MAX_MEMORY,
        node_selectors=node_selectors,
    )

def get_config_backend(
    postgres_output,
    redis_output,
    el_client_name,
    el_client_rpc_url,
    el_client_ws_url,
    sc_verifier_service,
    node_selectors,
    port_publisher,
    additional_service_index,
):
    database_url = "postgresql://{user}:{password}@{hostname}:{port}/{database}".format(
        user=postgres_output.user,
        password=postgres_output.password,
        hostname=postgres_output.service.hostname,
        port=postgres_output.port.number,
        database=postgres_output.database,
    )

    redis_url = redis_output.url

    # Smart Contract Verifier URL
    sc_verifier_url = "http://{}:{}/".format(
        sc_verifier_service.hostname, sc_verifier_service.ports["http"].number
    )

    # Generate a SECRET_KEY_BASE (should be securely generated)
    secret_key_base = "56NtB48ear7+wMSf0IQuWDAAazhpb31qyc7GiyspBP2vh7t5zlCsF5QDv76chXeN"

    public_ports = shared_utils.get_additional_service_standard_public_port(
        port_publisher,
        constants.HTTP_PORT_ID,
        additional_service_index,
        1,
    )

    env_vars = {
        "ETHEREUM_JSONRPC_VARIANT": "erigon"
        if el_client_name == "erigon" or el_client_name == "reth"
        else el_client_name,
        "DATABASE_URL": database_url,
        "DATABASE_POOL_SIZE": "80",
        "ACCOUNT_REDIS_URL": redis_url,
        "ETHEREUM_JSONRPC_HTTP_URL": el_client_rpc_url,
        "ETHEREUM_JSONRPC_TRACE_URL": el_client_rpc_url,
        "ETHEREUM_JSONRPC_WS_URL": el_client_ws_url,
        "NETWORK": "LZero",
        "SUBNETWORK": "LZero",
        "COIN": "ETH",
        "SECRET_KEY_BASE": secret_key_base,
        "ECTO_USE_SSL": "false",
        "API_V2_ENABLED": "true",
        "INDEXER_DISABLE_PENDING_TRANSACTIONS_FETCHER": "true",
        # Smart Contract Verifier configurations
        "MICROSERVICE_SC_VERIFIER_ENABLED": "true",
        "MICROSERVICE_SC_VERIFIER_URL": sc_verifier_url,
        "MICROSERVICE_SC_VERIFIER_TYPE": "sc_verifier",
        "PORT": "{}".format(HTTP_PORT_NUMBER),
    }

    cmd = [
        "sh",
        "-c",
        'bin/blockscout eval "Elixir.Explorer.ReleaseTasks.create_and_migrate()" && bin/blockscout start',
    ]

    return ServiceConfig(
        image=IMAGE_NAME_BLOCKSCOUT_BACKEND,
        cmd=cmd,
        env_vars=env_vars,
        public_ports=public_ports,
        ports=USED_PORTS,
        min_cpu=BACKEND_MIN_CPU,
        max_cpu=BACKEND_MAX_CPU,
        min_memory=BACKEND_MIN_MEMORY,
        max_memory=BACKEND_MAX_MEMORY,
        node_selectors=node_selectors,
    )

def get_config_frontend(
    backend_hostname,
    app_hostname,
    node_selectors,
    port_publisher,
    additional_service_index,
):
    env_vars = {
        "NEXT_PUBLIC_API_HOST": backend_hostname,
        "NEXT_PUBLIC_NETWORK_ID": "3151908",
        "NEXT_PUBLIC_APP_HOST": app_hostname,
        "NEXT_PUBLIC_API_PROTOCOL": "http",
        "NEXT_PUBLIC_NETWORK_NAME": "LZero",
        "NEXT_PUBLIC_NETWORK_SHORT_NAME": "LZero",
        "NEXT_PUBLIC_NETWORK_CURRENCY_NAME": "Ether",
        "NEXT_PUBLIC_NETWORK_CURRENCY_SYMBOL": "ETH",
        "NEXT_PUBLIC_NETWORK_CURRENCY_DECIMALS": "18",
        "NEXT_PUBLIC_IS_TESTNET": "true",
        "NEXT_PUBLIC_API_WEBSOCKET_PROTOCOL": "ws"
    }

    public_ports = shared_utils.get_additional_service_standard_public_port(
        port_publisher,
        constants.HTTP_PORT_ID,
        additional_service_index,
        2,
    )

    return ServiceConfig(
        image=IMAGE_NAME_BLOCKSCOUT_FRONTEND,
        env_vars=env_vars,
        public_ports=public_ports,
        ports= {
            "http": PortSpec(
                number=3000,
                transport_protocol="TCP",
                application_protocol="http",
            )
        },
        min_cpu=FRONTEND_MIN_CPU,
        max_cpu=FRONTEND_MAX_CPU,
        min_memory=FRONTEND_MIN_MEMORY,
        max_memory=FRONTEND_MAX_MEMORY,
        node_selectors=node_selectors,
    )
