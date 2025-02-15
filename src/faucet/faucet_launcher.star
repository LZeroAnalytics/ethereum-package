def launch_faucet(plan, chain_id, private_key, node_ip, rpc_port):

    node_url = "http://{}:{}".format(node_ip, rpc_port)
    plan.add_service(
        name="faucet",
        config = ServiceConfig(
            image = "tiljordan/ethereum-faucet:v1.13.0",
            ports = {
                "api": PortSpec(number=8090, transport_protocol="TCP", wait=None)
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
