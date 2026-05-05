import spacy
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

nlp = spacy.load("en_core_web_sm")
vader = SentimentIntensityAnalyzer()


def check_entity_mentioned(text: str, brand_name: str) -> bool:
    return brand_name.lower() in text.lower()


def get_mention_position(text: str, brand_name: str) -> str:
    text_lower = text.lower()
    brand_lower = brand_name.lower()
    if brand_lower not in text_lower:
        return "none"
    index = text_lower.find(brand_lower)
    position_ratio = index / len(text)
    if position_ratio < 0.33:
        return "early"
    elif position_ratio < 0.66:
        return "middle"
    else:
        return "late"


def get_sentiment_around_brand(text: str, brand_name: str) -> str:
    doc = nlp(text)
    for sent in doc.sents:
        if brand_name.lower() in sent.text.lower():
            scores = vader.polarity_scores(sent.text)
            compound = scores["compound"]
            if compound >= 0.05:
                return "positive"
            elif compound <= -0.05:
                return "negative"
            else:
                return "neutral"
    return "not_found"


def get_mention_count(text: str, brand_name: str) -> int:
    return text.lower().count(brand_name.lower())


def analyze_response(text: str, brand_name: str) -> dict:
    mentioned = check_entity_mentioned(text, brand_name)
    return {
        "brand": brand_name,
        "mentioned": mentioned,
        "mention_count": get_mention_count(text, brand_name),
        "position": get_mention_position(text, brand_name),
        "sentiment": get_sentiment_around_brand(text, brand_name) if mentioned else "n/a",
    }


def analyze_all_responses(llm_responses: dict, brand_name: str) -> dict:
    results = {}
    for llm_name, response_text in llm_responses.items():
        results[llm_name] = analyze_response(response_text, brand_name)
    return results