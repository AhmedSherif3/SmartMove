# Fetches metadata for SmartMove Platform and Prediction dashboards

class DashboardCatalogTool:
    """
    Provides metadata from existing SmartMove Platform Dashboards
    and Predictions Dashboards. Allows the Dashboard Curator to
    know what existing charts are available to be mixed into a new Hybrid Dashboard.
    """

    @classmethod
    def get_platform_dashboards_metadata(cls) -> list[dict]:
        """
        Returns the catalog of available Platform and Prediction panels.
        In a full implementation, this queries the Dashboard Config DB.
        """
        return [
            {
                "id": "panel_investment_opportunity",
                "source": "SmartMove Platform",
                "title": "Investment Opportunity Heatmap",
                "description": "Shows areas with high ROI potential based on recent transactions."
            },
            {
                "id": "panel_market_risk",
                "source": "SmartMove Platform",
                "title": "Market Risk & Anomaly Detection",
                "description": "Highlights areas with unusual price drops or abnormal transaction volumes."
            },
            {
                "id": "panel_prophet_price_forecast",
                "source": "Predictions Dashboard",
                "title": "Prophet ML Price Forecast",
                "description": "Projects property prices by region over the next 12-24 months."
            },
            {
                "id": "panel_prophet_rent_forecast",
                "source": "Predictions Dashboard",
                "title": "Prophet ML Rent Forecast",
                "description": "Projects rental yields by region over the next 12-24 months."
            }
        ]

    @classmethod
    def fetch_panel_data(cls, panel_id: str) -> dict:
        """
        Simulates fetching the actual JSON data for a specific panel.
        Includes Graceful Degradation if a panel is missing.
        """
        valid_panels = [p["id"] for p in cls.get_platform_dashboards_metadata()]
        
        if panel_id not in valid_panels:
            return {"error": "Panel not found or corrupted. Proceeding without this panel."}
            
        # Simulated data payload
        return {
            "component": "BarChart",
            "title": f"Platform Data: {panel_id}",
            "data": [
                {"label": "Q1", "value": 100},
                {"label": "Q2", "value": 150},
                {"label": "Q3", "value": 120}
            ]
        }
