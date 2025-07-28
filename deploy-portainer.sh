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

# Redeploy the stack
redeploy_stack() {
    local stack_url="${PORTAINER_URL}/api/stacks/${STACK_ID}/git/redeploy"
    local payload='{"prune": true, "pullImage": true}'
    local response
    
    log "Initiating redeployment for stack $STACK_ID..."
    
    response=$(curl -s -w "%{http_code}" -o response.json \
        -X PUT \
        -H "X-API-Key: $PORTAINER_API_KEY" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "$stack_url")
    
    if [[ "$response" == "200" ]]; then
        log "✅ Redeployment initiated successfully"
        rm -f response.json
        return 0
    elif [[ "$response" == "405" ]]; then
        error "❌ HTTP 405 Method Not Allowed - check stack configuration"
        cat response.json >&2
        rm -f response.json
        return 1
    else
        error "❌ Redeployment failed (HTTP $response)"
        cat response.json >&2
        rm -f response.json
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
