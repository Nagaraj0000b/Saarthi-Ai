import pytest
from fastapi.testclient import TestClient
from ml_engine.main import app, load_artifacts

# Create a test client that can talk to our API directly
client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def startup_event():
    """Ensure the model and encoders are loaded before any tests run."""
    load_artifacts()

# Standard user data template for all tests
USER_PAYLOAD = {
    "hour": 10,
    "day": 1,
    "weather": "Clear",
    "temp": 25.0,
    "traffic": "clear",
    "congestion_percent": 10,
    "hours_today": 0.0,
    "hours_last_3_days": 0.0,
    "consecutive_days": 0,
    "mood_score": 0.5,
    "burnout_risk": "Low",
    "skill_bike": 0,
    "skill_car": 0,
    "registered_jobs": []
}

def test_health_endpoint():
    """Verify that the health check works and returns a valid accuracy score."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "model_accuracy" in data

def test_registration_filtering():
    """Verify that only jobs specified in registered_jobs are returned."""
    payload = USER_PAYLOAD.copy()
    payload["skill_bike"] = 1
    payload["registered_jobs"] = ["Swiggy", "Zomato"]
    
    response = client.post("/recommend", json=payload)
    if response.status_code != 200:
        print(response.json())
    assert response.status_code == 200
    results = response.json()
    
    # Check that we ONLY got Swiggy or Zomato
    returned_jobs = [r["job"] for r in results]
    for job in returned_jobs:
        assert job in ["Swiggy", "Zomato"]

def test_skill_compatibility():
    """Verify that jobs requiring skills the user lacks are filtered out."""
    payload = USER_PAYLOAD.copy()
    payload["skill_bike"] = 0  # No bike skills
    payload["skill_car"] = 0   # No car skills
    payload["skill_digital"] = 1 # Only digital skills
    payload["registered_jobs"] = ["Swiggy", "DataEntry Inc"]
    
    response = client.post("/recommend", json=payload)
    if response.status_code != 200:
        print(response.json())
    assert response.status_code == 200
    results = response.json()
    
    # Swiggy requires a bike; DataEntry requires digital.
    # User only has digital, so only DataEntry should be returned.
    returned_jobs = [r["job"] for r in results]
    assert "DataEntry Inc" in returned_jobs
    assert "Swiggy" not in returned_jobs

def test_sorting_by_earnings():
    """Verify that recommendations are sorted with highest earnings first."""
    payload = USER_PAYLOAD.copy()
    payload["skill_bike"] = 1
    payload["registered_jobs"] = ["Swiggy", "Zomato", "Blinkit"]
    
    response = client.post("/recommend", json=payload)
    if response.status_code != 200:
        print(response.json())
    assert response.status_code == 200
    results = response.json()
    
    # Ensure each earning is less than or equal to the previous one
    earnings = [r["predicted_earning"] for r in results]
    assert earnings == sorted(earnings, reverse=True)

def test_invalid_data_rejection():
    """Verify that the API rejects requests with missing required data."""
    payload = {"hour": 10} # Missing most fields
    response = client.post("/recommend", json=payload)
    assert response.status_code == 422 # 422 is Unprocessable Entity (Validation Error)
