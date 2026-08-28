#!/bin/bash
# 3. Download job results/details
API_URL="${UNSTRUCTURED_API_URL:-https://platform-api.transform.unstructured.io/api/v1}"
API_KEY="${UNSTRUCTURED_API_KEY:-bGwYxlRR0RHdDJUx4hJts00TKOwi3Q}"
JOB_ID="$1"

if [ -z "$JOB_ID" ]; then
  echo "Usage: ./download_results.sh <JOB_ID>"
  exit 1
fi

echo "Fetching details and output for Job ID: $JOB_ID..."

curl -s -X GET "$API_URL/jobs/$JOB_ID/details" \
  -H "unstructured-api-key: $API_KEY"
echo ""
