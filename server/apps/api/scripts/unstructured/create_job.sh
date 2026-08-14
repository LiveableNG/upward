#!/bin/bash
# 1. Create a single job containing all source files
API_URL="${UNSTRUCTURED_API_URL:-https://platform-api.transform.unstructured.io/api/v1}"
API_KEY="${UNSTRUCTURED_API_KEY:-bGwYxlRR0RHdDJUx4hJts00TKOwi3Q}"
FILE_PATH="${1:-sample_test.txt}"

echo "Creating job for $FILE_PATH..."

RESPONSE=$(curl -s -X POST "$API_URL/jobs/" \
  -H "unstructured-api-key: $API_KEY" \
  -F 'request_data={"job_nodes":[{"name":"Partitioner","type":"partition","subtype":"vlm"}]}' \
  -F "files=@$FILE_PATH")

echo "Response: $RESPONSE"
JOB_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Created Job ID: $JOB_ID"
