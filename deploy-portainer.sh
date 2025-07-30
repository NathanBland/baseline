#!/bin/bash

# deploy-portainer.sh - Standalone script for Portainer stack deployment
# This script replaces the inline curl commands in CI/CD workflows

set -euo pipefail

# Configuration
PORTAINER_URL="${PORTAINER_URL:-https://port.aqueous.network}"
PORTAINER_API_KEY="${PORTAINER_API_KEY:-}"
STACK_ID="${1:-}"
ENVIRONMENT="${2:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Validate required environment variables
validate_env() {
    if [[ -z "$PORTAINER_API_KEY" ]]; then
        error "PORTAINER_API_KEY is required but not set"
        exit 1
    fi
    
    if [[ -z "$STACK_ID" ]]; then
        error "STACK_ID is required as first argument"
        exit 1
    fi
    
    log "Environment validated successfully"
    log "Portainer URL: $PORTAINER_URL"
    log "Stack ID: $STACK_ID"
    log "Environment: $ENVIRONMENT"
}

# Check if stack exists
stack_exists() {
    local stack_url="${PORTAINER_URL}/api/stacks/${STACK_ID}"
    local response
    
    response=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "X-API-Key: $PORTAINER_API_KEY" \
        "$stack_url")
    
    if [[ "$response" == "200" ]]; then
        log "Stack $STACK_ID exists"
        return 0
    else
        warning "Stack $STACK_ID not found (HTTP $response)"
        return 1
    fi
}

# Get current stack status
get_stack_status() {
    local stack_url="${PORTAINER_URL}/api/stacks/${STACK_ID}"
    local status
    
    status=$(curl -s \
        -H "X-API-Key: $PORTAINER_API_KEY" \
        "$stack_url" | jq -r '.Status // "unknown"')
    
    log "Current stack status: $status"
    echo "$status"
}

# Helper function to make HTTP request with timeout and timing
make_request() {
    local url="$1"
    local method="${2:-GET}"
    local data="$3"
    local output_file="$4"
    local timeout_seconds=600  # 10 minute timeout for long-running operations
    
    local start_time=$(date +%s)
    local http_code
    
    log "Starting $method request to $url (timeout: ${timeout_seconds}s)"
    
    # Make the request with timeout
    http_code=$(curl -s -o "$output_file" -w "%{http_code}" \
        --max-time $timeout_seconds \
        --connect-timeout 30 \
        -X "$method" \
        -H "X-API-Key: $PORTAINER_API_KEY" \
        -H "Content-Type: application/json" \
        ${data:+-d "$data"} \
        "$url" 2>/dev/null || echo "000")
        
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "Request completed in ${duration}s with status: $http_code"
    
    # Handle timeout specifically
    if [[ "$http_code" == "000" ]]; then
        error "❌ Request timed out after ${duration}s (max ${timeout_seconds}s)"
        return 1
    fi
    
    echo "$http_code"
    return 0
}

# Get stack webhook URL
get_webhook_url() {
    local stack_id="$1"
    local response_file=$(mktemp)
    
    log "Fetching webhook URL for stack $stack_id"
    
    local http_code=$(make_request \
        "${PORTAINER_URL}/api/stacks/${stack_id}/webhooks" \
        "GET" \
        "" \
        "$response_file")
    
    if [[ "$http_code" == "200" ]]; then
        local webhook_url=$(jq -r '.[0].ResourceURL' "$response_file" 2>/dev/null)
        rm -f "$response_file"
        
        if [[ -n "$webhook_url" && "$webhook_url" != "null" ]]; then
            log "Found webhook URL: $webhook_url"
            echo "$webhook_url"
            return 0
        fi
    fi
    
    error "❌ Failed to get webhook URL for stack $stack_id"
    if [[ -f "$response_file" ]]; then
        cat "$response_file" >&2
        rm -f "$response_file"
    fi
    return 1
}

# Redeploy the stack using webhook
redeploy_stack() {
    local endpoint_id="${PORTAINER_ENDPOINT_ID:-1}"
    local webhook_url
    
    # Get the webhook URL for the stack
    webhook_url=$(get_webhook_url "$STACK_ID") || return 1
    
    # Trigger the webhook
    log "Triggering webhook for stack $STACK_ID..."
    log "Webhook URL: $webhook_url"
    
    local response_file=$(mktemp)
    local response_code
    
    # Trigger the webhook with a POST request
    response_code=$(make_request \
        "$webhook_url" \
        "POST" \
        "" \
        "$response_file")
    
    # Process the response
    if [[ "$response_code" == "204" ]]; then
        log "✅ Webhook triggered successfully (HTTP 204)"
        log "Redeployment started. This may take several minutes to complete."
        log "You can check the status in the Portainer UI."
        rm -f "$response_file"
        return 0
    else
        error "❌ Failed to trigger webhook with HTTP $response_code"
        if [[ -f "$response_file" ]]; then
            cat "$response_file" >&2
            rm -f "$response_file"
        fi
        return 1
    fi
}

# Wait for deployment to complete
wait_for_deployment() {
    local max_attempts=30
    local attempt=1
    
    log "Waiting for deployment to complete..."
    
    while [[ $attempt -le $max_attempts ]]; do
        local status
        status=$(get_stack_status)
        
        case "$status" in
            "1")
                log "✅ Deployment completed successfully"
                return 0
                ;;
            "2")
                log "⏳ Deployment in progress... (attempt $attempt/$max_attempts)"
                ;;
            *)
                error "❌ Deployment failed with status: $status"
                return 1
                ;;
        esac
        
        sleep 10
        ((attempt++))
    done
    
    error "❌ Deployment timeout after ${max_attempts} attempts"
    return 1
}

# Main deployment process
main() {
    log "Starting Portainer deployment script..."
    log "Environment: $ENVIRONMENT"
    
    validate_env
    
    if ! stack_exists; then
        error "Stack $STACK_ID does not exist"
        exit 1
    fi
    
    local current_status
    current_status=$(get_stack_status)
    log "Initial stack status: $current_status"
    
    if ! redeploy_stack; then
        error "Failed to initiate redeployment"
        exit 1
    fi
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if wait_for_deployment; then
            log "🎉 Production deployment completed successfully!"
        else
            error "Production deployment failed"
            exit 1
        fi
    else
        log "🎉 Staging deployment initiated successfully!"
    fi
}

# Handle script interruption
trap 'error "Script interrupted"; exit 130' INT TERM

# Run main function
main "$@"
