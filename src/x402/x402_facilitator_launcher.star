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

    package_json = {
        "name": "x402-facilitator",
        "version": "1.0.0",
        "type": "module",
        "scripts": {"start": "tsx index.ts"},
        "dependencies": {
            "express": "^4.18.0",
            "tsx": "^4.0.0",
            "typescript": "^5.0.0",
            "dotenv": "^16.0.0",
        },
    }

    facilitator_code = """import express from 'express';
import { config } from 'dotenv';

config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post('/verify', (req, res) => {
    console.log('Verify payment request:', req.body);
    res.json({
        success: true,
        verified: true,
        message: 'Payment verified successfully'
    });
});

app.post('/settle', (req, res) => {
    console.log('Settle payment request:', req.body);
    res.json({
        success: true,
        settled: true,
        message: 'Payment settled successfully'
    });
});

app.get('/supported', (req, res) => {
    res.json({
        networks: ['ethereum', 'solana'],
        tokens: ['ETH', 'SOL', 'USDC'],
        message: 'X402 Facilitator supports multiple networks'
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'x402-facilitator' });
});

app.listen(port, () => {
    console.log(`X402 Facilitator running on port ${port}`);
    console.log(`EVM Private Key configured: ${process.env.EVM_PRIVATE_KEY ? 'Yes' : 'No'}`);
});
"""

    env_vars = {
        "PORT": str(HTTP_PORT_NUMBER),
        "EVM_PRIVATE_KEY": x402_facilitator_params.get("evm_private_key", ""),
        "SVM_PRIVATE_KEY": x402_facilitator_params.get("svm_private_key", ""),
    }

    return ServiceConfig(
        image=x402_facilitator_params["image"],
        ports=USED_PORTS,
        public_ports=public_ports,
        cmd=["npm", "start"],
        env_vars=env_vars,
        node_selectors=node_selectors,
    )
