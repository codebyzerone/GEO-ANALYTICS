from app.services.llm_service import query_all_llms
from app.services.nlp_service import analyze_all_responses
from app.services.scoring_service import calculate_visibility_report
import json

brand = "PhonePe"
query = "What are the best payment apps in India?"

llm_results = query_all_llms(query)
nlp_results = analyze_all_responses(llm_results["responses"], brand)
report = calculate_visibility_report(nlp_results, brand)

print(json.dumps(report, indent=2))