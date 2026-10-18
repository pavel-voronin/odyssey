# Verification scripts

Build, deploy, tests and simulation use the current exact save schema. Historical stage-specific verification entry points now fail explicitly; their exact pre-retirement source and checksums are retained under artifacts/schema-144/historical-scripts/index.json. Published reports are unchanged. Converted current save-writing audits write under artifacts/current to avoid overwriting historical proof. The live life-causal study uses its current schema-bound worker and an isolated artifacts/current/life-causal namespace; its reusable auditWindow remains covered by tests.
