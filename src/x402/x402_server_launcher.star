shared_utils = import_module("../shared_utils/shared_utils.star")
constants = import_module("../package_io/constants.star")

SERVICE_NAME = "x402-server"
HTTP_PORT_NUMBER = 4021
HTTP_PORT_ID = "http"

USED_PORTS = {
    HTTP_PORT_ID: shared_utils.new_port_spec(
        HTTP_PORT_NUMBER,
        shared_utils.TCP_PROTOCOL,
        shared_utils.HTTP_APPLICATION_PROTOCOL,
    )
}


def launch_x402_server(
    plan,
    x402_server_params,
    global_node_selectors,
    port_publisher,
    additional_service_index,
):
    config = get_config(
        plan,
        x402_server_params,
        global_node_selectors,
        port_publisher,
        additional_service_index,
    )
    plan.add_service(SERVICE_NAME, config)


def get_config(
    plan,
    x402_server_params,
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
        "name": "x402-server",
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

    server_code = """import express from 'express';
import { config } from 'dotenv';

config();

const app = express();
const port = process.env.PORT || 4021;

app.use(express.json());

const paymentMiddleware = (req, res, next) => {
    const paymentHeader = req.headers['x-payment'];
    
    if (!paymentHeader) {
        return res.status(402).json({
            error: 'Payment Required',
            message: 'This endpoint requires payment',
            facilitator_url: process.env.FACILITATOR_URL,
            price: '0.001'
        });
    }
    
    console.log('Payment received:', paymentHeader);
    next();
};

app.get('/protected', paymentMiddleware, (req, res) => {
    res.json({
        message: 'This is a protected endpoint that requires payment',
        data: 'Secret protected content',
        timestamp: new Date().toISOString()
    });
});

app.get('/premium', paymentMiddleware, (req, res) => {
    res.json({
        message: 'This is a premium endpoint with higher payment',
        data: 'Premium exclusive content',
        timestamp: new Date().toISOString()
    });
});

app.get('/free', (req, res) => {
    res.json({
        message: 'This is a free endpoint',
        data: 'Public content',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'x402-server' });
});

app.listen(port, () => {
    console.log(`X402 Server running on port ${port}`);
    console.log(`Facilitator URL: ${process.env.FACILITATOR_URL}`);
    console.log(`Address: ${process.env.ADDRESS}`);
});
"""

    env_vars = {
        "PORT": str(HTTP_PORT_NUMBER),
        "FACILITATOR_URL": x402_server_params.get("facilitator_url", ""),
        "ADDRESS": x402_server_params.get("address", ""),
    }

    return ServiceConfig(
        image=x402_server_params["image"],
        ports=USED_PORTS,
        public_ports=public_ports,
        cmd=["npm", "start"],
        env_vars=env_vars,
        node_selectors=node_selectors,
    )
