import pytest
from p2c.tasks import create_events_task, delete_events_task
from unittest.mock import MagicMock

class TestTasks:
    def test_create_events_task(self, mock_google_calendar_service):
        calendar_id = "test_calendar_id"
        credentials = {"token": "fake", "refresh_token": "fake"}
        appointments = [
            {
                "summary": "Test Event",
                "start_time": "2024-01-01T08:00:00",
                "end_time": "2024-01-01T10:00:00",
                "colorId": "1",
                "description": "Test Description",
                "location": "Test Location"
            }
        ]
        
        result = create_events_task(calendar_id, credentials, appointments)
        
        assert result["status"] == "success"
        assert result["created_count"] == 1
        
        # Verify Google API calls
        mock_google_calendar_service.events.return_value.insert.assert_called_once()
        call_args = mock_google_calendar_service.events.return_value.insert.call_args
        assert call_args[1]["calendarId"] == calendar_id
        assert call_args[1]["body"]["summary"] == "Test Event"

    def test_delete_events_task(self, mock_google_calendar_service, mocker):
        # Mock ProgressRecorder
        mocker.patch("p2c.tasks.ProgressRecorder")
        
        # Mock Redis lock
        mock_redis = MagicMock()
        mock_lock = MagicMock()
        mock_lock.acquire.return_value = True
        mock_redis.lock.return_value = mock_lock
        mocker.patch("p2c.tasks.get_redis_connection", return_value=mock_redis)
        
        # Mock events list response
        mock_google_calendar_service.events.return_value.list.return_value.execute.return_value = {
            "items": [{"id": "event1", "description": "Delete me"}]
        }
        
        calendar_id = "test_calendar_id"
        credentials = {"token": "fake"}
        
        result = delete_events_task(calendar_id, credentials, 1, 2024)
        
        assert "Successfully processed 1 events" in result
        
        # Verify delete called
        mock_google_calendar_service.events.return_value.delete.assert_called_once_with(
            calendarId=calendar_id, eventId="event1"
        )

    def test_delete_events_task_skip_keep(self, mock_google_calendar_service, mocker):
        # Mock ProgressRecorder
        mocker.patch("p2c.tasks.ProgressRecorder")

        mock_redis = MagicMock()
        mock_lock = MagicMock()
        mock_lock.acquire.return_value = True
        mock_redis.lock.return_value = mock_lock
        mocker.patch("p2c.tasks.get_redis_connection", return_value=mock_redis)
        
        # Event with keep tag
        mock_google_calendar_service.events.return_value.list.return_value.execute.return_value = {
            "items": [{"id": "event1", "description": "Important <keep>"}]
        }
        
        result = delete_events_task("cal_id", {"token": "fake"}, 1, 2024)
        
        assert "skipped: 1" in result
        mock_google_calendar_service.events.return_value.delete.assert_not_called()
