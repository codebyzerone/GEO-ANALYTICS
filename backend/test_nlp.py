from app.services.nlp_service import analyze_all_responses

fake_responses = {
    "gemma_precise": "Google Pay and PhonePe are the best UPI apps. Paytm is also popular.",
    "gemma_creative": "Top apps include PhonePe, Google Pay. ZestPay is emerging but not well known."
}

results = analyze_all_responses(fake_responses, brand_name="ZestPay")

for llm, analysis in results.items():
    print(f"\n🤖 {llm.upper()}: {analysis}")