shared_utils = import_module("../shared_utils/shared_utils.star")
constants = import_module("../package_io/constants.star")

SERVICE_NAME = "x402-facilitator"
HTTP_PORT_NUMBER = 3000
HTTP_PORT_ID = "http"

USED_PORTS = {
    HTTP_PORT_ID: shared_utils.new_port_spec(
        HTTP_PORT_NUMBER,
        shared_utils.TCP_PROTOCOL,
        shared_utils.HTTP_APPLICATION_PROTOCOL,
    )
}


def launch_x402_facilitator(
    plan,
    x402_facilitator_params,
    global_node_selectors,
    port_publisher,
    additional_service_index,
):
    config = get_config(
        plan,
        x402_facilitator_params,
        global_node_selectors,
        port_publisher,
        additional_service_index,
    )
    plan.add_service(SERVICE_NAME, config)


def get_config(
    plan,
    x402_facilitator_params,
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
        "CDP_API_KEY_ID": x402_facilitator_params.get("cdp_api_key_id", ""),
        "CDP_API_KEY_SECRET": x402_facilitator_params.get("cdp_api_key_secret", ""),
    }

    return ServiceConfig(
        image=x402_facilitator_params["image"],
        ports=USED_PORTS,
        public_ports=public_ports,
        cmd=["npm", "start"],
        env_vars=env_vars,
        node_selectors=node_selectors,
    )
