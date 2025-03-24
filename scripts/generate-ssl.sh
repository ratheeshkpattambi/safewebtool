#!/bin/bash

# Create scripts directory if it doesn't exist
mkdir -p ssl

# Generate SSL certificate and private key
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Development/CN=localhost"

echo "SSL certificates generated in ssl/ directory"
echo "Note: These certificates are for development only. Do not use in production." 