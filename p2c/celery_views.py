import logging

from celery.result import AsyncResult
from celery_progress.backend import Progress
from django.http import JsonResponse
from django.views.generic import View

logger = logging.getLogger(__name__)


class ProgressView(View):
    def get(self, request, task_id):
        try:
            result = AsyncResult(task_id)
            logger.info(f"Task {task_id} state: {result.state}")

            if result.state == "PENDING":
                response = {
                    "complete": False,
                    "success": None,
                    "progress": {
                        "current": 0,
                        "total": 100,
                        "percent": 0,
                        "description": "Task pending...",
                    },
                }
            elif result.state == "PROGRESS":
                response = {"complete": False, "success": None, "progress": result.info}
            elif result.state == "SUCCESS":
                res = result.get()
                # If the result is a string (e.g. from return "No events found to delete")
                if isinstance(res, str):
                    result_msg = res
                elif isinstance(res, dict):
                    result_msg = res.get("description", res.get("message", "Task completed successfully"))
                else:
                    result_msg = "Task completed successfully"

                response = {
                    "complete": True,
                    "success": True,
                    "progress": res,
                    "result": result_msg,
                }
            else:  # FAILURE, REVOKED, etc.
                error_msg = (
                    str(result.result) if result.result else "Unknown error occurred"
                )
                logger.error(f"Task {task_id} failed: {error_msg}")
                response = {"complete": True, "success": False, "error": error_msg}

            logger.info(f"Response for task {task_id}: {response}")
            return JsonResponse(response)

        except Exception as e:
            logger.error(f"Error getting task status for {task_id}: {str(e)}")
            return JsonResponse({"complete": True, "success": False, "error": str(e)})
