# ServiceNow Smart Helpdesk

A small ITSM demo built in a ServiceNow Personal Developer Instance (PDI). Users report an
issue through a Service Catalog Record Producer; a Business Rule calls an external ML
classifier over REST to set the Incident category and assignment group, with a keyword
fallback when the API is unavailable.

> Learning project. Built in a free developer instance, not a production system.

## Architecture

```
Service Portal -> Record Producer "Report an Issue"
                        |  creates
                        v
                  Incident (before-insert Business Rule)
                        |  Script Include AITriage
                        v
        REST (RESTMessageV2) -> FastAPI /classify  (TF-IDF + Logistic Regression)
                        |  on failure/timeout
                        v
                  keyword fallback rules
                        |
                        v
          category + assignment group + work note
                        |
                        v
              Flow Designer flow (notification for critical priority)
```

## What is in here

| Part | Where |
|------|-------|
| Classifier API (FastAPI, scikit-learn, Docker, pytest) | `classifier/` |
| Script Include `AITriage` (REST call + fallback) | `servicenow/script_include_AITriage.js` |
| Business Rule on Incident | `servicenow/business_rule_incident_triage.js` |
| Record Producer script | `servicenow/record_producer_script.js` |
| Catalog Client Script (form validation) | `servicenow/catalog_client_script_validate.js` |
| Step-by-step build guide | `SETUP.md` |

ServiceNow concepts exercised: Service Catalog / Record Producer, Incident table, Business
Rules, Script Includes, Catalog Client Scripts, System Properties, outbound REST
(`RESTMessageV2`), Flow Designer, Update Sets.

## Classifier

```
cd classifier
pip install -r requirements-dev.txt
pytest -q
uvicorn main:app --reload
```

`POST /classify {"text": "wifi kantor mati"}` returns `{"category": "network", "confidence": 0.7}`
(example shape; actual values vary). Protected by an optional `X-API-Key` header.

**Limitations:** trained on about 80 hand-written English/Indonesian tickets, not real data.
A held-out check on 10 new sentences scored 9/10, which is too small to mean much. It is a
demo of the integration pattern, not a production triage model.

## Screenshots

_Add screenshots and a short demo GIF here (catalog form, resulting Incident with work notes,
fallback test)._
