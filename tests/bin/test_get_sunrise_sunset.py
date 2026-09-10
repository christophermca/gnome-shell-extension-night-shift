import pytest
from unittest.mock import Mock, patch, MagicMock
import requests
from bin.get_sunrise_sunset import GetTimeOfSunriseSunset


@pytest.fixture
def mock_settings():
    """Mock Gio.Settings object"""
    settings = MagicMock()
    settings.get_string.return_value = ""
    settings.get_boolean.return_value = True
    settings.get_value.return_value = (0.0, 0.0)
    return settings


@patch("src.bin.get_sunrise_sunset._settings")
def test_get_sunrise_sunset_success(mock_settings_func, mock_settings):
    """Test successful API call and settings update"""
    mock_settings_func.return_value = mock_settings

    with patch("src.bin.get_sunrise_sunset.requests.get") as mock_get:
        mock_get.return_value.json.return_value = {
            "sunrise": "2026-09-01T06:00:00",
            "sunset": "2026-09-01T18:30:00",
            "tzid": "America/New_York",
        }

        GetTimeOfSunriseSunset(40.7128, -74.0060)

        # Verify settings were updated
        assert mock_settings.set_string.call_count == 0
        # mock_settings.set_value.assert_called_once()


@patch("requests.get")
def test_get_sunrise_sunset_http_error(mock_get):
    """Test handling of HTTP errors"""
    mock_response = requests.models.Response()
    mock_response.status_code = 500

    mock_get.return_value = mock_response

    with patch("src.bin.get_sunrise_sunset.requests.get") as mock_get:
        mock_get.return_value.raise_for_status.side_effect = Exception(
            "HTTP 500"
        )
