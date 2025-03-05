def launch_faucet(plan, chain_id, private_key, address, node_ip, rpc_port):

    node_url = "http://{}:{}".format(node_ip, rpc_port)
    plan.add_service(
        name="faucet",
        config = ServiceConfig(
            image = "tiljordan/ethereum-faucet:v1.13.0",
            ports = {
                "api": PortSpec(number=8090, transport_protocol="TCP")
            },
            env_vars={
                "NODE_URL": node_url,
                "PORT": "8090",
                "PRIVATE_KEY": private_key,
                "CHAIN_ID": chain_id,
                "LOG_LEVEL": "info",
            }
        )
    )

    plan.request(
        service_name = "faucet",
        recipe = PostHttpRequestRecipe(
            port_id = "api",
            endpoint = "/fund-usdc",
            content_type = "application/json",
            body = "{\"address\": \"{}\", \"amount\": 1000000000}".format(address),
        ),
        acceptable_codes = [200],
        description = "Sending USDC to faucet"
    )


