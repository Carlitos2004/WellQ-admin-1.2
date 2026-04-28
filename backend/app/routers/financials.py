from fastapi import APIRouter

router = APIRouter(
    prefix="/api/financials",
    tags=["Financials"]
)

# 12. GET /financials/mrr/breakdown
@router.get("/mrr/breakdown")
def get_mrr_breakdown():
    return {
        "status": "success",
        "data": {
            "total_mrr": 45000,
            "currency": "USD",
            "breakdown": {
                "new_business": 5000,
                "expansion": 2000,
                "contraction": -500,
                "churn": -1000,
                "retained": 39500
            },
            "monthly_growth_percentage": 3.2
        }
    }

# 13. GET /financials/churn-risk/by-region
@router.get("/churn-risk/by-region")
def get_churn_risk_by_region():
    return {
        "status": "success",
        "data": [
            {
                "region": "North America",
                "clinics_at_risk": 3,
                "potential_mrr_loss": 1200,
                "risk_level": "Medium"
            },
            {
                "region": "Europe",
                "clinics_at_risk": 1,
                "potential_mrr_loss": 400,
                "risk_level": "Low"
            },
            {
                "region": "Latin America",
                "clinics_at_risk": 5,
                "potential_mrr_loss": 850,
                "risk_level": "High"
            }
        ]
    }
