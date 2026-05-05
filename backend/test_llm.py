from app.services.llm_service import query_all_llms

result = query_all_llms(
    "What are the best UPI payment apps in India? Name top 5."
)

for model_name, response in result["responses"].items():
    print(f"\n{'='*50}")
    print(f"🤖 {model_name.upper()}:")
    print(response)