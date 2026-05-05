def calculate_single_score(analysis: dict) -> float:
    if not analysis["mentioned"]:
        return 0.0

    score = 0

    # Mention base score
    score += 40

    # Position score
    position_scores = {"early": 25, "middle": 15, "late": 5, "none": 0}
    score += position_scores.get(analysis["position"], 0)

    # Sentiment score
    sentiment_scores = {"positive": 20, "neutral": 10, "negative": 2, "n/a": 0}
    score += sentiment_scores.get(analysis["sentiment"], 0)

    # Frequency score
    mention_count = min(analysis["mention_count"], 3)
    score += (mention_count / 3) * 15

    return round(score, 2)


def get_grade(score: float) -> str:
    if score >= 75: return "A — Strong Presence"
    if score >= 50: return "B — Moderate Presence"
    if score >= 25: return "C — Weak Presence"
    return "D — Nearly Invisible"


def calculate_visibility_report(nlp_results: dict, brand_name: str) -> dict:
    per_llm_scores = {}
    for llm_name, analysis in nlp_results.items():
        per_llm_scores[llm_name] = {
            "score": calculate_single_score(analysis),
            "mentioned": analysis["mentioned"],
            "position": analysis["position"],
            "sentiment": analysis["sentiment"],
            "mention_count": analysis["mention_count"]
        }

    all_scores = [v["score"] for v in per_llm_scores.values()]
    overall_score = round(sum(all_scores) / len(all_scores), 2)

    return {
        "brand": brand_name,
        "overall_score": overall_score,
        "grade": get_grade(overall_score),
        "per_llm": per_llm_scores
    }