-- Allow multiple property types per home request (store as JSON array).
ALTER TABLE "upward_home_request"
  ALTER COLUMN "propertyType" TYPE JSONB
  USING CASE
    WHEN "propertyType" IS NULL OR btrim("propertyType") = '' THEN '[]'::jsonb
    WHEN left(btrim("propertyType"), 1) = '[' THEN "propertyType"::jsonb
    ELSE jsonb_build_array("propertyType")
  END;
