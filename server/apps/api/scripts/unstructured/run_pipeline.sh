#!/bin/bash
# 4. Combined script performing create job, poll status, and download results
API_URL="${UNSTRUCTURED_API_URL:-https://platform-api.transform.unstructured.io/api/v1}"
API_KEY="${UNSTRUCTURED_API_KEY:-bGwYxlRR0RHdDJUx4hJts00TKOwi3Q}"
FILE_PATH="${1:-sample_test.txt}"

echo "=== Step 1: Creating Job ==="
RESPONSE=$(curl -s -X POST "$API_URL/jobs/" \
  -H "unstructured-api-key: $API_KEY" \
  -F 'request_data={"job_nodes":[{"name":"Partitioner","type":"partition","subtype":"vlm"}]}' \
  -F "files=@$FILE_PATH")

JOB_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
  echo "Error creating job: $RESPONSE"
  exit 1
fi

echo "Created Job ID: $JOB_ID"

echo "=== Step 2: Polling Job Status ==="
while true; do
  STATUS_RESPONSE=$(curl -s -X GET "$API_URL/jobs/$JOB_ID" -H "unstructured-api-key: $API_KEY")
  STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
  echo "Job status: $STATUS"

  if [ "$STATUS" = "COMPLETED" ]; then
    echo "Job Completed Successfully!"
    break
  elif [ "$STATUS" = "FAILED" ]; then
    echo "Job Failed!"
    exit 1
  fi
  sleep 2
done

echo "=== Step 3: Fetching Results ==="
curl -s -X GET "$API_URL/jobs/$JOB_ID/details" -H "unstructured-api-key: $API_KEY"
echo ""
