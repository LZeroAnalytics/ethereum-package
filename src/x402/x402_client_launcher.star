shared_utils = import_module("../shared_utils/shared_utils.star")
constants = import_module("../package_io/constants.star")

SERVICE_NAME = "x402-client"
HTTP_PORT_NUMBER = 8080
HTTP_PORT_ID = "http"

USED_PORTS = {
    HTTP_PORT_ID: shared_utils.new_port_spec(
        HTTP_PORT_NUMBER,
        shared_utils.TCP_PROTOCOL,
        shared_utils.HTTP_APPLICATION_PROTOCOL,
    )
}


def launch_x402_client(
    plan,
    x402_client_params,
    global_node_selectors,
    port_publisher,
    additional_service_index,
):
    config = get_config(
        plan,
        x402_client_params,
        global_node_selectors,
        port_publisher,
        additional_service_index,
    )
    plan.add_service(SERVICE_NAME, config)


def get_config(
    plan,
    x402_client_params,
    node_selectors,
    port_publisher,
    additional_service_index,
):
    public_ports = shared_utils.get_additional_service_standard_public_port(
        port_publisher,
        HTTP_PORT_ID,
        additional_service_index,
        0,
    )

    env_vars = {
        "PORT": str(HTTP_PORT_NUMBER),
        "PRIVATE_KEY": x402_client_params.get("private_key", ""),
        "RESOURCE_SERVER_URL": x402_client_params.get("resource_server_url", ""),
        "ENDPOINT_PATH": x402_client_params.get("endpoint_path", ""),
    }

    return ServiceConfig(
        image=x402_client_params["image"],
        ports=USED_PORTS,
        public_ports=public_ports,
        cmd=["npm", "start"],
        env_vars=env_vars,
        node_selectors=node_selectors,
    )
