from typing import TypedDict, List, Optional

class VoiceChatState(TypedDict, total=False):
    language: str
    user_token: str
    user_input: str
    lat: float
    lon: float
    jobs_list: List[str]
    skills_list: List[str]
    weather_condition: str
    traffic_condition: str
    current_step: str
    mood: Optional[str]
    sentiment_score: Optional[float]
    selected_platform: Optional[str]
    expected_earnings: Optional[str]
    hours_worked: Optional[str]
    final_summary: Optional[str]
