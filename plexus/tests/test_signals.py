from django.test import TestCase
from unittest.mock import patch
from plexus.models import Input

class InputSignalTest(TestCase):
    @patch("core.tasks.process_input.delay")
    def test_input_post_save_triggers_task(self, mock_task_delay):
        # Create Input
        input_obj = Input.objects.create(content="signal test", source="web")
        
        # Verify task was called with delay (asynchronously)
        mock_task_delay.assert_called_once_with(input_obj.id)

    @patch("core.tasks.process_input.delay")
    def test_input_update_does_not_retrigger_task(self, mock_task_delay):
        # Create Input
        input_obj = Input.objects.create(content="initial", source="web")
        mock_task_delay.reset_mock()
        
        # Update Input
        input_obj.processed = True
        input_obj.save()
        
        # Verify task was NOT called again
        mock_task_delay.assert_not_called()
