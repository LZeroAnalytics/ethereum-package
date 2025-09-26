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

    package_json = {
        "name": "x402-client",
        "version": "1.0.0",
        "type": "module",
        "scripts": {"start": "tsx index.ts"},
        "dependencies": {
            "express": "^4.18.0",
            "tsx": "^4.0.0",
            "typescript": "^5.0.0",
            "dotenv": "^16.0.0",
            "node-fetch": "^3.3.0",
        },
    }

    client_code = """import express from 'express';
import fetch from 'node-fetch';
import { config } from 'dotenv';

config();

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

const makePaymentRequest = async (url, options = {}) => {
    try {
        const facilitatorUrl = process.env.FACILITATOR_URL || 'http://x402-facilitator:3000';
        
        console.log(`Making payment request to: ${url}`);
        console.log(`Using facilitator: ${facilitatorUrl}`);
        
        const paymentToken = `payment-${Date.now()}-${Math.random()}`;
        
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'x-payment': paymentToken,
                'Content-Type': 'application/json',
            },
        });
        
        return response;
    } catch (error) {
        console.error('Payment request failed:', error);
        throw error;
    }
};

app.get('/test-payment', async (req, res) => {
    try {
        const serverUrl = process.env.RESOURCE_SERVER_URL;
        const endpointPath = process.env.ENDPOINT_PATH;
        const fullUrl = `${serverUrl}${endpointPath}`;
        
        console.log(`Testing payment flow to: ${fullUrl}`);
        
        const response = await makePaymentRequest(fullUrl);
        const data = await response.json();
        
        res.json({
            success: true,
            status: response.status,
            data: data,
            url: fullUrl
        });
    } catch (error) {
        console.error('Test payment failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            url: `${process.env.RESOURCE_SERVER_URL}${process.env.ENDPOINT_PATH}`
        });
    }
});

app.get('/test-free', async (req, res) => {
    try {
        const serverUrl = process.env.RESOURCE_SERVER_URL;
        const freeUrl = `${serverUrl}/free`;
        
        console.log(`Testing free endpoint: ${freeUrl}`);
        
        const response = await fetch(freeUrl);
        const data = await response.json();
        
        res.json({
            success: true,
            status: response.status,
            data: data,
            url: freeUrl
        });
    } catch (error) {
        console.error('Free endpoint test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'x402-client',
        config: {
            resource_server_url: process.env.RESOURCE_SERVER_URL,
            endpoint_path: process.env.ENDPOINT_PATH,
            private_key_configured: process.env.PRIVATE_KEY ? 'Yes' : 'No'
        }
    });
});

app.listen(port, () => {
    console.log(`X402 Client running on port ${port}`);
    console.log(`Resource Server URL: ${process.env.RESOURCE_SERVER_URL}`);
    console.log(`Endpoint Path: ${process.env.ENDPOINT_PATH}`);
});
"""

    env_vars = {
        "PORT": str(HTTP_PORT_NUMBER),
        "PRIVATE_KEY": x402_client_params.get("private_key", ""),
        "RESOURCE_SERVER_URL": x402_client_params.get("resource_server_url", ""),
        "ENDPOINT_PATH": x402_client_params.get("endpoint_path", ""),
        "FACILITATOR_URL": "http://x402-facilitator:3000",
    }

    return ServiceConfig(
        image=x402_client_params["image"],
        ports=USED_PORTS,
        public_ports=public_ports,
        cmd=["npm", "start"],
        env_vars=env_vars,
        node_selectors=node_selectors,
    )
